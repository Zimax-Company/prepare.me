// Admin analytics. Students only: admins previewing courses never count.
import { db, json } from './db'
import { isCorrect } from './grading'
import { getConcepts, getSections, toQuestion } from './learning'
import { levelsUpTo, type Level } from './types'

const DAY = 86_400_000
export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]
export const parseRange = (v?: string): Range => (RANGES.includes(Number(v) as Range) ? (Number(v) as Range) : 30)

const iso = (d: Date) => d.toISOString().slice(0, 10)
const since = (days: number) => new Date(Date.now() - days * DAY)
const n = (v: unknown) => Number(v ?? 0)

/** Every day in the window as YYYY-MM-DD, oldest first (UTC). */
export function dayList(days: number) {
  const out: string[] = []
  const today = new Date(iso(new Date()))
  for (let i = days - 1; i >= 0; i--) out.push(iso(new Date(today.getTime() - i * DAY)))
  return out
}

const students = () => db('users').where({ role: 'student' })
const studentEvents = () => db('activity_events as e').join('users as u', 'u.id', 'e.user_id').where('u.role', 'student')
const studentUsage = () => db('daily_usage as d').join('users as u', 'u.id', 'd.user_id').where('u.role', 'student')

export type SeriesPoint = { date: string; value: number }
const fill = (days: string[], rows: { day: unknown; v: unknown }[]): SeriesPoint[] => {
  const map = new Map(rows.map((r) => [String(r.day instanceof Date ? iso(r.day) : r.day).slice(0, 10), n(r.v)]))
  return days.map((date) => ({ date, value: map.get(date) ?? 0 }))
}

/** Distinct active students per day: anyone with an event or learning time that day. */
async function activePerDay(from: Date, courseId?: number) {
  const ev = studentEvents().where('e.created_at', '>=', from).select(db.raw('DATE(e.created_at) as day'), 'e.user_id as user_id')
  const us = studentUsage().where('d.day', '>=', iso(from)).select('d.day as day', 'd.user_id as user_id')
  if (courseId) { ev.where('e.course_id', courseId); us.where('d.course_id', courseId) }
  const rows = (await db.select('day').countDistinct({ v: 'user_id' }).from(db.union([ev, us], true).as('a')).groupBy('day')) as any[]
  return rows
}

async function activeCount(from: Date, to: Date = new Date(), courseId?: number) {
  const ev = studentEvents().whereBetween('e.created_at', [from, to]).select('e.user_id as user_id')
  const us = studentUsage().whereBetween('d.day', [iso(from), iso(to)]).select('d.user_id as user_id')
  if (courseId) { ev.where('e.course_id', courseId); us.where('d.course_id', courseId) }
  const r = (await db.countDistinct({ v: 'user_id' }).from(db.union([ev, us], true).as('a')).first()) as any
  return n(r?.v)
}

async function eventCount(type: string, from: Date, to: Date = new Date(), courseId?: number) {
  const q = studentEvents().where('e.type', type).whereBetween('e.created_at', [from, to])
  if (courseId) q.where('e.course_id', courseId)
  return n(((await q.count({ v: '*' }).first()) as any)?.v)
}

async function minutes(from: Date, to: Date = new Date(), courseId?: number) {
  const q = studentUsage().whereBetween('d.day', [iso(from), iso(to)])
  if (courseId) q.where('d.course_id', courseId)
  return Math.round(n(((await q.sum({ v: 'd.seconds' }).first()) as any)?.v) / 60)
}

/** Value now and over the equal-length period before it, for "vs previous period" deltas. */
async function withPrev(fn: (from: Date, to: Date) => Promise<number>, days: number) {
  const now = new Date()
  const from = since(days)
  const [cur, prev] = await Promise.all([fn(from, now), fn(new Date(from.getTime() - days * DAY), from)])
  return { value: cur, prev }
}

// ---- Overview ------------------------------------------------------------------------------

export async function overview(days: Range) {
  const from = since(days)
  const dl = dayList(days)
  const [totalStudents, newStudents, active, mins, completions, exams, practice, examStats, enrolls] = await Promise.all([
    students().count({ v: '*' }).first().then((r: any) => n(r?.v)),
    withPrev((a, b) => students().whereBetween('created_at', [a, b]).count({ v: '*' }).first().then((r: any) => n(r?.v)), days),
    withPrev((a, b) => activeCount(a, b), days),
    withPrev((a, b) => minutes(a, b), days),
    withPrev((a, b) => eventCount('complete_concept', a, b), days),
    withPrev((a, b) => eventCount('exam_submit', a, b), days),
    studentEvents().where('e.type', 'practice_answer').where('e.created_at', '>=', from).select('e.meta'),
    db('exam_attempts as a').join('users as u', 'u.id', 'a.user_id').where('u.role', 'student').whereNotNull('a.submitted_at').where('a.submitted_at', '>=', from)
      .avg({ avg: 'a.percent' }).sum({ passed: 'a.passed' }).count({ c: '*' }).first(),
    withPrev((a, b) => eventCount('enroll', a, b), days),
  ])
  const games = await withPrev((a, b) => db('game_sessions as g').join('users as u', 'u.id', 'g.user_id').where('u.role', 'student').whereNotNull('g.ended_at').whereBetween('g.started_at', [a, b]).count({ v: '*' }).first().then((r: any) => n(r?.v)), days)
  const practiceCorrect = practice.filter((r: any) => json<{ correct?: boolean }>(r.meta, {}).correct).length

  const [activeRows, minuteRows, completionRows, examRows] = await Promise.all([
    activePerDay(from),
    studentUsage().where('d.day', '>=', iso(from)).groupBy('d.day').select('d.day as day').sum({ v: 'd.seconds' }),
    studentEvents().where('e.type', 'complete_concept').where('e.created_at', '>=', from).groupByRaw('DATE(e.created_at)').select(db.raw('DATE(e.created_at) as day')).count({ v: '*' }),
    studentEvents().where('e.type', 'exam_submit').where('e.created_at', '>=', from).groupByRaw('DATE(e.created_at)').select(db.raw('DATE(e.created_at) as day')).count({ v: '*' }),
  ])

  return {
    days,
    kpis: {
      totalStudents,
      newStudents,
      active,
      minutes: mins,
      completions,
      exams,
      enrolls,
      games,
      practiceAnswers: practice.length,
      practiceAccuracy: practice.length ? Math.round((practiceCorrect / practice.length) * 100) : null,
      examAvg: (examStats as any)?.c ? Math.round(n((examStats as any).avg)) : null,
      examPassRate: (examStats as any)?.c ? Math.round((n((examStats as any).passed) / n((examStats as any).c)) * 100) : null,
    },
    series: {
      active: fill(dl, activeRows),
      minutes: fill(dl, (minuteRows as any[]).map((r) => ({ day: r.day, v: Math.round(n(r.v) / 60) }))),
      completions: fill(dl, completionRows as any[]),
      exams: fill(dl, examRows as any[]),
    },
    courses: await courseTable(from),
    topStudents: await studentTable({ from, limit: 10, sort: 'minutes' }),
  }
}

/** Per-course activity in the window plus all-time progress. */
async function courseTable(from: Date) {
  const courses = await db('courses').select('id', 'title', 'icon', 'slug', 'published').orderBy('title')
  const [enrolled, active, mins, completions] = await Promise.all([
    db('enrollments as e').join('users as u', 'u.id', 'e.user_id').where('u.role', 'student').groupBy('e.course_id').select('e.course_id').count({ v: '*' }),
    db.select('course_id').countDistinct({ v: 'user_id' }).from(db.union([
      studentEvents().where('e.created_at', '>=', from).whereNotNull('e.course_id').select('e.course_id as course_id', 'e.user_id as user_id'),
      studentUsage().where('d.day', '>=', iso(from)).select('d.course_id as course_id', 'd.user_id as user_id'),
    ], true).as('a')).groupBy('course_id'),
    studentUsage().where('d.day', '>=', iso(from)).groupBy('d.course_id').select('d.course_id').sum({ v: 'd.seconds' }),
    studentEvents().where('e.type', 'complete_concept').where('e.created_at', '>=', from).groupBy('e.course_id').select('e.course_id').count({ v: '*' }),
  ])
  const by = (rows: any[], f = (x: number) => x) => new Map(rows.map((r) => [n(r.course_id), f(n(r.v))]))
  const [en, ac, mi, co] = [by(enrolled), by(active as any[]), by(mins as any[], (s) => Math.round(s / 60)), by(completions as any[])]
  const progress = await avgProgressByCourse()
  return courses.map((c) => ({
    id: n(c.id), title: c.title as string, icon: c.icon as string, slug: c.slug as string, published: !!c.published,
    enrolled: en.get(n(c.id)) ?? 0, active: ac.get(n(c.id)) ?? 0, minutes: mi.get(n(c.id)) ?? 0, completions: co.get(n(c.id)) ?? 0,
    avgProgress: progress.get(n(c.id)) ?? null,
  }))
}

/** Average completion % per course across enrolled students (concepts visible at each student's level). */
async function avgProgressByCourse() {
  const rows = await progressRows()
  const acc = new Map<number, { sum: number; n: number }>()
  for (const r of rows) {
    const a = acc.get(r.course_id) ?? { sum: 0, n: 0 }
    a.sum += r.percent
    a.n++
    acc.set(r.course_id, a)
  }
  return new Map([...acc].map(([k, v]) => [k, Math.round(v.sum / v.n)]))
}

/** One row per student enrollment: done / eligible concepts and percent. */
async function progressRows(filter: { courseId?: number; userId?: number } = {}) {
  const enr = db('enrollments as e').join('users as u', 'u.id', 'e.user_id').where('u.role', 'student').select('e.user_id', 'e.course_id', 'e.level', 'e.enrolled_at', 'e.last_activity_at')
  if (filter.courseId) enr.where('e.course_id', filter.courseId)
  if (filter.userId) enr.where('e.user_id', filter.userId)
  const enrollments = await enr
  if (!enrollments.length) return []
  const courseIds = [...new Set(enrollments.map((e) => n(e.course_id)))]
  const concepts = await db('concepts').whereIn('course_id', courseIds).select('id', 'course_id', 'level')
  const userIds = [...new Set(enrollments.map((e) => n(e.user_id)))]
  const done = await db('concept_progress').whereIn('user_id', userIds).whereNotNull('completed_at').select('user_id', 'concept_id')
  const doneSet = new Set(done.map((d) => `${d.user_id}:${d.concept_id}`))
  return enrollments.map((e) => {
    const eligible = concepts.filter((c) => n(c.course_id) === n(e.course_id) && levelsUpTo(e.level as Level).includes(c.level))
    const completed = eligible.filter((c) => doneSet.has(`${e.user_id}:${c.id}`)).length
    return {
      user_id: n(e.user_id), course_id: n(e.course_id), level: e.level as Level,
      enrolled_at: e.enrolled_at as Date, last_activity_at: e.last_activity_at as Date | null,
      done: completed, eligible: eligible.length, percent: eligible.length ? Math.round((completed / eligible.length) * 100) : 0,
    }
  })
}

// ---- Students --------------------------------------------------------------------------------

export type StudentRow = {
  id: number; name: string; email: string; joined: Date; isActive: boolean
  lastActive: Date | null; courses: number; avgProgress: number | null
  minutes: number; minutesAll: number; completions: number; exams: number; examAvg: number | null
}

export async function studentTable({ from = since(30), limit, sort = 'lastActive', q }: { from?: Date; limit?: number; sort?: 'minutes' | 'lastActive' | 'name'; q?: string } = {}): Promise<StudentRow[]> {
  const uq = students().select('id', 'name', 'email', 'created_at', 'is_active')
  if (q) uq.where((w) => w.whereILike('name', `%${q}%`).orWhereILike('email', `%${q}%`))
  const users = await uq
  if (!users.length) return []
  const ids = users.map((u) => n(u.id))
  const [last, minsRange, minsAll, comp, exams, prog] = await Promise.all([
    db('activity_events').whereIn('user_id', ids).groupBy('user_id').select('user_id').max({ v: 'created_at' }),
    db('daily_usage').whereIn('user_id', ids).where('day', '>=', iso(from)).groupBy('user_id').select('user_id').sum({ v: 'seconds' }),
    db('daily_usage').whereIn('user_id', ids).groupBy('user_id').select('user_id').sum({ v: 'seconds' }),
    db('concept_progress').whereIn('user_id', ids).whereNotNull('completed_at').groupBy('user_id').select('user_id').count({ v: '*' }),
    db('exam_attempts').whereIn('user_id', ids).whereNotNull('submitted_at').groupBy('user_id').select('user_id').count({ c: '*' }).avg({ v: 'percent' }),
    progressRows(),
  ])
  const by = (rows: any[], key = 'v') => new Map(rows.map((r) => [n(r.user_id), r[key]]))
  const [L, MR, MA, C, E] = [by(last), by(minsRange as any[]), by(minsAll as any[]), by(comp), by(exams)]
  const progByUser = new Map<number, number[]>()
  for (const p of prog) progByUser.set(p.user_id, [...(progByUser.get(p.user_id) ?? []), p.percent])
  const rows: StudentRow[] = users.map((u) => {
    const id = n(u.id)
    const ps = progByUser.get(id) ?? []
    const ex = (exams as any[]).find((r) => n(r.user_id) === id)
    return {
      id, name: u.name, email: u.email, joined: u.created_at, isActive: !!u.is_active,
      lastActive: L.get(id) ? new Date(L.get(id)) : null,
      courses: ps.length, avgProgress: ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null,
      minutes: Math.round(n(MR.get(id)) / 60), minutesAll: Math.round(n(MA.get(id)) / 60),
      completions: n(C.get(id)), exams: n(ex?.c), examAvg: ex?.c ? Math.round(n(E.get(id))) : null,
    }
  })
  const cmp = {
    minutes: (a: StudentRow, b: StudentRow) => b.minutes - a.minutes || b.completions - a.completions,
    lastActive: (a: StudentRow, b: StudentRow) => (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0),
    name: (a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name),
  }[sort]
  rows.sort(cmp)
  return limit ? rows.filter((r) => sort !== 'minutes' || r.minutes > 0 || r.completions > 0).slice(0, limit) : rows
}

export async function studentReport(userId: number) {
  const user = await db('users').where({ id: userId }).first()
  if (!user) return null
  const dl = dayList(84)
  const from = since(84)
  const [prog, usage, eventsPerDay, attempts, recent, practice, courses, minsByCourse, lastByCourse] = await Promise.all([
    progressRows({ userId }),
    db('daily_usage').where({ user_id: userId }).where('day', '>=', iso(from)).groupBy('day').select('day').sum({ v: 'seconds' }),
    db('activity_events').where({ user_id: userId }).where('created_at', '>=', from).groupByRaw('DATE(created_at)').select(db.raw('DATE(created_at) as day')).count({ v: '*' }),
    db('exam_attempts as a').join('courses as c', 'c.id', 'a.course_id').where('a.user_id', userId).orderBy('a.id', 'desc').limit(25)
      .select('a.id', 'a.level', 'a.started_at', 'a.submitted_at', 'a.score', 'a.total', 'a.percent', 'a.passed', 'c.title', 'c.icon'),
    db('activity_events as e').leftJoin('courses as c', 'c.id', 'e.course_id').leftJoin('concepts as k', 'k.id', 'e.concept_id').where('e.user_id', userId)
      .orderBy('e.id', 'desc').limit(40).select('e.type', 'e.meta', 'e.created_at', 'c.title as course', 'c.icon', 'k.title as concept'),
    db('activity_events').where({ user_id: userId, type: 'practice_answer' }).select('meta'),
    db('courses').select('id', 'title', 'icon', 'slug'),
    db('daily_usage').where({ user_id: userId }).groupBy('course_id').select('course_id').sum({ v: 'seconds' }),
    db('activity_events').where({ user_id: userId }).whereNotNull('course_id').groupBy('course_id').select('course_id').max({ v: 'created_at' }),
  ])
  const courseById = new Map(courses.map((c) => [n(c.id), c]))
  const minByCourse = new Map((minsByCourse as any[]).map((r) => [n(r.course_id), Math.round(n(r.v) / 60)]))
  const lastCourse = new Map((lastByCourse as any[]).map((r) => [n(r.course_id), r.v ? new Date(r.v) : null]))
  const allAttempts = await db('exam_attempts').where({ user_id: userId }).whereNotNull('submitted_at').select('course_id', 'percent', 'passed')
  const minutesMap = new Map((usage as any[]).map((r) => [String(r.day instanceof Date ? iso(r.day) : r.day).slice(0, 10), Math.round(n(r.v) / 60)]))
  const eventsMap = new Map((eventsPerDay as any[]).map((r) => [String(r.day instanceof Date ? iso(r.day) : r.day).slice(0, 10), n(r.v)]))
  const pc = practice.filter((r) => json<{ correct?: boolean }>(r.meta, {}).correct).length
  const totalMinutes = [...minByCourse.values()].reduce((a, b) => a + b, 0)
  const last = recent[0]?.created_at ? new Date(recent[0].created_at) : null

  return {
    user: { id: n(user.id), name: user.name as string, email: user.email as string, joined: user.created_at as Date, isActive: !!user.is_active, role: user.role as string },
    totals: {
      minutes: totalMinutes,
      minutes7: dl.slice(-7).reduce((a, d) => a + (minutesMap.get(d) ?? 0), 0),
      activeDays84: dl.filter((d) => (minutesMap.get(d) ?? 0) > 0 || (eventsMap.get(d) ?? 0) > 0).length,
      completions: prog.reduce((a, p) => a + p.done, 0),
      practiceAnswers: practice.length,
      practiceAccuracy: practice.length ? Math.round((pc / practice.length) * 100) : null,
      exams: allAttempts.length,
      examsPassed: allAttempts.filter((a) => a.passed).length,
      examAvg: allAttempts.length ? Math.round(allAttempts.reduce((a, x) => a + n(x.percent), 0) / allAttempts.length) : null,
      lastActive: last,
    },
    courses: prog.map((p) => {
      const c = courseById.get(p.course_id)
      const ats = allAttempts.filter((a) => n(a.course_id) === p.course_id)
      return {
        ...p, title: c?.title as string, icon: c?.icon as string, slug: c?.slug as string,
        minutes: minByCourse.get(p.course_id) ?? 0,
        lastActive: lastCourse.get(p.course_id) ?? p.last_activity_at,
        attempts: ats.length, best: ats.length ? Math.round(Math.max(...ats.map((a) => n(a.percent)))) : null,
      }
    }),
    heatmap: dl.map((date) => ({ date, minutes: minutesMap.get(date) ?? 0, events: eventsMap.get(date) ?? 0 })),
    attempts: attempts.map((a) => ({ ...a, percent: a.percent == null ? null : n(a.percent) })),
    recent: recent.map((r) => ({ type: r.type as string, meta: json<Record<string, unknown>>(r.meta, {}), at: new Date(r.created_at), course: r.course as string | null, icon: r.icon as string | null, concept: r.concept as string | null })),
  }
}

// ---- Course progress report ---------------------------------------------------------------

export async function courseReport(courseId: number, days: Range) {
  const from = since(days)
  const dl = dayList(days)
  const [concepts, sections, rows, users] = await Promise.all([
    getConcepts(courseId),
    getSections(courseId),
    progressRows({ courseId }),
    students().select('id', 'name', 'email'),
  ])
  const userById = new Map(users.map((u) => [n(u.id), u]))
  const enrolled = rows.length

  // Funnel: of the students whose level includes a concept, how many viewed / completed it.
  const progress = enrolled
    ? await db('concept_progress').whereIn('user_id', rows.map((r) => r.user_id)).whereIn('concept_id', concepts.map((c) => c.id)).select('user_id', 'concept_id', 'viewed_at', 'completed_at')
    : []
  const funnel = concepts.map((c) => {
    const eligible = rows.filter((r) => levelsUpTo(r.level).includes(c.level))
    const elig = new Set(eligible.map((r) => r.user_id))
    const ps = progress.filter((p) => n(p.concept_id) === c.id && elig.has(n(p.user_id)))
    const completed = ps.filter((p) => p.completed_at).length
    return {
      id: c.id, slug: c.slug, title: c.title, level: c.level, section_id: c.section_id,
      eligible: eligible.length, viewed: ps.filter((p) => p.viewed_at).length, completed,
      rate: eligible.length ? Math.round((completed / eligible.length) * 100) : 0,
    }
  })

  const buckets = [
    { label: '0%', min: 0, max: 0 }, { label: '1–25%', min: 1, max: 25 }, { label: '26–50%', min: 26, max: 50 },
    { label: '51–75%', min: 51, max: 75 }, { label: '76–99%', min: 76, max: 99 }, { label: '100%', min: 100, max: 100 },
  ].map((b) => ({ label: b.label, value: rows.filter((r) => r.percent >= b.min && r.percent <= b.max).length }))

  // Exams + hardest questions (exam answers graded from attempts, plus practice answers).
  const attempts = await db('exam_attempts as a').join('users as u', 'u.id', 'a.user_id').where('u.role', 'student')
    .where('a.course_id', courseId).whereNotNull('a.submitted_at').select('a.user_id', 'a.level', 'a.percent', 'a.passed', 'a.question_ids', 'a.answers', 'a.submitted_at')
  const qStats = new Map<number, { right: number; total: number }>()
  const bump = (id: number, ok: boolean) => { const s = qStats.get(id) ?? { right: 0, total: 0 }; s.total++; if (ok) s.right++; qStats.set(id, s) }
  const questionRows = await db('questions').where({ course_id: courseId })
  const qById = new Map(questionRows.map((r) => [n(r.id), toQuestion(r)]))
  for (const a of attempts) {
    const answers = json<Record<string, string[]>>(a.answers, {})
    for (const id of json<number[]>(a.question_ids, [])) { const q = qById.get(id); if (q) bump(id, isCorrect(q, answers[id])) }
  }
  const practice = await studentEvents().where('e.type', 'practice_answer').where('e.course_id', courseId).select('e.meta')
  for (const p of practice) { const m = json<{ questionId?: number; correct?: boolean }>(p.meta, {}); if (m.questionId && qById.has(m.questionId)) bump(m.questionId, !!m.correct) }
  const conceptTitle = new Map(concepts.map((c) => [c.id, c.title]))
  const hardest = [...qStats].filter(([, s]) => s.total >= 5).map(([id, s]) => ({
    id, prompt: qById.get(id)!.prompt, concept: qById.get(id)!.concept_id ? conceptTitle.get(qById.get(id)!.concept_id!) ?? null : null,
    level: qById.get(id)!.level, answered: s.total, accuracy: Math.round((s.right / s.total) * 100),
  })).sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered).slice(0, 10)

  const bestByUser = new Map<number, { best: number; attempts: number }>()
  for (const a of attempts) {
    const b = bestByUser.get(n(a.user_id)) ?? { best: 0, attempts: 0 }
    b.attempts++
    b.best = Math.max(b.best, Math.round(n(a.percent)))
    bestByUser.set(n(a.user_id), b)
  }
  const [minsAll, lastAct, minuteRows, activeRows, active, minsRange, compRange] = await Promise.all([
    db('daily_usage').where({ course_id: courseId }).groupBy('user_id').select('user_id').sum({ v: 'seconds' }),
    db('activity_events').where({ course_id: courseId }).groupBy('user_id').select('user_id').max({ v: 'created_at' }),
    studentUsage().where('d.course_id', courseId).where('d.day', '>=', iso(from)).groupBy('d.day').select('d.day as day').sum({ v: 'd.seconds' }),
    activePerDay(from, courseId),
    activeCount(from, new Date(), courseId),
    minutes(from, new Date(), courseId),
    eventCount('complete_concept', from, new Date(), courseId),
  ])
  const MA = new Map((minsAll as any[]).map((r) => [n(r.user_id), Math.round(n(r.v) / 60)]))
  const LA = new Map((lastAct as any[]).map((r) => [n(r.user_id), r.v ? new Date(r.v) : null]))

  const level = { beginner: 0, intermediate: 0, advanced: 0 } as Record<Level, number>
  for (const r of rows) level[r.level]++
  const recentAttempts = attempts.filter((a) => new Date(a.submitted_at) >= from)

  return {
    days,
    sections: sections.map((s) => ({ id: s.id, title: s.title })),
    kpis: {
      enrolled, active, minutes: minsRange, completions: compRange,
      avgProgress: enrolled ? Math.round(rows.reduce((a, r) => a + r.percent, 0) / enrolled) : null,
      finished: rows.filter((r) => r.percent === 100).length,
      examAttempts: recentAttempts.length,
      examAvg: recentAttempts.length ? Math.round(recentAttempts.reduce((a, x) => a + n(x.percent), 0) / recentAttempts.length) : null,
      passRate: recentAttempts.length ? Math.round((recentAttempts.filter((a) => a.passed).length / recentAttempts.length) * 100) : null,
    },
    level,
    buckets,
    funnel,
    hardest,
    series: {
      active: fill(dl, activeRows),
      minutes: fill(dl, (minuteRows as any[]).map((r) => ({ day: r.day, v: Math.round(n(r.v) / 60) }))),
    },
    students: rows.map((r) => ({
      id: r.user_id, name: userById.get(r.user_id)?.name as string, email: userById.get(r.user_id)?.email as string,
      level: r.level, percent: r.percent, done: r.done, eligible: r.eligible, enrolledAt: r.enrolled_at,
      minutes: MA.get(r.user_id) ?? 0, lastActive: LA.get(r.user_id) ?? r.last_activity_at,
      attempts: bestByUser.get(r.user_id)?.attempts ?? 0, best: bestByUser.get(r.user_id)?.best ?? null,
    })).sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name)),
  }
}

// ---- CSV -------------------------------------------------------------------------------------

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v)
    // Neutralise spreadsheet formula injection, then quote.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}
