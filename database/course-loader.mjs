// Loads course files (content/courses/*.json) into the database.
// Shared by the seeder (database/seeds/03_content_courses.mjs) and the CLI (scripts/course.mjs).
// See content/README.md for the file format.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const COURSES_DIR = path.join(ROOT, 'content/courses')

const LEVELS = ['beginner', 'intermediate', 'advanced']
const TYPES = ['single', 'multiple', 'true_false', 'short']
const BLOCK_TYPES = ['text', 'callout', 'code', 'example', 'image', 'diagram', 'flashcards', 'steps', 'reveal', 'order', 'match', 'check', 'video']
const LETTERS = 'abcdefghij'
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const DEFAULT_EXAM = {
  duration_minutes: 30,
  question_count: 15,
  pass_mark: 70,
  max_attempts: 0,
  cooldown_minutes: 0,
  shuffle_options: true,
  show_review: true,
  include_lower_levels: true,
}

class CourseFileError extends Error {}

/**
 * Accepts the author-friendly question format and returns DB-ready fields.
 *   options: ["A", "B"]  or  [{ id, text }]
 *   answer:  [0, 2] (option indexes) | ["a"] (option ids) | [true] (true_false) | ["text", ...] (short)
 */
export function normalizeQuestion(q, where, fallbackLevel) {
  const fail = (msg) => { throw new CourseFileError(`${where}: ${msg}`) }
  const type = q.type ?? 'single'
  if (!TYPES.includes(type)) fail(`unknown type "${type}" (use ${TYPES.join(', ')})`)
  const level = q.level ?? fallbackLevel ?? 'beginner'
  if (!LEVELS.includes(level)) fail(`unknown level "${level}"`)
  if (!q.prompt || typeof q.prompt !== 'string') fail('missing "prompt"')
  if (!Array.isArray(q.answer) || !q.answer.length) fail('"answer" must be a non-empty array')

  let options = []
  let answer
  if (type === 'true_false') {
    options = [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }]
    answer = [String(q.answer[0]).toLowerCase() === 'true' ? 'true' : 'false']
  } else if (type === 'short') {
    answer = q.answer.map((a) => String(a).trim()).filter(Boolean)
  } else {
    options = (q.options ?? []).map((o, i) => (typeof o === 'string' ? { id: LETTERS[i], text: o } : { id: String(o.id), text: String(o.text) }))
    if (options.length < 2) fail('needs at least two options')
    if (options.length > 10) fail('has more than 10 options')
    const ids = new Set(options.map((o) => o.id))
    answer = q.answer.map((a) => (typeof a === 'number' ? options[a]?.id : String(a)))
    if (answer.some((a) => !a || !ids.has(a))) fail(`answer ${JSON.stringify(q.answer)} doesn't match the options`)
    if (type === 'single' && answer.length !== 1) fail('single-choice questions need exactly one answer')
  }
  return {
    level,
    type,
    prompt: q.prompt.trim(),
    options: JSON.stringify(options),
    answer: JSON.stringify(answer),
    explanation: q.explanation ?? '',
    in_exam: q.in_exam ?? true,
    in_practice: q.in_practice ?? true,
  }
}

/** Validates a course file and flattens it into rows. Throws CourseFileError with a precise location. */
export function parseCourse(def, file = 'course') {
  const fail = (msg) => { throw new CourseFileError(`${file}: ${msg}`) }
  const c = def?.course
  if (!c) fail('missing "course" object')
  if (!c.title) fail('course.title is required')
  if (!c.slug || !SLUG.test(c.slug)) fail(`course.slug "${c.slug ?? ''}" must be lowercase-with-dashes`)

  // Sections are optional: a flat "concepts" array is treated as one unnamed section.
  const sections = def.sections ?? [{ title: null, concepts: def.concepts ?? [] }]
  const slugs = new Set()
  const conceptLevel = {}
  const out = { course: c, exam: { ...DEFAULT_EXAM, ...(def.exam ?? {}) }, sections: [], questions: [] }

  sections.forEach((s, si) => {
    const sWhere = `sections[${si}]${s.title ? ` "${s.title}"` : ''}`
    if (s.level && !LEVELS.includes(s.level)) fail(`${sWhere}: unknown level "${s.level}"`)
    const section = { title: s.title, objective: s.objective ?? '', competencies: s.competencies ?? [], assessment: s.assessment ?? '', concepts: [] }
    ;(s.concepts ?? []).forEach((k, ki) => {
      const where = `${sWhere}.concepts[${ki}]`
      if (!k.title) fail(`${where}: missing "title"`)
      if (!k.slug || !SLUG.test(k.slug)) fail(`${where}: slug "${k.slug ?? ''}" must be lowercase-with-dashes`)
      if (slugs.has(k.slug)) fail(`${where}: duplicate concept slug "${k.slug}"`)
      slugs.add(k.slug)
      const level = k.level ?? s.level ?? 'beginner'
      if (!LEVELS.includes(level)) fail(`${where}: unknown level "${level}"`)
      conceptLevel[k.slug] = level
      for (const [bi, b] of (k.blocks ?? []).entries()) {
        if (!BLOCK_TYPES.includes(b?.type)) fail(`${where}.blocks[${bi}]: unknown block type "${b?.type}"`)
      }
      section.concepts.push({ slug: k.slug, title: k.title, summary: k.summary ?? '', level, est_minutes: k.est_minutes ?? 10, blocks: k.blocks ?? [] })
      ;(k.questions ?? []).forEach((q, qi) => out.questions.push({ concept: k.slug, ...normalizeQuestion(q, `${where}.questions[${qi}]`, level) }))
    })
    out.sections.push(section)
  })

  // Course-level questions (exam-only, or linked to a concept by slug).
  ;(def.questions ?? []).forEach((q, qi) => {
    if (q.concept && !slugs.has(q.concept)) fail(`questions[${qi}]: unknown concept "${q.concept}"`)
    out.questions.push({ concept: q.concept ?? null, ...normalizeQuestion(q, `questions[${qi}]`, conceptLevel[q.concept]) })
  })
  return out
}

export function readCourseFile(file) {
  let def
  try {
    def = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new CourseFileError(`${path.relative(ROOT, file)}: invalid JSON (${err.message})`)
  }
  return parseCourse(def, path.relative(ROOT, file))
}

/** Inserts a parsed course. Returns false (and does nothing) if the slug already exists, unless replace=true. */
export async function importCourse(knex, parsed, { replace = false } = {}) {
  const existing = await knex('courses').where({ slug: parsed.course.slug }).first()
  if (existing && !replace) return false
  await knex.transaction(async (trx) => {
    if (existing) await trx('courses').where({ id: existing.id }).delete() // cascades to everything
    const { slug, title, tagline = '', description = '', category = 'General', icon = '📘', color = '#6d5efc', published = false } = parsed.course
    const [courseId] = await trx('courses').insert({ slug, title, tagline, description, category, icon, color, published })
    await trx('exam_settings').insert({ course_id: courseId, ...parsed.exam })
    const conceptIds = {}
    let position = 0
    for (const [si, s] of parsed.sections.entries()) {
      let sectionId = null
      if (s.title) {
        ;[sectionId] = await trx('course_sections').insert({ course_id: courseId, position: si, title: s.title, objective: s.objective, competencies: JSON.stringify(s.competencies), assessment: s.assessment })
      }
      for (const k of s.concepts) {
        const [id] = await trx('concepts').insert({ ...k, blocks: JSON.stringify(k.blocks), course_id: courseId, section_id: sectionId, position: position++ })
        conceptIds[k.slug] = id
      }
    }
    for (const { concept, ...q } of parsed.questions) {
      await trx('questions').insert({ ...q, course_id: courseId, concept_id: concept ? conceptIds[concept] : null })
    }
  })
  return true
}

export function listCourseFiles(dir = COURSES_DIR) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f))
}
