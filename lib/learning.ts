// Data access shared by server components and API routes.
import { db, json } from './db'
import { isCorrect, seeded, shuffle } from './grading'
import { badRequest, conflict, notFound } from './http'
import {
  type Block, type Course, type ExamSettings, type Level, type PublicQuestion, type Question,
  levelsUpTo, LEVELS,
} from './types'

// ---- Mappers ---------------------------------------------------------------------------------

export const toCourse = (r: Record<string, any>): Course => ({
  id: Number(r.id),
  slug: r.slug,
  title: r.title,
  tagline: r.tagline ?? '',
  description: r.description ?? '',
  category: r.category ?? 'General',
  icon: r.icon ?? '📘',
  color: r.color ?? '#6d5efc',
  published: Boolean(r.published),
})

export type Concept = {
  id: number
  course_id: number
  section_id: number | null
  slug: string
  title: string
  summary: string
  level: Level
  position: number
  est_minutes: number
  blocks: Block[]
}

export const toConcept = (r: Record<string, any>): Concept => ({
  id: Number(r.id),
  course_id: Number(r.course_id),
  section_id: r.section_id == null ? null : Number(r.section_id),
  slug: r.slug,
  title: r.title,
  summary: r.summary ?? '',
  level: r.level,
  position: Number(r.position),
  est_minutes: Number(r.est_minutes),
  blocks: json<Block[]>(r.blocks, []),
})

export const toQuestion = (r: Record<string, any>): Question => ({
  id: Number(r.id),
  course_id: Number(r.course_id),
  concept_id: r.concept_id == null ? null : Number(r.concept_id),
  level: r.level,
  type: r.type,
  prompt: r.prompt,
  options: json(r.options, []),
  answer: json(r.answer, []),
  explanation: r.explanation ?? '',
  in_exam: Boolean(r.in_exam),
  in_practice: Boolean(r.in_practice),
})

export const toPublic = (q: Question): PublicQuestion => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, level: q.level })

// ---- Courses & concepts ----------------------------------------------------------------------

export async function getCourseBySlug(slug: string, { includeDrafts = false } = {}) {
  const row = await db('courses').where({ slug }).first()
  if (!row || (!includeDrafts && !row.published)) return null
  return toCourse(row)
}

export async function getConcepts(courseId: number, { withBlocks = false } = {}) {
  const cols = withBlocks ? ['*'] : ['id', 'course_id', 'section_id', 'slug', 'title', 'summary', 'level', 'position', 'est_minutes']
  const rows = await db('concepts').select(cols).where({ course_id: courseId }).orderBy([{ column: 'position' }, { column: 'id' }])
  return rows.map(toConcept)
}

export type Section = { id: number; course_id: number; position: number; title: string; objective: string; competencies: string[]; assessment: string }

export async function getSections(courseId: number): Promise<Section[]> {
  const rows = await db('course_sections').where({ course_id: courseId }).orderBy([{ column: 'position' }, { column: 'id' }])
  return rows.map((r) => ({
    id: Number(r.id),
    course_id: Number(r.course_id),
    position: Number(r.position),
    title: r.title,
    objective: r.objective ?? '',
    competencies: json<string[]>(r.competencies, []),
    assessment: r.assessment ?? '',
  }))
}

/** Groups concepts (kept in course order) under their sections; unsectioned concepts come last. */
export function groupBySection<C extends { section_id: number | null }>(concepts: C[], sections: Section[]) {
  const groups = sections.map((section) => ({ section: section as Section | null, concepts: concepts.filter((c) => c.section_id === section.id) }))
  const known = new Set(sections.map((s) => s.id))
  const loose = concepts.filter((c) => c.section_id == null || !known.has(c.section_id))
  if (loose.length) groups.push({ section: null, concepts: loose })
  return groups.filter((g) => g.concepts.length || g.section)
}

/** Display number for a concept: from a numbered slug ("8-2-1-macro…" → "8.2.1"), else section.position. */
export function conceptNumber(slug: string, sectionIndex: number | null, index: number) {
  const m = slug.match(/^(\d+(?:-\d+)+)-/)
  if (m) return m[1].replace(/-/g, '.')
  return sectionIndex === null ? String(index + 1) : `${sectionIndex + 1}.${index + 1}`
}

export type CatalogCourse = Course & { concept_count: number; question_count: number; student_count: number; enrolled: boolean; progress: number }

export async function listCatalog(userId?: number): Promise<CatalogCourse[]> {
  const courses = (await db('courses').where({ published: true }).orderBy('title')).map(toCourse)
  if (!courses.length) return []
  const ids = courses.map((c) => c.id)
  const [concepts, questions, students] = await Promise.all([
    db('concepts').whereIn('course_id', ids).groupBy('course_id').select('course_id').count({ n: '*' }),
    db('questions').whereIn('course_id', ids).groupBy('course_id').select('course_id').count({ n: '*' }),
    db('enrollments').whereIn('course_id', ids).groupBy('course_id').select('course_id').count({ n: '*' }),
  ])
  const by = (rows: any[]) => new Map(rows.map((r) => [Number(r.course_id), Number(r.n)]))
  const [cc, qc, sc] = [by(concepts), by(questions), by(students)]
  const progress = userId ? await progressForUser(userId) : new Map<number, { percent: number }>()
  return courses.map((c) => ({
    ...c,
    concept_count: cc.get(c.id) ?? 0,
    question_count: qc.get(c.id) ?? 0,
    student_count: sc.get(c.id) ?? 0,
    enrolled: progress.has(c.id),
    progress: progress.get(c.id)?.percent ?? 0,
  }))
}

// ---- Enrollment & progress -------------------------------------------------------------------

export type Enrollment = { id: number; user_id: number; course_id: number; level: Level; enrolled_at: Date }

export async function getEnrollment(userId: number, courseId: number): Promise<Enrollment | null> {
  const row = await db('enrollments').where({ user_id: userId, course_id: courseId }).first()
  return row ? { ...row, id: Number(row.id), user_id: Number(row.user_id), course_id: Number(row.course_id) } : null
}

export async function enroll(userId: number, courseId: number, level: Level) {
  const existing = await getEnrollment(userId, courseId)
  if (existing) {
    await db('enrollments').where({ id: existing.id }).update({ level, last_activity_at: new Date() })
  } else {
    await db('enrollments').insert({ user_id: userId, course_id: courseId, level, last_activity_at: new Date() })
  }
}

export type ConceptProgress = { concept_id: number; viewed_at: Date | null; completed_at: Date | null; practice_correct: number; practice_answered: number }

export async function getConceptProgress(userId: number, conceptIds: number[]) {
  if (!conceptIds.length) return new Map<number, ConceptProgress>()
  const rows = await db('concept_progress').where({ user_id: userId }).whereIn('concept_id', conceptIds)
  return new Map<number, ConceptProgress>(rows.map((r) => [Number(r.concept_id), { ...r, concept_id: Number(r.concept_id) }]))
}

/** Per enrolled course: concepts completed out of concepts visible at the enrolled level. */
export async function progressForUser(userId: number) {
  const rows = await db('enrollments as e')
    .join('concepts as c', 'c.course_id', 'e.course_id')
    .leftJoin('concept_progress as p', function () {
      this.on('p.concept_id', 'c.id').andOn('p.user_id', 'e.user_id')
    })
    .where('e.user_id', userId)
    .select('e.course_id', 'e.level', 'c.level as concept_level', 'p.completed_at')
  const out = new Map<number, { total: number; done: number; percent: number }>()
  const enrolled = await db('enrollments').where({ user_id: userId }).select('course_id')
  for (const e of enrolled) out.set(Number(e.course_id), { total: 0, done: 0, percent: 0 })
  for (const r of rows) {
    if (!levelsUpTo(r.level).includes(r.concept_level)) continue
    const p = out.get(Number(r.course_id))!
    p.total++
    if (r.completed_at) p.done++
  }
  for (const p of out.values()) p.percent = p.total ? Math.round((p.done / p.total) * 100) : 0
  return out
}

export async function markViewed(userId: number, conceptId: number) {
  await db('concept_progress')
    .insert({ user_id: userId, concept_id: conceptId, viewed_at: new Date() })
    .onConflict(['user_id', 'concept_id'])
    .merge({ viewed_at: new Date() })
}

// ---- Exams -----------------------------------------------------------------------------------

export const DEFAULT_EXAM: Omit<ExamSettings, 'course_id'> = {
  duration_minutes: 20,
  question_count: 10,
  pass_mark: 70,
  max_attempts: 0,
  cooldown_minutes: 0,
  shuffle_options: true,
  show_review: true,
  include_lower_levels: true,
}

export async function getExamSettings(courseId: number): Promise<ExamSettings> {
  const row = await db('exam_settings').where({ course_id: courseId }).first()
  if (!row) return { course_id: courseId, ...DEFAULT_EXAM }
  return {
    course_id: courseId,
    duration_minutes: Number(row.duration_minutes),
    question_count: Number(row.question_count),
    pass_mark: Number(row.pass_mark),
    max_attempts: Number(row.max_attempts),
    cooldown_minutes: Number(row.cooldown_minutes),
    shuffle_options: Boolean(row.shuffle_options),
    show_review: Boolean(row.show_review),
    include_lower_levels: Boolean(row.include_lower_levels),
  }
}

export type Attempt = {
  id: number
  user_id: number
  course_id: number
  level: Level
  duration_minutes: number
  pass_mark: number
  started_at: Date
  expires_at: Date
  submitted_at: Date | null
  question_ids: number[]
  answers: Record<string, string[]>
  score: number | null
  total: number
  percent: number | null
  passed: boolean | null
}

const toAttempt = (r: Record<string, any>): Attempt => ({
  id: Number(r.id),
  user_id: Number(r.user_id),
  course_id: Number(r.course_id),
  level: r.level,
  duration_minutes: Number(r.duration_minutes),
  pass_mark: Number(r.pass_mark),
  started_at: new Date(r.started_at),
  expires_at: new Date(r.expires_at),
  submitted_at: r.submitted_at ? new Date(r.submitted_at) : null,
  question_ids: json(r.question_ids, []),
  answers: json(r.answers, {}),
  score: r.score == null ? null : Number(r.score),
  total: Number(r.total),
  percent: r.percent == null ? null : Number(r.percent),
  passed: r.passed == null ? null : Boolean(r.passed),
})

/** Grace period for network latency on submit after the clock hits zero. */
const GRACE_MS = 30_000

export async function examPool(courseId: number, level: Level, includeLower: boolean) {
  const levels = includeLower ? levelsUpTo(level) : [level]
  return db('questions').where({ course_id: courseId, in_exam: true }).whereIn('level', levels).count({ n: '*' }).first().then((r) => Number(r?.n ?? 0))
}

export async function startAttempt(userId: number, courseId: number, level: Level) {
  if (!LEVELS.includes(level)) throw badRequest('Unknown level')
  const settings = await getExamSettings(courseId)

  // Resume an attempt that is still running instead of opening a second one.
  const open = await db('exam_attempts').where({ user_id: userId, course_id: courseId }).whereNull('submitted_at').orderBy('id', 'desc')
  for (const row of open) {
    const a = toAttempt(row)
    if (a.expires_at.getTime() > Date.now()) return a
    await finalizeAttempt(a)
  }

  const past = await db('exam_attempts').where({ user_id: userId, course_id: courseId }).orderBy('id', 'desc')
  if (settings.max_attempts > 0 && past.length >= settings.max_attempts) {
    throw conflict(`You have used all ${settings.max_attempts} attempts for this exam`)
  }
  if (settings.cooldown_minutes > 0 && past[0]?.submitted_at) {
    const ready = new Date(past[0].submitted_at).getTime() + settings.cooldown_minutes * 60_000
    if (ready > Date.now()) throw conflict(`Next attempt available in ${Math.ceil((ready - Date.now()) / 60_000)} min`)
  }

  // Questions at the chosen level first, topped up from lower levels if allowed.
  const pick = async (levels: Level[], n: number, exclude: number[]) => {
    if (n <= 0) return []
    const rows = await db('questions').select('id').where({ course_id: courseId, in_exam: true }).whereIn('level', levels).whereNotIn('id', exclude.length ? exclude : [0])
    return shuffle(rows.map((r) => Number(r.id))).slice(0, n)
  }
  let ids = await pick([level], settings.question_count, [])
  if (settings.include_lower_levels && ids.length < settings.question_count) {
    ids = ids.concat(await pick(levelsUpTo(level).filter((l) => l !== level), settings.question_count - ids.length, ids))
  }
  if (!ids.length) throw badRequest('This course has no exam questions at that level yet')
  ids = shuffle(ids)

  const started = new Date()
  const expires = new Date(started.getTime() + settings.duration_minutes * 60_000)
  const [id] = await db('exam_attempts').insert({
    user_id: userId,
    course_id: courseId,
    level,
    duration_minutes: settings.duration_minutes,
    pass_mark: settings.pass_mark,
    started_at: started,
    expires_at: expires,
    question_ids: JSON.stringify(ids),
    answers: JSON.stringify({}),
    total: ids.length,
  })
  await db('enrollments').where({ user_id: userId, course_id: courseId }).update({ last_activity_at: new Date() })
  return (await getAttempt(Number(id)))!
}

export async function getAttempt(id: number) {
  const row = await db('exam_attempts').where({ id }).first()
  return row ? toAttempt(row) : null
}

/** Loads an attempt the user owns, auto-submitting it if its time ran out. */
export async function getOwnAttempt(id: number, userId: number) {
  let a = await getAttempt(id)
  if (!a || a.user_id !== userId) throw notFound('Attempt')
  if (!a.submitted_at && a.expires_at.getTime() + GRACE_MS < Date.now()) a = await finalizeAttempt(a)
  return a
}

export async function saveAnswers(a: Attempt, answers: Record<string, string[]>) {
  if (a.submitted_at) throw conflict('This attempt has already been submitted')
  if (a.expires_at.getTime() + GRACE_MS < Date.now()) throw conflict('Time is up for this attempt')
  const allowed = new Set(a.question_ids.map(String))
  const clean = Object.fromEntries(Object.entries(answers).filter(([k]) => allowed.has(k)).map(([k, v]) => [k, v.slice(0, 20).map((s) => String(s).slice(0, 500))]))
  await db('exam_attempts').where({ id: a.id }).update({ answers: JSON.stringify(clean) })
  return clean
}

export async function finalizeAttempt(a: Attempt, answers?: Record<string, string[]>) {
  if (a.submitted_at) return a
  const late = a.expires_at.getTime() + GRACE_MS < Date.now()
  // Answers sent after the deadline are ignored; the last autosave counts.
  const final = answers && !late ? await saveAnswers(a, answers) : a.answers
  const questions = await loadQuestions(a.question_ids)
  const score = questions.filter((q) => isCorrect(q, final[q.id])).length
  const percent = a.total ? Math.round((score / a.total) * 10000) / 100 : 0
  const submitted = late ? a.expires_at : new Date()
  await db('exam_attempts').where({ id: a.id }).whereNull('submitted_at').update({
    submitted_at: submitted,
    score,
    percent,
    passed: percent >= a.pass_mark,
  })
  return (await getAttempt(a.id))!
}

export async function loadQuestions(ids: number[]) {
  if (!ids.length) return []
  const rows = await db('questions').whereIn('id', ids)
  const map = new Map(rows.map((r) => [Number(r.id), toQuestion(r)]))
  return ids.map((id) => map.get(id)).filter(Boolean) as Question[]
}

/** Questions for an attempt in display order, with options shuffled stably per attempt. */
export async function attemptQuestions(a: Attempt, shuffleOptions: boolean) {
  const qs = await loadQuestions(a.question_ids)
  return qs.map((q) => {
    if (!shuffleOptions || q.type === 'true_false') return q
    return { ...q, options: shuffle(q.options, seeded(a.id * 7919 + q.id)) }
  })
}

export async function listAttempts(userId: number, courseId: number) {
  const rows = await db('exam_attempts').where({ user_id: userId, course_id: courseId }).orderBy('id', 'desc')
  return rows.map(toAttempt)
}
