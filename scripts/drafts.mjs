#!/usr/bin/env node
// Draft lesson files: content/drafts/<course-slug>/level-<n>.json  →  { "concepts": [ { slug, title, summary, est_minutes, blocks, questions } ] }
//   node scripts/drafts.mjs check <draft.json> --course=content/courses/<slug>.json --section=<n> [--only=8-1-,8-2-]
//   node scripts/drafts.mjs merge --course=content/courses/<slug>.json --dir=content/drafts/<slug>
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'
import { parseCourse } from '../database/course-loader.mjs'

const [command, ...rest] = process.argv.slice(2)
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=') || true] }))
const args = rest.filter((a) => !a.startsWith('--'))
const die = (m) => { console.error(`\x1b[31m  ERROR\x1b[0m ${m}`); process.exit(1) }

const MIN_QUESTIONS = 5
const INTERACTIVE = new Set(['steps', 'flashcards', 'order', 'match', 'check', 'reveal', 'diagram', 'example'])
// Same rules as components/Markdown.tsx
const MATH = /(`[^`]+`)|(\\\$)|\$\$([^$]+?)\$\$|\$(?=\S)((?:\\.|[^$\\\n])+?)(?<=\S)\$(?!\d)/g

function strings(value, where, out = []) {
  if (typeof value === 'string') out.push([where, value])
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${where}[${i}]`, out))
  else if (value && typeof value === 'object') {
    if (value.type === 'code') return out // code blocks aren't markdown
    for (const [k, v] of Object.entries(value)) if (k !== 'slug' && k !== 'type') strings(v, `${where}.${k}`, out)
  }
  return out
}

function mathProblems(where, s) {
  const problems = []
  // JSON escapes like "\t" "\f" "\b" "\r" turn \times, \frac, \beta, \rho into control characters.
  if (/[\t\f\b\r\v]/.test(s)) problems.push(`${where}: contains a control character, which is probably an unescaped backslash. In JSON, LaTeX needs double backslashes: "\\\\frac"`)
  const blocks = [...s.matchAll(/^\s*\$\$([\s\S]*?)\$\$\s*$/gm)].map((m) => [m[1], true])
  const inline = [...s.matchAll(MATH)].filter((m) => m[3] || m[4]).map((m) => [m[3] ?? m[4], !!m[3]])
  for (const [src, display] of [...blocks, ...inline]) {
    if (src.includes('\n') && !display) problems.push(`${where}: inline math spans a line break: $${src.slice(0, 40)}…$`)
    try {
      katex.renderToString(src, { displayMode: display, throwOnError: true, strict: 'ignore' })
    } catch (err) {
      problems.push(`${where}: KaTeX error in "${src.slice(0, 60)}": ${err.message.replace(/^KaTeX parse error: /, '')}`)
    }
  }
  // "\ne", "\nabla", "\nu", "\neq", "\notin" with a single backslash become a newline + letters,
  // splitting an inline formula across two lines. Check $ balance line by line.
  const noDisplay = s.replace(/`[^`]*`/g, '').replace(/\\\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
  noDisplay.split('\n').forEach((line, li) => {
    const n = line.match(/\$/g)?.length ?? 0
    if (n % 2 === 1 && !/\$\d/.test(line)) problems.push(`${where}: line ${li + 1} has an unbalanced $, possibly an unescaped "\\ne"/"\\nabla"/"\\nu" (write "\\\\ne"): ${JSON.stringify(line.slice(0, 70))}`)
  })
  // Any $ left over after removing everything the renderer treats as maths will show up raw,
  // e.g. "$= 1 - $" (a space before the closing $ means it is not maths). Prices like $5 are fine.
  const leftover = s.replace(/`[^`]*`/g, '').replace(/\\\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '').replace(MATH, '')
  const stray = leftover.match(/.{0,25}\$(?!\d).{0,25}/)
  if (stray) problems.push(`${where}: a $ that won't render as maths (check for a space just inside the $…$): ${JSON.stringify(stray[0])}`)
  // An odd number of unescaped $ usually means a broken formula.
  const bare = s.replace(/`[^`]*`/g, '').replace(/\\\$/g, '').match(/\$/g)?.length ?? 0
  if (bare % 2 === 1 && !/\$\d/.test(s)) problems.push(`${where}: odd number of $ signs. Close every formula, or write \\\\$ for a literal dollar sign`)
  return problems
}

function loadCourse() {
  if (!flags.course) die('--course=<course json> is required')
  return JSON.parse(fs.readFileSync(flags.course, 'utf8'))
}

if (command === 'check') {
  const file = args[0] ?? die('Usage: check <draft.json> --course=… --section=<n>')
  const course = loadCourse()
  const section = course.sections[Number(flags.section) - 1] ?? die(`--section must be 1..${course.sections.length}`)
  let draft
  try { draft = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (err) { die(`${file}: invalid JSON: ${err.message}`) }
  const problems = []
  const concepts = draft.concepts ?? []
  // --only=8-1-,8-2- checks just the concepts whose slugs start with these prefixes (a level split across files).
  const only = typeof flags.only === 'string' ? flags.only.split(',').filter(Boolean) : null
  const want = section.concepts.map((c) => c.slug).filter((s) => !only || only.some((p) => s.startsWith(p)))
  const got = concepts.map((c) => c.slug)
  for (const s of want) if (!got.includes(s)) problems.push(`missing concept "${s}"`)
  for (const s of got) if (!want.includes(s)) problems.push(`unexpected concept slug "${s}" (slugs must match the course file exactly)`)

  try {
    parseCourse({ course: { slug: 'draft-check', title: 'x' }, sections: [{ title: section.title, level: section.level, concepts }] }, path.basename(file))
  } catch (err) { problems.push(err.message) }

  for (const c of concepts) {
    const w = `concept "${c.slug}"`
    const blocks = c.blocks ?? []
    if (JSON.stringify(blocks).includes('TODO')) problems.push(`${w}: still contains TODO`)
    if (blocks.length < 4) problems.push(`${w}: only ${blocks.length} blocks (aim for 5+)`)
    if (!blocks.some((b) => INTERACTIVE.has(b.type))) problems.push(`${w}: has no interactive block (steps, example, check, flashcards, order, match, reveal or diagram)`)
    if (!blocks.some((b) => b.type === 'example')) problems.push(`${w}: has no worked example block`)
    if ((c.questions ?? []).length < MIN_QUESTIONS) problems.push(`${w}: ${(c.questions ?? []).length} questions (need at least ${MIN_QUESTIONS})`)
    for (const [where, s] of strings(c, w)) problems.push(...mathProblems(where, s))
  }

  // Learners shouldn't be able to game multiple-answer questions by always ticking the same number of boxes.
  const multi = concepts.flatMap((c) => (c.questions ?? []).filter((q) => q.type === 'multiple'))
  if (multi.length >= 5) {
    const counts = {}
    for (const q of multi) { const k = `${q.answer.length} of ${(q.options ?? []).length}`; counts[k] = (counts[k] ?? 0) + 1 }
    const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (n / multi.length > 0.6) problems.push(`multiple-answer questions are too predictable: ${n}/${multi.length} have exactly ${top} correct. Vary the number of correct options (e.g. 2 of 4, 3 of 4, 2 of 5, 4 of 5) so no pattern exceeds 60%: ${JSON.stringify(counts)}`)
  }

  if (problems.length) {
    console.error(`\x1b[31m  ${problems.length} problem(s)\x1b[0m in ${file}:`)
    for (const p of problems.slice(0, 60)) console.error(`   - ${p}`)
    process.exit(1)
  }
  const q = concepts.reduce((a, c) => a + c.questions.length, 0)
  console.log(`\x1b[32m  OK\x1b[0m  ${file}: ${concepts.length} concepts, ${concepts.reduce((a, c) => a + c.blocks.length, 0)} blocks, ${q} questions`)
} else if (command === 'merge') {
  const course = loadCourse()
  const dir = flags.dir ?? die('--dir is required')
  const drafts = new Map()
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).concepts ?? []) drafts.set(c.slug, c)
  }
  let merged = 0
  for (const s of course.sections) {
    s.concepts = s.concepts.map((c) => {
      const d = drafts.get(c.slug)
      if (!d) return c
      merged++
      // Keep the outline's slug and title; take everything else from the draft.
      return { slug: c.slug, title: c.title, summary: d.summary ?? c.summary, est_minutes: d.est_minutes ?? c.est_minutes, blocks: d.blocks, questions: d.questions ?? [] }
    })
  }
  parseCourse(course, flags.course)
  fs.writeFileSync(flags.course, JSON.stringify(course, null, 2) + '\n')
  const total = course.sections.reduce((a, s) => a + s.concepts.length, 0)
  console.log(`\x1b[32m  DONE\x1b[0m  merged ${merged}/${total} concepts into ${flags.course}`)
} else {
  die('Commands: check, merge')
}
