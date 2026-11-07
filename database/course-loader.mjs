// Loads course files (content/courses/*.json) into the database.
// Shared by the seeder (database/seeds/03_content_courses.mjs) and the CLI (scripts/course.mjs).
// See content/README.md for the file format.
import crypto from 'node:crypto'
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
  const raw = fs.readFileSync(file, 'utf8')
  try {
    def = JSON.parse(raw)
  } catch (err) {
    throw new CourseFileError(`${path.relative(ROOT, file)}: invalid JSON (${err.message})`)
  }
  return { ...parseCourse(def, path.relative(ROOT, file)), hash: crypto.createHash('sha256').update(raw).digest('hex') }
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

// ---- Sync: bring an already-seeded course up to date with its file ---------------------------

/** Rows edited in the admin area since the last seed (updated_at moves on every admin save). */
async function adminEditsSince(knex, courseId, seededAt) {
  // Legacy courses seeded before content_seeds existed: an edit is any row updated after it was created.
  const edited = (q) => (seededAt ? q.where('updated_at', '>', new Date(seededAt.getTime() + 2000)) : q.whereRaw('updated_at > DATE_ADD(created_at, INTERVAL 2 SECOND)'))
  const [concepts, questions, sections] = await Promise.all([
    edited(knex('concepts').where({ course_id: courseId })).count({ n: '*' }).first(),
    edited(knex('questions').where({ course_id: courseId })).count({ n: '*' }).first(),
    edited(knex('course_sections').where({ course_id: courseId })).count({ n: '*' }).first(),
  ])
  return Number(concepts.n) + Number(questions.n) + Number(sections.n)
}

/**
 * Updates a course in place from its file, matching rows so student data survives:
 * concepts by slug (progress kept), sections by title, questions by concept + prompt.
 * Kept from the database: `published` and the exam settings (both are usually set in the admin area).
 * Removed concepts/questions are deleted (their progress and exam-review entries go with them).
 */
export async function syncCourse(knex, parsed, courseId) {
  const stats = { concepts: { added: 0, updated: 0, removed: 0 }, questions: { added: 0, updated: 0, removed: 0 } }
  await knex.transaction(async (trx) => {
    const { slug, title, tagline = '', description = '', category = 'General', icon = '📘', color = '#6d5efc' } = parsed.course
    await trx('courses').where({ id: courseId }).update({ slug, title, tagline, description, category, icon, color })

    // Sections, matched by title.
    const oldSections = await trx('course_sections').where({ course_id: courseId })
    const sectionByTitle = new Map(oldSections.map((r) => [r.title, r]))
    const sectionIds = []
    for (const [si, sec] of parsed.sections.entries()) {
      if (!sec.title) { sectionIds.push(null); continue }
      const row = { position: si, title: sec.title, objective: sec.objective, competencies: JSON.stringify(sec.competencies), assessment: sec.assessment }
      const existing = sectionByTitle.get(sec.title)
      if (existing) {
        await trx('course_sections').where({ id: existing.id }).update(row)
        sectionByTitle.delete(sec.title)
        sectionIds.push(existing.id)
      } else {
        const [id] = await trx('course_sections').insert({ ...row, course_id: courseId })
        sectionIds.push(id)
      }
    }

    // Concepts, matched by slug, so concept_progress rows stay attached.
    const oldConcepts = await trx('concepts').where({ course_id: courseId })
    const conceptBySlug = new Map(oldConcepts.map((r) => [r.slug, r]))
    const conceptIds = {}
    let position = 0
    for (const [si, sec] of parsed.sections.entries()) {
      for (const k of sec.concepts) {
        const row = { title: k.title, summary: k.summary, level: k.level, est_minutes: k.est_minutes, blocks: JSON.stringify(k.blocks), section_id: sectionIds[si], position: position++ }
        const existing = conceptBySlug.get(k.slug)
        if (existing) {
          await trx('concepts').where({ id: existing.id }).update(row)
          conceptBySlug.delete(k.slug)
          conceptIds[k.slug] = existing.id
          stats.concepts.updated++
        } else {
          const [id] = await trx('concepts').insert({ ...row, slug: k.slug, course_id: courseId })
          conceptIds[k.slug] = id
          stats.concepts.added++
        }
      }
    }
    if (conceptBySlug.size) {
      await trx('concepts').whereIn('id', [...conceptBySlug.values()].map((r) => r.id)).delete()
      stats.concepts.removed = conceptBySlug.size
    }
    // Sections no longer in the file (their concepts were reassigned or removed above).
    if (sectionByTitle.size) await trx('course_sections').whereIn('id', [...sectionByTitle.values()].map((r) => r.id)).delete()

    // Questions, matched by concept + prompt (with an occurrence counter for duplicate prompts).
    const slugById = new Map(Object.entries(conceptIds).map(([s, id]) => [Number(id), s]))
    const keyed = (rows, conceptOf) => {
      const seen = new Map()
      return rows.map((r) => {
        const base = `${conceptOf(r) ?? ''}|${r.prompt.trim()}`
        const n = (seen.get(base) ?? 0) + 1
        seen.set(base, n)
        return [`${base}#${n}`, r]
      })
    }
    const oldQuestions = new Map(keyed(await trx('questions').where({ course_id: courseId }), (r) => (r.concept_id == null ? null : slugById.get(Number(r.concept_id)))))
    for (const [key, q] of keyed(parsed.questions, (q) => q.concept)) {
      const { concept, ...fields } = q
      const row = { ...fields, concept_id: concept ? conceptIds[concept] : null }
      const existing = oldQuestions.get(key)
      if (existing) {
        await trx('questions').where({ id: existing.id }).update(row)
        oldQuestions.delete(key)
        stats.questions.updated++
      } else {
        await trx('questions').insert({ ...row, course_id: courseId })
        stats.questions.added++
      }
    }
    if (oldQuestions.size) {
      await trx('questions').whereIn('id', [...oldQuestions.values()].map((r) => r.id)).delete()
      stats.questions.removed = oldQuestions.size
    }
  })
  return stats
}

/**
 * What the seeder does with one course file:
 *   new slug                     → insert
 *   unchanged since last seed    → skip
 *   changed, not edited in admin → sync in place
 *   changed, edited in admin     → skip with a warning (use `course:import --replace` or `course:sync --force`)
 */
export async function seedCourseFile(knex, parsed, { force = false, log = console.log } = {}) {
  const slug = parsed.course.slug
  const record = () => knex('content_seeds').insert({ slug, hash: parsed.hash, seeded_at: new Date() }).onConflict('slug').merge()
  const course = await knex('courses').where({ slug }).first()
  if (!course) {
    await importCourse(knex, parsed)
    await record()
    log(`  + course "${parsed.course.title}" inserted`)
    return 'inserted'
  }
  const seed = await knex('content_seeds').where({ slug }).first()
  if (seed && seed.hash === parsed.hash && !force) return 'unchanged'
  const edits = await adminEditsSince(knex, course.id, seed ? new Date(seed.seeded_at) : null)
  if (edits && !force) {
    log(`  ! course "${slug}": file changed, but ${edits} item(s) were edited in the admin area since it was seeded. Skipped to keep those edits. Run \`npm run course:sync -- content/courses/${slug}.json --force\` to apply the file anyway.`)
    return 'skipped'
  }
  const stats = await syncCourse(knex, parsed, course.id)
  await record()
  const fmt = (o) => `+${o.added} ~${o.updated} -${o.removed}`
  log(`  ~ course "${parsed.course.title}" synced: concepts ${fmt(stats.concepts)}, questions ${fmt(stats.questions)}`)
  return 'synced'
}
