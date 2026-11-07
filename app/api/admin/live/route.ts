import { db } from '@/lib/db'
import { handle, ok } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'

/** Polled by the admin dashboard for a live activity view (Vercel functions can't hold sockets). */
export const GET = handle(async (req) => {
  await requireAdmin(req)
  const now = new Date()
  const [students, inProgress, today, avg, recent] = await Promise.all([
    db('users').where({ role: 'student' }).count({ n: '*' }).first(),
    db('exam_attempts').whereNull('submitted_at').where('expires_at', '>', now).count({ n: '*' }).first(),
    db('exam_attempts').where('started_at', '>', new Date(now.getTime() - 86_400_000)).count({ n: '*' }).first(),
    db('exam_attempts').whereNotNull('submitted_at').avg({ p: 'percent' }).first(),
    db('exam_attempts as a')
      .join('users as u', 'u.id', 'a.user_id')
      .join('courses as c', 'c.id', 'a.course_id')
      .select('a.id', 'u.name', 'c.title', 'c.icon', 'a.level', 'a.started_at', 'a.expires_at', 'a.submitted_at', 'a.score', 'a.total', 'a.percent', 'a.passed')
      .orderBy('a.id', 'desc')
      .limit(12),
  ])
  return ok({
    at: now.toISOString(),
    students: Number(students?.n ?? 0),
    in_progress: Number(inProgress?.n ?? 0),
    attempts_24h: Number(today?.n ?? 0),
    avg_percent: avg?.p == null ? null : Math.round(Number(avg.p)),
    recent: recent.map((r) => ({ ...r, live: !r.submitted_at && new Date(r.expires_at) > now })),
  })
})
