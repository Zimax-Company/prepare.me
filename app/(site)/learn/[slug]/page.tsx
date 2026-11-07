import Link from 'next/link'
import { InlineMd } from '@/components/Markdown'
import { loadLearn } from '@/lib/learn-context'
import { conceptNumber, getExamSettings, groupBySection, listAttempts } from '@/lib/learning'
import { LEVELS, LEVEL_LABEL, levelsUpTo, type Level } from '@/lib/types'
import { EnrollPanel } from '@/components/EnrollPanel'
import { AttemptBars } from '@/components/AttemptBars'
import { CourseCover, LevelBadge, ProgressBar, ProgressRing } from '@/components/ui'

export default async function LearnHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, course, enrollment, sections, all, visible, progress, done, percent, next } = await loadLearn(slug)
  const groups = groupBySection(all, sections)
  const visibleIds = new Set(visible.map((c) => c.id))
  const [exam, attempts] = await Promise.all([getExamSettings(course.id), listAttempts(user.id, course.id)])
  const graded = attempts.filter((a) => a.submitted_at)
  const best = graded.reduce<number | null>((m, a) => (m == null || (a.percent ?? 0) > m ? a.percent : m), null)
  const counts = Object.fromEntries(LEVELS.map((l) => [l, all.filter((c) => levelsUpTo(l).includes(c.level)).length])) as Record<Level, number>

  return (
    <main className="container page stack-lg">
      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 110 }}><CourseCover icon={course.icon} color={course.color} height={96} /></div>
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="row" style={{ gap: 8 }}><span className="badge">{course.category}</span><LevelBadge level={enrollment.level} /></div>
          <h1 style={{ margin: '6px 0 4px' }}>{course.title}</h1>
          <div className="row small muted" style={{ marginBottom: 10 }}>{done} of {visible.length} concepts complete</div>
          <ProgressBar value={percent} />
        </div>
        <ProgressRing value={percent} size={96} />
        <div className="stack" style={{ minWidth: 200 }}>
          {next && <Link href={`/learn/${slug}/${next.slug}`} className="btn primary lg">{done === 0 ? 'Start learning →' : percent === 100 ? 'Review concepts' : 'Continue →'}</Link>}
          <Link href={`/learn/${slug}/exam`} className="btn">📝 Take the exam</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 28 }}>
        <section>
          <h2>Concepts</h2>
          <div className="stack" style={{ gap: 14 }}>
            {groups.map((g, gi) => {
              const open = g.concepts.filter((c) => visibleIds.has(c.id))
              const doneHere = open.filter((c) => progress.get(c.id)?.completed_at).length
              const isOpen = !g.section || g.concepts.some((c) => c.id === next?.id) || (gi === 0 && !next)
              const rows = (
                <div className="stack" style={{ gap: 8 }}>
                  {g.concepts.map((c, i) => {
                    const num = conceptNumber(c.slug, g.section ? gi : null, i)
                    if (!visibleIds.has(c.id)) {
                      return (
                        <div key={c.id} className="concept-item locked" title="Switch to a higher level to unlock">
                          <div className="concept-num">🔒</div>
                          <div className="grow"><div style={{ fontWeight: 600 }}>{c.title}</div><div className="small muted">Unlocks at {LEVEL_LABEL[c.level]} level</div></div>
                          <LevelBadge level={c.level} />
                        </div>
                      )
                    }
                    const p = progress.get(c.id)
                    const isDone = !!p?.completed_at
                    return (
                      <Link key={c.id} href={`/learn/${slug}/${c.slug}`} className="concept-item">
                        <div className={`concept-num ${isDone ? 'done' : ''}`} style={{ fontSize: num.length > 4 ? '0.62rem' : num.length > 3 ? '0.72rem' : undefined }}>{isDone ? '✓' : num}</div>
                        <div className="grow">
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          {c.summary && <div className="small muted"><InlineMd text={c.summary} /></div>}
                        </div>
                        {p?.practice_answered ? <span className="small muted hide-sm">Q&amp;A {Math.round((p.practice_correct / p.practice_answered) * 100)}%</span> : null}
                        <LevelBadge level={c.level} />
                        <span className="small muted hide-sm" style={{ width: 52, textAlign: 'right' }}>{c.est_minutes} min</span>
                      </Link>
                    )
                  })}
                </div>
              )
              if (!g.section) return <div key="loose">{rows}</div>
              return (
                <details key={g.section.id} className="card flat section-card" open={isOpen}>
                  <summary>
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>{g.section.title}</div>
                      {g.section.objective && <div className="small muted">{g.section.objective}</div>}
                    </div>
                    <div className="hide-sm" style={{ width: 140 }}>
                      <div className="tiny muted" style={{ textAlign: 'right' }}>{open.length ? `${doneHere}/${open.length} done` : 'Locked'}</div>
                      <ProgressBar value={open.length ? (doneHere / open.length) * 100 : 0} thin success={open.length > 0 && doneHere === open.length} />
                    </div>
                  </summary>
                  <div className="mt">{rows}</div>
                  {(g.section.competencies.length > 0 || g.section.assessment) && (
                    <div className="small muted mt" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {g.section.competencies.length > 0 && <><b>You&apos;ll be able to:</b><ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>{g.section.competencies.map((x) => <li key={x}>{x}</li>)}</ul></>}
                      {g.section.assessment && <><b>Assessment:</b> {g.section.assessment}</>}
                    </div>
                  )}
                </details>
              )
            })}
          </div>
        </section>
        <aside className="stack-lg">
          <div className="card">
            <div className="card-title">📝 Exam</div>
            <div className="small muted mb">{exam.question_count} random questions · {exam.duration_minutes} min · pass {exam.pass_mark}%{exam.max_attempts ? ` · ${exam.max_attempts} attempts max` : ''}</div>
            {graded.length ? (
              <>
                <div className="row between small"><span className="muted">Best score</span><b>{Math.round(best ?? 0)}%</b></div>
                <AttemptBars attempts={graded.slice(0, 10).reverse()} passMark={exam.pass_mark} />
              </>
            ) : (
              <p className="small muted">No attempts yet. Finish the concepts, then test yourself.</p>
            )}
            <Link href={`/learn/${slug}/exam`} className="btn block mt">{graded.length ? 'View attempts & retake' : 'Go to exam'}</Link>
          </div>
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Change level</summary>
            <div className="mt"><EnrollPanel slug={slug} loggedIn current={enrollment.level} counts={counts} compact /></div>
          </details>
        </aside>
      </div>
      <style>{`@media (max-width: 900px) { main .grid[style] { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  )
}
