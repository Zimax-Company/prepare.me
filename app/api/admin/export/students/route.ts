import { NextResponse } from 'next/server'
import { handle } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { studentTable, toCsv } from '@/lib/analytics'

export const GET = handle(async (req) => {
  await requireAdmin(req)
  const rows = await studentTable({ sort: 'name' })
  const csv = toCsv(rows.map((r) => ({
    name: r.name, email: r.email, joined: r.joined, last_active: r.lastActive, active_account: r.isActive ? 'yes' : 'no',
    courses: r.courses, avg_progress_pct: r.avgProgress, lessons_completed: r.completions,
    learning_minutes_30d: r.minutes, learning_minutes_total: r.minutesAll, exams_submitted: r.exams, exam_avg_pct: r.examAvg,
  })))
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"` } })
})
