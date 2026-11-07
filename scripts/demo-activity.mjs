#!/usr/bin/env node
// LOCAL DEVELOPMENT ONLY: fills the database with demo students and 30 days of activity,
// so the admin analytics have something to show.
//   node scripts/demo-activity.mjs          create (or recreate) the demo data
//   node scripts/demo-activity.mjs --clean  remove every demo student and their data
// Demo students use emails ending in @demo.prepare.me and are deleted (with all their data) by --clean.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import knexFactory from 'knex'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'))
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  console.error('Refusing to create demo data in production.')
  process.exit(1)
}
const { knexConfig } = await import('../database/config.mjs')
const knex = knexFactory(knexConfig())
const DOMAIN = '@demo.prepare.me'
const DAY = 86_400_000

// Deterministic randomness so reruns look the same.
let seed = 42
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rand() * a.length)]
const LEVELS = ['beginner', 'intermediate', 'advanced']
const upTo = (l) => LEVELS.slice(0, LEVELS.indexOf(l) + 1)

async function clean() {
  const n = await knex('users').where('email', 'like', `%${DOMAIN}`).delete() // cascades to all their data
  console.log(`Removed ${n} demo students and their activity.`)
}

const NAMES = ['Amaka Obi', 'Tunde Bakare', 'Zainab Bello', 'Chidi Okafor', 'Ngozi Eze', 'Femi Adeyemi', 'Aisha Musa', 'Kelechi Nwosu',
  'Bisi Lawal', 'Emeka Uche', 'Halima Sani', 'Yemi Ogun', 'Ifeoma Ike', 'Segun Ade']

async function create() {
  await clean()
  const courses = await knex('courses').select('id', 'slug')
  if (!courses.length) throw new Error('No courses found. Run the seeders first.')
  const hash = await bcrypt.hash('password', 10)
  const now = Date.now()
  const conceptsByCourse = new Map()
  const questionsByCourse = new Map()
  for (const c of courses) {
    conceptsByCourse.set(c.id, await knex('concepts').where({ course_id: c.id }).orderBy('position').select('id', 'level'))
    questionsByCourse.set(c.id, await knex('questions').where({ course_id: c.id }).select('id', 'type', 'level', 'options', 'answer', 'concept_id', 'in_exam', 'in_practice'))
  }

  for (const [i, name] of NAMES.entries()) {
    const engagement = 0.25 + rand() * 0.75 // how keen this student is
    const joined = now - (12 + Math.floor(rand() * 18)) * DAY
    const [userId] = await knex('users').insert({ name, email: `${name.split(' ')[0].toLowerCase()}${i}${DOMAIN}`, password_hash: hash, role: 'student', created_at: new Date(joined), updated_at: new Date(joined) })
    const ev = [{ user_id: userId, type: 'register', created_at: new Date(joined) }]
    const usage = new Map()
    const myCourses = courses.filter(() => rand() < 0.55)
    if (!myCourses.length) myCourses.push(pick(courses))

    for (const c of myCourses) {
      const level = pick(LEVELS)
      const enrolledAt = joined + rand() * 2 * DAY
      await knex('enrollments').insert({ user_id: userId, course_id: c.id, level, enrolled_at: new Date(enrolledAt), last_activity_at: new Date(now - rand() * 3 * DAY) })
      ev.push({ user_id: userId, course_id: c.id, type: 'enroll', meta: JSON.stringify({ level }), created_at: new Date(enrolledAt) })
      const eligible = conceptsByCourse.get(c.id).filter((k) => upTo(level).includes(k.level))
      // Progress decays along the course: most finish the start, fewer reach the end.
      const reach = Math.floor(eligible.length * Math.min(1, engagement * (0.4 + rand() * 0.9)))
      let t = enrolledAt
      for (const [j, k] of eligible.entries()) {
        if (j >= reach + (rand() < 0.5 ? 1 : 0)) break
        t = t + (0.2 + rand() * 1.6) * DAY / Math.max(1, engagement * 3)
        if (t > now - 2 * 3_600_000) break // hasn't got this far yet
        const completed = j < reach
        await knex('concept_progress').insert({ user_id: userId, concept_id: k.id, viewed_at: new Date(t), completed_at: completed ? new Date(t + 20 * 60_000) : null })
        ev.push({ user_id: userId, course_id: c.id, concept_id: k.id, type: 'view_concept', created_at: new Date(t) })
        const dayKey = new Date(t).toISOString().slice(0, 10)
        usage.set(`${c.id}|${dayKey}`, (usage.get(`${c.id}|${dayKey}`) ?? 0) + Math.round((8 + rand() * 22) * 60))
        // Practice answers; accuracy rises with engagement, harder lessons are harder.
        const qs = questionsByCourse.get(c.id).filter((q) => q.concept_id === k.id && q.in_practice)
        for (const q of qs.slice(0, completed ? qs.length : 2)) {
          const p = engagement * 0.55 + 0.35 - LEVELS.indexOf(q.level) * 0.08 - (q.type === 'multiple' ? 0.15 : 0)
          ev.push({ user_id: userId, course_id: c.id, concept_id: k.id, type: 'practice_answer', meta: JSON.stringify({ questionId: q.id, correct: rand() < p }), created_at: new Date(t + 15 * 60_000) })
        }
        if (completed) ev.push({ user_id: userId, course_id: c.id, concept_id: k.id, type: 'complete_concept', created_at: new Date(t + 20 * 60_000) })
      }
      // Exam attempts for students who got far enough.
      const settings = await knex('exam_settings').where({ course_id: c.id }).first()
      const attempts = reach > eligible.length * 0.5 ? 1 + Math.floor(rand() * 3) : 0
      for (let a = 0; a < attempts; a++) {
        const pool = questionsByCourse.get(c.id).filter((q) => q.in_exam && upTo(level).includes(q.level))
        const chosen = [...pool].sort(() => rand() - 0.5).slice(0, settings?.question_count ?? 10)
        if (!chosen.length) continue
        const answers = {}
        let score = 0
        for (const q of chosen) {
          const right = JSON.parse(q.answer)
          const ok = rand() < engagement * 0.5 + 0.3 + a * 0.06
          if (ok) { answers[q.id] = right; score++ } else {
            const opts = JSON.parse(q.options || '[]').map((o) => o.id).filter((o) => !right.includes(o))
            answers[q.id] = q.type === 'short' ? ['?'] : opts.length ? [pick(opts)] : []
          }
        }
        const started = t + (a + 1) * DAY * (0.5 + rand())
        if (started > now - 3_600_000) break
        const percent = Math.round((score / chosen.length) * 10000) / 100
        const passMark = settings?.pass_mark ?? 70
        const [attemptId] = await knex('exam_attempts').insert({
          user_id: userId, course_id: c.id, level, duration_minutes: settings?.duration_minutes ?? 20, pass_mark: passMark,
          started_at: new Date(started), expires_at: new Date(started + 60 * 60_000), submitted_at: new Date(started + (10 + rand() * 30) * 60_000),
          question_ids: JSON.stringify(chosen.map((q) => q.id)), answers: JSON.stringify(answers), score, total: chosen.length, percent, passed: percent >= passMark,
        })
        ev.push({ user_id: userId, course_id: c.id, type: 'exam_start', meta: JSON.stringify({ attemptId, level }), created_at: new Date(started) })
        ev.push({ user_id: userId, course_id: c.id, type: 'exam_submit', meta: JSON.stringify({ attemptId, percent, passed: percent >= passMark }), created_at: new Date(started + 25 * 60_000) })
        const dayKey = new Date(started).toISOString().slice(0, 10)
        usage.set(`${c.id}|${dayKey}`, (usage.get(`${c.id}|${dayKey}`) ?? 0) + 25 * 60)
      }
    }
    // A few logins on active days.
    for (const key of usage.keys()) ev.push({ user_id: userId, type: 'login', created_at: new Date(`${key.split('|')[1]}T08:00:00Z`) })
    for (let s = 0; s < ev.length; s += 500) await knex('activity_events').insert(ev.slice(s, s + 500))
    const rows = [...usage].map(([key, seconds]) => { const [course_id, day] = key.split('|'); return { user_id: userId, course_id: Number(course_id), day, seconds } })
    if (rows.length) await knex('daily_usage').insert(rows)
  }
  console.log(`Created ${NAMES.length} demo students with 30 days of activity. Remove them with: node scripts/demo-activity.mjs --clean`)
}

try {
  if (process.argv.includes('--clean')) await clean()
  else await create()
} finally {
  await knex.destroy()
}
