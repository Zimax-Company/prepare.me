#!/usr/bin/env node
// Course content CLI.
//   node scripts/course.mjs convert <outline.md> [--out=content/courses/<slug>.json] [--force]
//   node scripts/course.mjs validate [file.json ...]        (default: all of content/courses)
//   node scripts/course.mjs import <file.json> [--replace]  (insert now, without a full re-seed)
//   node scripts/course.mjs sync <file.json> [--force]      (what deploys do: insert, or update in place keeping progress)
import fs from 'node:fs'
import path from 'node:path'
import knexFactory from 'knex'
import { COURSES_DIR, ROOT, importCourse, listCourseFiles, parseCourse, readCourseFile, seedCourseFile } from '../database/course-loader.mjs'

const [command, ...rest] = process.argv.slice(2)
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const args = rest.filter((a) => !a.startsWith('--'))
const done = (m) => console.log(`\x1b[32m  DONE\x1b[0m  ${m}`)
const info = (m) => console.log(`\x1b[36m  INFO\x1b[0m  ${m}`)
const die = (m) => { console.error(`\x1b[31m  ERROR\x1b[0m ${m}`); process.exit(1) }

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110)

// ---- Outline → course JSON -------------------------------------------------------------------

/** Parses "key: value" front matter between --- lines. Values may be JSON. */
function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w.]+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    try { v = JSON.parse(v) } catch { /* plain string */ }
    meta[kv[1]] = v
  }
  return { meta, body: text.slice(m[0].length) }
}

/** "1,2" | "1-2" | [1,2] → [1,2] */
const nums = (v) => {
  if (Array.isArray(v)) return v.map(Number)
  return String(v ?? '').split(',').flatMap((p) => { const [a, b] = p.split('-').map((x) => Number(x.trim())); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : a ? [a] : [] })
}

export function parseOutline(text) {
  const { meta, body } = frontMatter(text.replace(/\r\n/g, '\n'))
  const sections = []
  let cur = null
  let mode = null
  for (const raw of body.split('\n')) {
    // Tolerate markdown: "## Level 1: …", "| 1.1 | Topic |", "**Objective:** …", "- item"
    const line = raw.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^\|\s*|\s*\|\s*$/g, '').replace(/\s*\|\s*/g, '\t').trim()
    if (!line) continue
    let m
    if ((m = line.match(/^(?:Level|Unit|Part|Section|Module group)\s+(\d+)\s*[:.–-]\s*(.+)$/i))) {
      cur = { number: Number(m[1]), title: `Level ${m[1]}: ${m[2].trim()}`, name: m[2].trim(), objective: '', notes: [], competencies: [], applications: [], tools: [], assessment: '', modules: [], group: null }
      sections.push(cur)
      mode = null
    } else if (!cur) {
      continue // preamble such as "Detailed Course Curriculum"
    } else if ((m = line.match(/^Objective\s*:\s*(.*)$/i))) {
      cur.objective = m[1].trim(); mode = null
    } else if ((m = line.match(/^Expected competencies\s*:?\s*(.*)$/i))) {
      mode = 'competencies'; if (m[1]) cur.competencies.push(m[1].trim())
    } else if ((m = line.match(/^Practical applications\s*:?\s*(.*)$/i))) {
      mode = 'applications'; if (m[1]) cur.applications.push(m[1].trim())
    } else if ((m = line.match(/^Recommended tools\s*:?\s*(.*)$/i))) {
      mode = 'tools'; if (m[1]) cur.tools.push(m[1].trim())
    } else if ((m = line.match(/^(?:Final\s+)?Assessment\s*:\s*(.*)$/i))) {
      cur.assessment = m[1].trim(); mode = null
    } else if ((m = line.match(/^Module\s+(\d+(?:\.\d+)+)\s*[–—:-]\s*(.+)$/i))) {
      // "Module 8.1 – Title" followed by "- topic" bullets: each bullet becomes a concept 8.1.1, 8.1.2, …
      cur.group = { code: m[1], title: m[2].trim(), n: 0 }; mode = 'group'
    } else if (/^Module\s+Topics?$/i.test(line.replace(/\t+/g, ' ')) || /^-{3,}/.test(line)) {
      continue // table header / separator
    } else if ((m = line.match(/^(\d+(?:\.\d+)+)\s+(.+)$/))) {
      cur.modules.push({ code: m[1], title: m[2].trim() }); mode = null
    } else if (mode === 'group' && /^[-*•]\s+/.test(line)) {
      const g = cur.group
      cur.modules.push({ code: `${g.code}.${++g.n}`, title: line.replace(/^[-*•]\s*/, '').replace(/\.$/, '').trim(), group: `Module ${g.code} · ${g.title}` })
    } else if (['competencies', 'applications', 'tools'].includes(mode)) {
      cur[mode].push(line.replace(/^[-*•]\s*/, '').replace(/\.$/, ''))
    } else if (!cur.modules.length && !/^[-*•]/.test(line)) {
      cur.notes.push(line) // explanatory text between the objective and the module table
    }
  }
  return { meta, sections }
}

/** Section N of `total` → difficulty. Front matter `beginner: 1-2` etc. wins; otherwise split into thirds. */
function levelFor(n, total, meta) {
  for (const l of ['beginner', 'intermediate', 'advanced']) if (meta[l] && nums(meta[l]).includes(n)) return l
  return ['beginner', 'intermediate', 'advanced'][Math.min(2, Math.floor(((n - 1) * 3) / Math.max(1, total)))]
}

export function outlineToCourse(text) {
  const { meta, sections } = parseOutline(text)
  if (!sections.length) die('No sections found. Expected lines like "Level 1: Title" followed by "1.1  Topic" module lines.')
  if (!meta.title) die('Add a front matter block with at least `title:` (see content/outlines/TEMPLATE.md).')
  const slug = meta.slug ?? slugify(meta.title)
  const minutes = Number(meta.est_minutes ?? 15)

  return {
    $schema: '../course.schema.json',
    course: {
      slug,
      title: meta.title,
      tagline: meta.tagline ?? '',
      description: meta.description ?? sections.map((s) => `- **${s.title}**: ${s.objective}`).join('\n'),
      category: meta.category ?? 'General',
      icon: meta.icon ?? '📘',
      color: meta.color ?? '#6d5efc',
      published: meta.published === true, // drafts until the content is written
    },
    exam: {
      duration_minutes: Number(meta.exam_minutes ?? 45),
      question_count: Number(meta.exam_questions ?? 20),
      pass_mark: Number(meta.pass_mark ?? 70),
      max_attempts: Number(meta.max_attempts ?? 0),
      cooldown_minutes: 0,
      shuffle_options: true,
      show_review: true,
      include_lower_levels: true,
    },
    sections: sections.map((s) => {
      const level = levelFor(s.number, sections.length, meta)
      return {
        title: s.title,
        level,
        objective: s.objective,
        competencies: s.competencies,
        assessment: s.assessment,
        concepts: s.modules.map((mod, i) => ({
          slug: `${mod.code.replace(/\./g, '-')}-${slugify(mod.title)}`,
          title: mod.title,
          summary: mod.group ?? `Module ${mod.code}`,
          est_minutes: minutes,
          blocks: [
            ...(i === 0 ? [{
              type: 'callout', tone: 'info', title: `${s.title}`,
              md: [
                s.objective,
                ...s.notes.map((n) => `\n${n}`),
                s.competencies.length ? `\nBy the end of this level you should be able to:\n${s.competencies.map((c) => `- ${c}`).join('\n')}` : '',
                s.applications.length ? `\nPractical applications:\n${s.applications.map((c) => `- ${c}`).join('\n')}` : '',
                s.tools.length ? `\nRecommended tools:\n${s.tools.map((c) => `- ${c}`).join('\n')}` : '',
              ].filter(Boolean).join('\n').trim(),
            }] : []),
            { type: 'text', md: `## ${mod.title}\n\nTODO: write this lesson. Explain the key idea, give a formal definition, add worked examples and finish with a quick check.` },
          ],
          questions: [],
        })),
      }
    }),
    questions: [],
  }
}

// ---- Commands --------------------------------------------------------------------------------

if (command === 'convert') {
  const src = args[0] ?? die('Usage: convert <outline.md> [--out=file.json] [--force]')
  const course = outlineToCourse(fs.readFileSync(src, 'utf8'))
  parseCourse(course, 'generated') // sanity check
  const out = flags.out ? path.resolve(flags.out) : path.join(COURSES_DIR, `${course.course.slug}.json`)
  if (fs.existsSync(out) && !flags.force) die(`${path.relative(ROOT, out)} already exists (it may contain written content). Use --force to overwrite.`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(course, null, 2) + '\n')
  const n = course.sections.reduce((a, s) => a + s.concepts.length, 0)
  done(`${course.sections.length} sections, ${n} concepts → ${path.relative(ROOT, out)}`)
  for (const s of course.sections) info(`${s.level.padEnd(12)} ${s.title} (${s.concepts.length} concepts)`)
} else if (command === 'validate') {
  const files = args.length ? args.map((a) => path.resolve(a)) : listCourseFiles()
  if (!files.length) info('No course files found.')
  let failed = false
  for (const f of files) {
    try {
      const p = readCourseFile(f)
      const concepts = p.sections.reduce((a, s) => a + s.concepts.length, 0)
      const todo = p.sections.flatMap((s) => s.concepts).filter((k) => JSON.stringify(k.blocks).includes('TODO')).length
      const practice = new Set(p.questions.filter((q) => q.concept).map((q) => q.concept))
      done(`${path.relative(ROOT, f)}: ${concepts} concepts, ${p.questions.length} questions`)
      if (todo) info(`  ${todo} concepts still contain TODO placeholders`)
      if (practice.size < concepts) info(`  ${concepts - practice.size} concepts have no practice questions`)
      if (p.questions.filter((q) => q.in_exam).length < p.exam.question_count) info(`  fewer exam questions than exam.question_count (${p.exam.question_count})`)
    } catch (err) {
      failed = true
      console.error(`\x1b[31m  ERROR\x1b[0m ${err.message}`)
    }
  }
  process.exit(failed ? 1 : 0)
} else if (command === 'import') {
  const file = args[0] ?? die('Usage: import <file.json> [--replace]')
  if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'))
  const { knexConfig } = await import('../database/config.mjs')
  const knex = knexFactory(knexConfig())
  try {
    const parsed = readCourseFile(path.resolve(file))
    if (flags.replace && process.env.NODE_ENV === 'production') die('--replace deletes enrollments and attempts; refusing in production.')
    const added = await importCourse(knex, parsed, { replace: !!flags.replace })
    if (added) done(`Imported "${parsed.course.title}"${flags.replace ? ' (replaced existing, including student progress)' : ''}`)
    else info(`Course "${parsed.course.slug}" already exists. Use --replace to overwrite it (this deletes its student progress).`)
  } catch (err) {
    die(err.message)
  } finally {
    await knex.destroy()
  }
} else if (command === 'sync') {
  const file = args[0] ?? die('Usage: sync <file.json> [--force]')
  if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'))
  const { knexConfig } = await import('../database/config.mjs')
  const knex = knexFactory(knexConfig())
  try {
    const result = await seedCourseFile(knex, readCourseFile(path.resolve(file)), { force: !!flags.force })
    if (result === 'unchanged') info('Course is already up to date with this file.')
  } catch (err) {
    die(err.message)
  } finally {
    await knex.destroy()
  }
} else {
  die(`Unknown command "${command ?? ''}". Commands: convert, validate, import, sync`)
}
