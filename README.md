# prepare.me

An interactive learning platform. Students enroll in a course at one of three levels, work through interactive concepts, answer practice Q&A after each concept, and sit timed exams built from random questions. Admins manage courses, concept content and the question bank.

**Stack:** Next.js 16 (React 19 UI + API routes) · MySQL via Knex · JWT cookie auth (jose + bcrypt) · Zod validation · deployed on Vercel.

## Features

**Students**
- Course catalog, with enrollment at **Beginner / Intermediate / Advanced**. Each level includes all concepts from the levels below it, and students can switch levels at any time.
- A **progress bar and ring** on every course, plus per-concept completion tracking.
- Interactive concept blocks: rich text, callouts, highlighted code with copy, **animated flow diagrams**, **flip flashcards**, **step-through walkthroughs**, **drag-to-order drills**, **match-the-pairs**, quick checks, worked examples with hidden solutions, Q&A accordions, images and video.
- **Practice Q&A** on every concept. Answers are checked on the server, with instant feedback and explanations.
- **Timed exams**:
  - random questions drawn from the bank at the chosen level
  - stable shuffled options
  - a live countdown, corrected for clock skew
  - autosave on every answer and auto-submit at zero
  - flag-for-review, a question palette and keyboard shortcuts
  - resume after a refresh
- **Scoring for every attempt**: a results page with confetti on a pass, a per-concept breakdown, an answer review, a score-trend chart and the full attempt history.

**Admins** (`/admin`)
- A live dashboard that polls every 5 seconds: exams in progress, attempts in the last 24 hours, average score, recent activity.
- Course CRUD: icon, colour, category, publish/draft.
- Concept manager with drag-to-reorder, and a **block editor with a live preview** (split, edit or preview view, ⌘S to save).
- Per-course **exam settings**:
  - time limit, questions per attempt and pass mark
  - max attempts and cooldown between attempts
  - option shuffling and lower-level top-up
  - whether to show answer review
- **Question bank**:
  - filter by course, concept, level and type, plus search
  - editor with a live student preview
  - 4 question types (single, multiple, true/false, short answer)
  - **bulk JSON import**
- Students list with progress and score stats; promote, demote or deactivate users.

## Local development

```bash
cp .env.example .env          # already done if .env exists
npm install
npm run db:up                 # MySQL 8.4 in Docker on port 3308
npm run migrate -- --seed     # schema + admin + 2 sample courses
npm run dev                   # http://localhost:3000
```

Demo accounts (local only):

| Role    | Email                | Password   |
|---------|----------------------|------------|
| Admin   | admin@prepare.me     | password   |
| Student | student@prepare.me   | password   |

Useful commands: `npm run migrate:status`, `npm run migrate:fresh -- --seed` (resets the database), `npm run make:migration add_something`, `npm run typecheck`.

## Adding courses from a curriculum

Paste an outline into `content/outlines/`, convert it with `npm run course:convert -- content/outlines/<file>.md`, fill in lessons and questions, and it seeds on the next deploy. Later changes to the file sync on each deploy, and student progress is kept. See [content/README.md](content/README.md). `content/courses/real-analysis.json` (8 levels, 105 modules) was generated this way and is seeded as a draft.

## Deploying to Vercel

1. Create a MySQL database (PlanetScale, Aiven, AWS RDS, etc.).
2. In the Vercel project, set these environment variables:
   - `DATABASE_URL`: `mysql://user:pass@host:3306/db?ssl=true` (URL-encode the user and password)
   - `JWT_SECRET`: at least 32 characters (`openssl rand -base64 48`)
   - `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`: the first admin account
3. Deploy. `vercel.json` runs `npm run vercel-build`, which runs migrations and the idempotent seeders, then `next build`. Preview deployments skip migrations unless `MIGRATE_ON_PREVIEW=true`.

In production, the seeder creates only the admin account and the sample courses. It does not create the demo student. The sample courses are inserted only when their slug doesn't already exist, so they can be edited or deleted freely.

## Project layout

```
app/(site)/          student pages: landing, catalog, course, learn, exam setup, results
app/exam/[id]/       focused full-screen exam runner
app/admin/           admin area
app/api/             JSON API (auth, enrollment, practice, attempts, admin/*)
components/          Blocks (interactive content), ExamRunner, PracticeQA, admin editors
lib/                 db, auth, learning (data access + exam engine), grading, schemas, types
database/            knex config, migrations, seeds
scripts/artisan.mjs  migration CLI
```

## Notes

- **Real-time:** Vercel functions can't hold WebSockets, so live behaviour comes from client-side timers, debounced autosave and polling (admin dashboard). To push updates instead of polling, add a hosted channel service (Pusher, Ably or Supabase Realtime) and publish from the attempt routes.
- **Exam integrity:** correct answers never reach the browser before submission. Grading happens on the server. Answers sent more than 30 seconds after the deadline are ignored, and the last autosave is graded instead. Expired attempts are finalised automatically the next time they are loaded.
- **Content format:** concept blocks are stored as JSON (see the `Block` type in `lib/types.ts`). Adding a new block type means updating three places: the type, its renderer in `components/Blocks.tsx`, and its fields in `components/admin/ConceptEditor.tsx`.
