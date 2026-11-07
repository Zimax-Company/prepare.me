import Link from 'next/link'
import { notFound } from 'next/navigation'
import { studentReport } from '@/lib/analytics'
import { goalStatus } from '@/lib/streaks'
import { Heatmap, Kpi } from '@/components/admin/charts'
import { UserActions } from '@/components/admin/UserActions'
import { fmtDate, LevelBadge, ProgressBar } from '@/components/ui'

export const metadata = { title: 'Student' }

const fmtMin = (m: number) => (m >= 120 ? `${Math.round(m / 6) / 10} h` : `${m} min`)
const EVENT: Record<string, string> = {
  login: '🔑 Logged in', register: '✨ Signed up', enroll: '📚 Enrolled', view_concept: '👀 Viewed', complete_concept: '✅ Completed',
  practice_answer: '💬 Practice', exam_start: '⏱ Started exam', exam_submit: '📝 Submitted exam',
}

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const r = Number.isSafeInteger(id) ? await studentReport(id) : null
  if (!r) notFound()
  const goal = await goalStatus(r.user.id)
  const t = r.totals
  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div>
          <Link href="/admin/students" className="small muted">← Students</Link>
          <h1 style={{ margin: '4px 0 0' }}>{r.user.name} {!r.user.isActive && <span className="badge danger">inactive</span>}</h1>
          <div className="muted small">{r.user.email} · joined {fmtDate(r.user.joined)} · last active {t.lastActive ? fmtDate(t.lastActive) : 'never'}</div>
        </div>
        <UserActions id={r.user.id} role={r.user.role} active={r.user.isActive} self={false} />
      </div>

      <div className="grid grid-4">
        <Kpi label="total learning time (min)" value={t.minutes} hint={`${t.minutes7} min in the last 7 days`} />
        <Kpi label="active days (last 12 weeks)" value={t.activeDays84} />
        <Kpi label="lessons completed" value={t.completions} />
        <Kpi label={`practice accuracy (${t.practiceAnswers} answers)`} value={t.practiceAccuracy} suffix="%" />
        <Kpi label={`exams · ${t.examsPassed} passed`} value={t.exams} />
        <Kpi label="average exam score" value={t.examAvg} suffix="%" />
        {goal && <Kpi label={`day streak · best ${goal.longest}`} value={goal.streak} hint={`Goal: ${goal.target} ${goal.kind}/day · today ${goal.progress}/${goal.target}`} />}
        {goal && <Kpi label={`today vs goal (${goal.target} ${goal.kind === 'minutes' ? 'min' : 'lessons'})`} value={goal.progress} />}
      </div>

      <div className="card">
        <div className="card-title">Activity, last 12 weeks</div>
        <div className="tiny muted mb">Shade = minutes of learning that day. The lightest shade means activity with no tracked learning time.</div>
        <Heatmap data={r.heatmap} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: '16px 20px 8px' }}>Courses</div>
        {r.courses.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Course</th><th>Level</th><th style={{ width: 200 }}>Progress</th><th>Learning time</th><th>Exams</th><th className="hide-sm">Last active</th></tr></thead>
              <tbody>
                {r.courses.map((c) => (
                  <tr key={c.course_id}>
                    <td style={{ fontWeight: 600 }}><Link href={`/admin/courses/${c.course_id}?tab=progress`}>{c.icon} {c.title}</Link></td>
                    <td><LevelBadge level={c.level} /></td>
                    <td><div className="row" style={{ gap: 8 }}><div className="grow"><ProgressBar value={c.percent} thin success={c.percent === 100} /></div><span className="small">{c.done}/{c.eligible}</span></div></td>
                    <td>{fmtMin(c.minutes)}</td>
                    <td>{c.attempts ? <>{c.attempts} <span className="tiny muted">best {c.best}%</span></> : '—'}</td>
                    <td className="small muted hide-sm">{fmtDate(c.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="muted small" style={{ padding: 20 }}>Not enrolled in any course.</div>}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <div className="card" style={{ padding: 0 }}>
          <div className="card-title" style={{ padding: '16px 20px 8px' }}>Exam attempts</div>
          {r.attempts.length ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {r.attempts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.icon} {a.title}<div className="tiny muted">{fmtDate(a.submitted_at ?? a.started_at)}</div></td>
                      <td><LevelBadge level={a.level} /></td>
                      <td>{a.submitted_at ? <><b>{Math.round(a.percent ?? 0)}%</b> <span className={`badge ${a.passed ? 'success' : 'danger'}`}>{a.passed ? 'Passed' : 'Failed'}</span></> : <span className="badge">In progress</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="muted small" style={{ padding: 20 }}>No exams taken yet.</div>}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="card-title" style={{ padding: '16px 20px 8px' }}>Recent activity</div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            <table className="table">
              <tbody>
                {r.recent.map((e, i) => (
                  <tr key={i}>
                    <td className="small">{EVENT[e.type] ?? e.type}{' '}
                      {e.concept ? <b>{e.concept}</b> : e.course ? <b>{e.icon} {e.course}</b> : null}
                      {e.type === 'practice_answer' && <span className={`badge ${e.meta.correct ? 'success' : 'danger'}`} style={{ marginLeft: 6 }}>{e.meta.correct ? 'correct' : 'wrong'}</span>}
                      {e.type === 'exam_submit' && e.meta.percent != null && <span className="badge" style={{ marginLeft: 6 }}>{Math.round(Number(e.meta.percent))}%</span>}
                    </td>
                    <td className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.at)}</td>
                  </tr>
                ))}
                {!r.recent.length && <tr><td className="muted small">No activity yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
