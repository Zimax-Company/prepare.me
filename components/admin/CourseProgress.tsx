import Link from 'next/link'
import { courseReport, type Range } from '@/lib/analytics'
import { conceptNumber } from '@/lib/learning'
import { LEVEL_LABEL, LEVELS } from '@/lib/types'
import { BarList, ChartCard, Columns, Kpi, TimeSeries } from './charts'
import { RangePicker } from './RangePicker'
import { InlineMd } from '../Markdown'
import { fmtDate, LevelBadge, ProgressBar } from '../ui'

const fmtMin = (m: number) => (m >= 120 ? `${Math.round(m / 6) / 10} h` : `${m} min`)
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export async function CourseProgress({ courseId, range }: { courseId: number; range: Range }) {
  const r = await courseReport(courseId, range)
  const k = r.kpis
  const sectionIndex = new Map(r.sections.map((s, i) => [s.id, i]))
  const idxInSection = new Map<number, number>()
  const counters = new Map<number | null, number>()
  for (const c of r.funnel) { const s = c.section_id; const i = counters.get(s) ?? 0; idxInSection.set(c.id, i); counters.set(s, i + 1) }
  const num = (c: (typeof r.funnel)[number]) => conceptNumber(c.slug, c.section_id != null ? sectionIndex.get(c.section_id) ?? null : null, idxInSection.get(c.id) ?? 0)
  const funnel = r.funnel.filter((c) => c.eligible > 0)
  const drops = funnel.slice(1).map((c, i) => ({ c, drop: funnel[i].rate - c.rate })).filter((d) => d.drop > 0).sort((a, b) => b.drop - a.drop).slice(0, 5)

  if (!k.enrolled) {
    return <div className="empty">No students are enrolled in this course yet. Progress and usage appear here once they are.</div>
  }

  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <span className="muted small">Usage for the last {range} days · progress is all-time · admins excluded</span>
        <div className="row wrap"><RangePicker value={range} params={{ tab: 'progress' }} /><a className="btn sm" href={`/api/admin/export/courses/${courseId}`}>⬇ CSV</a></div>
      </div>
      <div className="grid grid-4">
        <Kpi label="students enrolled" value={k.enrolled} hint={`${k.finished} finished every lesson at their level`} />
        <Kpi label={`active (${range}d)`} value={k.active} />
        <Kpi label="average progress" value={k.avgProgress} suffix="%" />
        <Kpi label="finished their level" value={k.finished} />
        <Kpi label={`learning time ${range}d (min)`} value={k.minutes} />
        <Kpi label={`lessons completed (${range}d)`} value={k.completions} />
        <Kpi label={`exam avg (${k.examAttempts} attempts)`} value={k.examAvg} suffix="%" />
        <Kpi label="exam pass rate" value={k.passRate} suffix="%" />
      </div>

      <div className="grid-charts">
        <ChartCard title="Active students" caption="Students active in this course each day" table={{ head: ['Day', 'Active'], rows: r.series.active.map((p) => [day(p.date), p.value]) }}>
          <TimeSeries data={r.series.active} unit="active students" />
        </ChartCard>
        <ChartCard title="Learning time" caption="Minutes spent in this course's lessons and exams" table={{ head: ['Day', 'Minutes'], rows: r.series.minutes.map((p) => [day(p.date), p.value]) }}>
          <TimeSeries data={r.series.minutes} unit="minutes" />
        </ChartCard>
        <ChartCard title="Progress distribution" caption="Students by share of lessons completed at their level" table={{ head: ['Progress', 'Students'], rows: r.buckets.map((b) => [b.label, b.value]) }}>
          <Columns data={r.buckets.map((b) => ({ ...b, sub: `${b.label} complete` }))} unit="students" />
        </ChartCard>
        <ChartCard title="Enrolled level" caption="Difficulty chosen at enrolment" table={{ head: ['Level', 'Students'], rows: LEVELS.map((l) => [LEVEL_LABEL[l], r.level[l]]) }}>
          <BarList data={LEVELS.map((l) => ({ label: LEVEL_LABEL[l], value: r.level[l] }))} unit="students" />
        </ChartCard>
      </div>

      <ChartCard
        title="Lesson completion funnel"
        caption="Share of eligible students (their level includes the lesson) who completed each lesson, in course order. Hover a bar for details."
        table={{ head: ['#', 'Lesson', 'Level', 'Eligible', 'Viewed', 'Completed', 'Rate'], rows: r.funnel.map((c) => [num(c), c.title, LEVEL_LABEL[c.level], c.eligible, c.viewed, c.completed, `${c.rate}%`]) }}
      >
        <Columns data={funnel.map((c) => ({ label: num(c), value: c.rate, sub: `${num(c)} ${c.title} · ${c.completed}/${c.eligible} completed, ${c.viewed} viewed` }))} unit="% completed" height={200} showValues={false} />
        {drops.length > 0 && (
          <div className="mt">
            <div className="small" style={{ fontWeight: 700 }}>Steepest drop-offs</div>
            <div className="stack mt" style={{ gap: 6 }}>
              {drops.map(({ c, drop }) => (
                <div key={c.id} className="row small" style={{ gap: 10 }}>
                  <span className="badge danger">−{drop} pts</span><span className="muted">{num(c)}</span><span className="grow">{c.title}</span><span className="muted">{c.rate}% completed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px 8px' }}><div className="card-title" style={{ margin: 0 }}>Hardest questions</div><div className="tiny muted">Lowest share of correct answers across practice and exams (at least 5 answers)</div></div>
        {r.hardest.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th style={{ width: '50%' }}>Question</th><th>Lesson</th><th>Level</th><th>Answers</th><th>Correct</th></tr></thead>
              <tbody>
                {r.hardest.map((q) => (
                  <tr key={q.id}>
                    <td><Link href={`/admin/questions?course=${courseId}`}><InlineMd text={q.prompt.length > 140 ? `${q.prompt.slice(0, 140)}…` : q.prompt} /></Link></td>
                    <td className="small muted">{q.concept ?? '—'}</td>
                    <td><LevelBadge level={q.level} /></td>
                    <td>{q.answered}</td>
                    <td><b>{q.accuracy}%</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="muted small" style={{ padding: 20 }}>Not enough answers yet (each question needs at least 5).</div>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: '16px 20px 8px' }}>Students in this course</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Level</th><th style={{ width: 200 }}>Progress</th><th>Learning time</th><th>Exams</th><th className="hide-sm">Enrolled</th><th className="hide-sm">Last active</th></tr></thead>
            <tbody>
              {r.students.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/students/${s.id}`} style={{ fontWeight: 600 }}>{s.name}</Link><div className="tiny muted">{s.email}</div></td>
                  <td><LevelBadge level={s.level} /></td>
                  <td><div className="row" style={{ gap: 8 }}><div className="grow"><ProgressBar value={s.percent} thin success={s.percent === 100} /></div><span className="small">{s.done}/{s.eligible}</span></div></td>
                  <td>{fmtMin(s.minutes)}</td>
                  <td>{s.attempts ? <>{s.attempts} <span className="tiny muted">best {s.best}%</span></> : '—'}</td>
                  <td className="small muted hide-sm">{fmtDate(s.enrolledAt)}</td>
                  <td className="small muted hide-sm">{fmtDate(s.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
