import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { handle, id, notFound } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { courseReport, toCsv } from '@/lib/analytics'

export const GET = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const courseId = id(params.id, 'Course')
  const course = await db('courses').where({ id: courseId }).first('slug')
  if (!course) throw notFound('Course')
  const r = await courseReport(courseId, 30)
  const csv = toCsv(r.students.map((s) => ({
    name: s.name, email: s.email, level: s.level, progress_pct: s.percent, lessons_completed: s.done, lessons_at_level: s.eligible,
    learning_minutes_total: s.minutes, exam_attempts: s.attempts, best_exam_pct: s.best, enrolled: s.enrolledAt, last_active: s.lastActive,
  })))
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${course.slug}-progress-${new Date().toISOString().slice(0, 10)}.csv"` } })
})
