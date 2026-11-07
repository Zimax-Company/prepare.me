import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { attemptQuestions, getExamSettings, getOwnAttempt } from '@/lib/learning'
import { isCorrect } from '@/lib/grading'
import { Confetti } from '@/components/Confetti'
import { InlineMd, Markdown } from '@/components/Markdown'
import { fmtDate, fmtDuration, LevelBadge, ProgressBar, ProgressRing } from '@/components/ui'

export const metadata = { title: 'Exam results' }

export default async function Results({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ timeout?: string }> }) {
  const user = await requirePageUser()
  const id = Number((await params).id)
  const timeout = (await searchParams).timeout === '1'
  const attempt = await getOwnAttempt(id, user.id).catch(() => null)
  if (!attempt || !attempt.submitted_at) notFound()
  const [settings, course] = await Promise.all([getExamSettings(attempt.course_id), db('courses').where({ id: attempt.course_id }).first()])
  const questions = await attemptQuestions(attempt, settings.shuffle_options)
  const concepts = await db('concepts').where({ course_id: attempt.course_id }).select('id', 'title', 'slug')
  const conceptName = new Map(concepts.map((c) => [Number(c.id), c]))

  const rows = questions.map((q) => {
    const given = attempt.answers[q.id] ?? []
    return { q, given, correct: isCorrect(q, given), answered: given.length > 0 }
  })
  const unanswered = rows.filter((r) => !r.answered).length
  const wrong = rows.length - (attempt.score ?? 0) - unanswered
  const pct = Math.round(attempt.percent ?? 0)

  // Per-concept breakdown highlights what to revise.
  const byConcept = new Map<number, { title: string; slug: string; right: number; total: number }>()
  for (const r of rows) {
    const c = r.q.concept_id ? conceptName.get(r.q.concept_id) : null
    if (!c) continue
    const e = byConcept.get(c.id) ?? { title: c.title, slug: c.slug, right: 0, total: 0 }
    e.total++
    if (r.correct) e.right++
    byConcept.set(c.id, e)
  }
  const breakdown = [...byConcept.values()].sort((a, b) => a.right / a.total - b.right / b.total)
  const label = (q: (typeof questions)[number], ids: string[]) =>
    q.type === 'short' ? ids.join(', ') : ids.map((i) => q.options.find((o) => o.id === i)?.text ?? i).join(', ')

  return (
    <main className="container narrow page stack-lg">
      {attempt.passed && <Confetti />}
      <div className="card center" style={{ padding: 32 }}>
        {timeout && <div className="badge danger mb">⏰ Time ran out, so your saved answers were submitted</div>}
        <div className="small muted">{course.icon} {course.title} · <LevelBadge level={attempt.level} /></div>
        <div className="mt"><ProgressRing value={pct} size={150} stroke={12} color={attempt.passed ? 'var(--success)' : 'var(--danger)'} /></div>
        <h1 className="mt" style={{ marginBottom: 4 }}>{attempt.passed ? 'You passed! 🎉' : 'Not quite there yet'}</h1>
        <p className="muted">{attempt.score} of {attempt.total} correct · pass mark {attempt.pass_mark}%</p>
        <div className="grid mt result-stats" style={{ textAlign: "left" }}>
          <div className="card flat stat"><b style={{ color: 'var(--success)' }}>{attempt.score}</b><span>correct</span></div>
          <div className="card flat stat"><b style={{ color: 'var(--danger)' }}>{wrong}</b><span>wrong</span></div>
          <div className="card flat stat"><b>{unanswered}</b><span>unanswered</span></div>
          <div className="card flat stat"><b>{fmtDuration(attempt.submitted_at.getTime() - attempt.started_at.getTime())}</b><span>of {attempt.duration_minutes} min</span></div>
        </div>
        <div className="row mt-lg" style={{ justifyContent: 'center' }}>
          <Link href={`/learn/${course.slug}/exam`} className="btn primary">↻ Try again</Link>
          <Link href={`/learn/${course.slug}`} className="btn">Back to course</Link>
        </div>
        <div className="tiny muted mt">Submitted {fmtDate(attempt.submitted_at)}</div>
      </div>

      {breakdown.length > 0 && (
        <section className="card">
          <h2>By concept</h2>
          <div className="stack">
            {breakdown.map((b) => {
              const p = Math.round((b.right / b.total) * 100)
              return (
                <div key={b.slug}>
                  <div className="row between small"><Link href={`/learn/${course.slug}/${b.slug}`} style={{ fontWeight: 600 }}>{b.title}</Link><span className="muted">{b.right}/{b.total}</span></div>
                  <div style={{ marginTop: 4 }}><ProgressBar value={p} thin success={p >= attempt.pass_mark} /></div>
                </div>
              )
            })}
          </div>
          <p className="tiny muted mt" style={{ marginBottom: 0 }}>Weakest concepts are listed first. Select one to revise it.</p>
        </section>
      )}

      {settings.show_review ? (
        <section>
          <h2>Review answers</h2>
          <div className="stack">
            {rows.map((r, i) => (
              <div key={r.q.id} className="card flat" style={{ borderLeft: `4px solid ${r.correct ? 'var(--success)' : r.answered ? 'var(--danger)' : 'var(--border)'}` }}>
                <div className="row between small muted"><span>Question {i + 1}</span><span>{r.correct ? '✅ Correct' : r.answered ? '❌ Incorrect' : '⏭ Unanswered'}</span></div>
                <div style={{ fontWeight: 600, margin: '6px 0 10px' }}><InlineMd text={r.q.prompt} /></div>
                {r.answered && !r.correct && <div className="small">Your answer: <span style={{ color: 'var(--danger)' }}><InlineMd text={label(r.q, r.given)} /></span></div>}
                <div className="small">Correct answer: <b style={{ color: 'var(--success)' }}><InlineMd text={label(r.q, r.q.answer)} /></b></div>
                {r.q.explanation && <div className="small muted mt" style={{ marginTop: 8 }}><Markdown text={r.q.explanation} /></div>}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty small">Answer review is turned off for this exam.</div>
      )}
    </main>
  )
}
