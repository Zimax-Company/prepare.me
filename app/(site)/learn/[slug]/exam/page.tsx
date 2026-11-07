import Link from 'next/link'
import { loadLearn } from '@/lib/learn-context'
import { examPool, getExamSettings, listAttempts } from '@/lib/learning'
import { LEVELS, type Level } from '@/lib/types'
import { StartExam } from '@/components/StartExam'
import { AttemptBars } from '@/components/AttemptBars'
import { fmtDate, fmtDuration, LevelBadge } from '@/components/ui'

export default async function ExamHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, course, enrollment } = await loadLearn(slug)
  const [s, attempts] = await Promise.all([getExamSettings(course.id), listAttempts(user.id, course.id)])
  const pool = Object.fromEntries(await Promise.all(LEVELS.map(async (l) => [l, await examPool(course.id, l, s.include_lower_levels)]))) as Record<Level, number>
  const open = attempts.find((a) => !a.submitted_at && a.expires_at.getTime() > Date.now())
  const graded = attempts.filter((a) => a.submitted_at)
  const used = attempts.length
  let disabledReason: string | null = null
  if (s.max_attempts && used >= s.max_attempts && !open) disabledReason = `You've used all ${s.max_attempts} attempts.`
  else if (s.cooldown_minutes && graded[0]?.submitted_at) {
    const ready = graded[0].submitted_at.getTime() + s.cooldown_minutes * 60_000
    if (ready > Date.now()) disabledReason = `Cooldown: next attempt available at ${fmtDate(new Date(ready))}.`
  }
  const best = graded.length ? Math.max(...graded.map((a) => a.percent ?? 0)) : null
  const avg = graded.length ? Math.round(graded.reduce((x, a) => x + (a.percent ?? 0), 0) / graded.length) : null

  const rules = [
    ['⏱', `${s.duration_minutes} minutes`, 'Countdown timer. The exam submits automatically when time runs out.'],
    ['🎲', `${s.question_count} random questions`, s.include_lower_levels ? 'Drawn from your chosen level and topped up from lower levels if needed.' : 'Drawn only from the chosen level.'],
    ['🎯', `Pass mark ${s.pass_mark}%`, 'Multiple-select questions must be fully correct to earn the mark.'],
    ['🔁', s.max_attempts ? `${s.max_attempts} attempts (${Math.max(0, s.max_attempts - used)} left)` : 'Unlimited attempts', s.cooldown_minutes ? `${s.cooldown_minutes} min cooldown between attempts.` : 'Every attempt is scored and kept in your history.'],
  ]

  return (
    <main className="container page stack-lg">
      <div>
        <Link href={`/learn/${slug}`} className="small muted">← {course.title}</Link>
        <h1 style={{ marginTop: 8 }}>📝 {course.title}: Exam</h1>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(300px, 420px)', gap: 28 }}>
        <div className="stack-lg">
          <div className="grid grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {rules.map(([icon, title, body]) => (
              <div key={title} className="card flat feature"><div className="feature-icon">{icon}</div><div><div style={{ fontWeight: 700 }}>{title}</div><div className="small muted">{body}</div></div></div>
            ))}
          </div>
          <section>
            <h2>Your attempts</h2>
            {graded.length ? (
              <div className="stack">
                <div className="grid grid-4">
                  <div className="card stat"><b>{graded.length}</b><span>attempts</span></div>
                  <div className="card stat"><b>{Math.round(best!)}%</b><span>best score</span></div>
                  <div className="card stat"><b>{avg}%</b><span>average</span></div>
                  <div className="card stat"><b>{graded.filter((a) => a.passed).length}</b><span>passed</span></div>
                </div>
                <div className="card"><div className="small muted">Score trend (oldest → newest)</div><AttemptBars attempts={[...graded].reverse().slice(-15)} passMark={s.pass_mark} /></div>
                <div className="card flat table-wrap" style={{ padding: 0 }}>
                  <table className="table">
                    <thead><tr><th>#</th><th>Level</th><th>Score</th><th>Result</th><th className="hide-sm">Time used</th><th className="hide-sm">Date</th><th></th></tr></thead>
                    <tbody>
                      {graded.map((a, i) => (
                        <tr key={a.id}>
                          <td className="muted">{graded.length - i}</td>
                          <td><LevelBadge level={a.level} /></td>
                          <td><b>{a.score}/{a.total}</b> <span className="muted small">({Math.round(a.percent ?? 0)}%)</span></td>
                          <td><span className={`badge ${a.passed ? 'success' : 'danger'}`}>{a.passed ? 'Passed' : 'Not passed'}</span></td>
                          <td className="small muted hide-sm">{fmtDuration(a.submitted_at!.getTime() - a.started_at.getTime())}</td>
                          <td className="small muted hide-sm">{fmtDate(a.submitted_at)}</td>
                          <td><Link className="btn sm ghost" href={`/results/${a.id}`}>Review</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty">No attempts yet. Your scores will appear here.</div>
            )}
          </section>
        </div>
        <aside>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <StartExam slug={slug} defaultLevel={enrollment.level} pool={pool} disabledReason={disabledReason} resumeId={open?.id ?? null} />
          </div>
        </aside>
      </div>
      <style>{`@media (max-width: 900px) { main .grid[style*="420px"] { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  )
}
