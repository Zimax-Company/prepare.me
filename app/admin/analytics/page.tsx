import Link from 'next/link'
import { overview, parseRange } from '@/lib/analytics'
import { ChartCard, Kpi, TimeSeries } from '@/components/admin/charts'
import { RangePicker } from '@/components/admin/RangePicker'
import { fmtDate, ProgressBar } from '@/components/ui'

export const metadata = { title: 'Analytics' }

const fmtMin = (m: number) => (m >= 120 ? `${Math.round(m / 6) / 10} h` : `${m} min`)
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range)
  const o = await overview(range)
  const k = o.kpis
  const series = [
    { key: 'active', title: 'Active students', unit: 'active students', caption: 'Students with any activity or learning time that day' },
    { key: 'minutes', title: 'Learning time', unit: 'minutes', caption: 'Minutes actively spent in lessons and exams' },
    { key: 'completions', title: 'Lessons completed', unit: 'lessons completed', caption: 'Concepts marked complete' },
    { key: 'exams', title: 'Exams submitted', unit: 'exams', caption: 'Including auto-submitted on timeout' },
  ] as const

  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div><h1 style={{ margin: 0 }}>Usage analytics</h1><p className="muted" style={{ margin: 0 }}>How students are using the platform. Admin accounts are excluded.</p></div>
        <div className="row wrap"><RangePicker value={range} /><a className="btn sm" href="/api/admin/export/students">⬇ Students CSV</a></div>
      </div>

      <div className="grid grid-4">
        <Kpi label={`active students (${range}d)`} value={k.active.value} prev={k.active.prev} hint={`of ${k.totalStudents} students in total`} />
        <Kpi label="learning time (minutes)" value={k.minutes.value} prev={k.minutes.prev} />
        <Kpi label="lessons completed" value={k.completions.value} prev={k.completions.prev} />
        <Kpi label="exams submitted" value={k.exams.value} prev={k.exams.prev} />
        <Kpi label="new students" value={k.newStudents.value} prev={k.newStudents.prev} hint={`${k.totalStudents} students in total`} />
        <Kpi label="new enrolments" value={k.enrolls.value} prev={k.enrolls.prev} />
        <Kpi label={`practice accuracy (${k.practiceAnswers} answers)`} value={k.practiceAccuracy} suffix="%" />
        <Kpi label={`exam avg · pass rate ${k.examPassRate ?? '—'}%`} value={k.examAvg} suffix="%" />
      </div>

      <div className="grid-charts">
        {series.map((s) => (
          <ChartCard key={s.key} title={s.title} caption={s.caption} table={{ head: ['Day', s.unit], rows: o.series[s.key].map((p) => [day(p.date), p.value]) }}>
            <TimeSeries data={o.series[s.key]} unit={s.unit} />
          </ChartCard>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '16px 20px 8px' }}><div className="card-title" style={{ margin: 0 }}>Courses</div><span className="tiny muted">activity in the last {range} days · progress is all-time</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Course</th><th>Enrolled</th><th>Active</th><th>Learning time</th><th>Lessons done</th><th style={{ width: 180 }}>Avg progress</th><th></th></tr></thead>
            <tbody>
              {o.courses.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.icon} {c.title} {!c.published && <span className="badge">Draft</span>}</td>
                  <td>{c.enrolled}</td>
                  <td>{c.active}</td>
                  <td>{fmtMin(c.minutes)}</td>
                  <td>{c.completions}</td>
                  <td>{c.avgProgress === null ? <span className="muted">—</span> : <div className="row" style={{ gap: 8 }}><div className="grow"><ProgressBar value={c.avgProgress} thin /></div><span className="small">{c.avgProgress}%</span></div>}</td>
                  <td><Link className="btn sm ghost" href={`/admin/courses/${c.id}?tab=progress`}>Progress →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '16px 20px 8px' }}><div className="card-title" style={{ margin: 0 }}>Most active students</div><Link href="/admin/students" className="btn sm ghost">All students →</Link></div>
        {o.topStudents.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Student</th><th>Learning time ({range}d)</th><th>Lessons done</th><th>Courses</th><th>Avg progress</th><th className="hide-sm">Last active</th></tr></thead>
              <tbody>
                {o.topStudents.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/admin/students/${s.id}`} style={{ fontWeight: 600 }}>{s.name}</Link><div className="tiny muted">{s.email}</div></td>
                    <td>{fmtMin(s.minutes)}</td>
                    <td>{s.completions}</td>
                    <td>{s.courses}</td>
                    <td>{s.avgProgress === null ? '—' : `${s.avgProgress}%`}</td>
                    <td className="small muted hide-sm">{fmtDate(s.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="muted small" style={{ padding: 20 }}>No student activity in this period yet.</div>}
      </div>
    </div>
  )
}
