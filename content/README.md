# Course content

Courses can be written as files and seeded automatically. Every deploy runs the seeders, which insert any `content/courses/*.json` file whose `slug` isn't in the database yet. Courses that already exist are never overwritten, so edits made in the admin area are safe.

```
content/
  outlines/TEMPLATE.md      ← curriculum outline template (copy this)
  outlines/<course>.md      ← your outline: front matter + pasted curriculum
  courses/<slug>.json       ← seedable course (generated, then filled in)
  course.schema.json        ← JSON Schema: autocomplete + validation in VS Code
```

## Workflow

**1. Outline.** Copy `outlines/TEMPLATE.md`, fill in the front matter, and paste the curriculum underneath.

```yaml
---
title: Real Analysis
slug: real-analysis              # optional; derived from title
tagline: …
category: Mathematics
icon: 🧮
color: "#0b7fd6"
est_minutes: 20                  # default length per module
exam_minutes: 60
exam_questions: 25
pass_mark: 65
beginner: 1-2                    # which curriculum levels map to which difficulty
intermediate: 3-5                #   (default: split into thirds)
advanced: 6-8
published: false                 # keep drafts hidden until written
---
```

The converter recognises the following lines. Markdown headings, `**bold**` and `| table |` rows are also fine.

| Line | Becomes |
|---|---|
| `Level 3: Sequences and Limits` (also `Unit`, `Part`, `Section`) | a **section** |
| `Objective: …` | section objective |
| `3.4  The epsilon-N definition…` | a **concept**, slug `3-4-the-epsilon-n-definition-of-convergence` |
| `Expected competencies:` followed by `- …` lines | section competencies |
| `Assessment: …` | section assessment note |

**2. Convert.**

```bash
npm run course:convert -- content/outlines/real-analysis.md
```

This writes `content/courses/real-analysis.json`. Each module is scaffolded with a `TODO` lesson block. The first module of each level also gets a callout with the level's objective and competencies. The command refuses to overwrite an existing file unless you pass `--force`, because that file may already hold written lessons.

**3. Write the content.** Fill in the JSON file: replace the `TODO` blocks, add `blocks` and `questions`. The `$schema` line gives you autocomplete in VS Code. Alternatively, seed the scaffold now and write in the admin block editor instead. Either way works, but pick one: once a course is seeded, the file is no longer read for it.

**4. Check and load it.**

```bash
npm run course:validate                    # all files; reports TODOs and concepts without questions
npm run db:seed                            # insert any new course (what deploys do)
npm run course:import -- content/courses/real-analysis.json --replace   # local only: reload after editing the file
```

`--replace` deletes and re-creates the course, including its students' enrollments, progress and attempts. It refuses to run when `NODE_ENV=production`.

## File format

```jsonc
{
  "$schema": "../course.schema.json",
  "course": { "slug": "real-analysis", "title": "Real Analysis", "tagline": "…", "description": "markdown", "category": "Mathematics", "icon": "🧮", "color": "#0b7fd6", "published": false },
  "exam": { "duration_minutes": 60, "question_count": 25, "pass_mark": 65, "max_attempts": 0, "cooldown_minutes": 0, "shuffle_options": true, "show_review": true, "include_lower_levels": true },
  "sections": [
    {
      "title": "Level 3: Sequences and Limits",
      "level": "intermediate",                 // default difficulty for its concepts
      "objective": "…",
      "competencies": ["…"],
      "assessment": "…",
      "concepts": [ /* see below */ ]
    }
  ],
  "questions": [ /* optional exam-only questions; add "concept": "<slug>" to link one */ ]
}
```

A course without sections can use a top-level `"concepts": [...]` instead of `"sections"`.

### A finished concept

```json
{
  "slug": "3-4-the-epsilon-n-definition-of-convergence",
  "title": "The epsilon-N definition of convergence",
  "summary": "Making \"gets arbitrarily close\" precise.",
  "est_minutes": 25,
  "blocks": [
    { "type": "text", "md": "## Definition\nA sequence $(a_n)$ **converges** to $L$ if\n\n$$\\forall \\varepsilon > 0\\ \\exists N \\in \\mathbb{N}\\ \\forall n \\ge N:\\ |a_n - L| < \\varepsilon.$$" },
    { "type": "steps", "title": "Proving 1/n → 0", "steps": [
      { "title": "Fix ε", "md": "Let ε > 0 be arbitrary." },
      { "title": "Choose N", "md": "By the Archimedean property pick N > 1/ε." },
      { "title": "Verify", "md": "For n ≥ N: |1/n − 0| = 1/n ≤ 1/N < ε. ∎" }
    ] },
    { "type": "example", "title": "Try it", "problem": "Prove (2n+1)/n → 2.", "solution": "|(2n+1)/n − 2| = 1/n. Given ε, choose N > 1/ε." },
    { "type": "check", "question": "In the definition, N may depend on…", "options": ["ε", "n", "nothing"], "correct": 0 }
  ],
  "questions": [
    { "prompt": "Which sequence converges?", "options": ["(−1)ⁿ", "1/n", "n²"], "answer": [1], "explanation": "1/n → 0; the others oscillate or diverge." },
    { "type": "true_false", "prompt": "Every convergent sequence is bounded.", "answer": [true] },
    { "type": "multiple", "prompt": "Which are needed to prove aₙ → L?", "options": ["An arbitrary ε > 0", "An N depending on ε", "A formula for the n-th term", "A single fixed ε"], "answer": [0, 1, 2] },
    { "type": "short", "prompt": "The limit of 1/n is…", "answer": ["0", "zero"], "level": "beginner" }
  ]
}
```

**Blocks:** `text`, `callout`, `code`, `example`, `image`, `video`, `diagram`, `flashcards`, `steps`, `reveal`, `order`, `match`, `check`. See `course.schema.json` for each block's fields.

**Questions**
- `type` is `single` (the default), `multiple`, `true_false` or `short`.
- `answer` depends on the type:
  - `single` / `multiple`: option indexes, counting from 0
  - `true_false`: `[true]` or `[false]`
  - `short`: the accepted strings, matched without regard to case
- `level` defaults to the concept's level.
- Questions are used in both practice and exams unless you set `in_practice: false` or `in_exam: false`.
- Exams draw from every question in the course at the chosen level, so make sure each level has at least `exam.question_count` questions.

### Maths (KaTeX)

Write `$…$` for inline maths and `$$…$$` for display maths. Display maths can be inline or on its own line(s). Maths renders in every text field: lessons, callouts, steps, flashcards, questions, options and explanations. It does not render in `code` blocks.

- **Escape backslashes in JSON.** Write `"\\frac{1}{n}"`, not `"\frac{1}{n}"`. A single backslash before `f`, `b`, `n`, `r` or `t` is a JSON escape: `\frac` silently becomes a form feed followed by "rac". The `drafts.mjs check` command catches this.
- **Plain prices stay plain.** Dollar amounts like `$1,600 and $960` are left alone, because a closing `$` must not be followed by a digit. Write `\\$` for a literal dollar sign next to maths.
- **KaTeX only.** There's no `\newcommand`; `\begin{aligned}` inside `$$` works.

The renderer also supports `**bold**`, `_italic_`, `` `code` ``, lists, headings and fenced code. It has no tables.
