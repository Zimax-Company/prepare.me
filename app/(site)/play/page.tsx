import Link from 'next/link'
import { requirePageUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { fitsRunner, leaderboard, personalBest } from '@/lib/games'
import { getSections, toQuestion } from '@/lib/learning'
import { levelsUpTo, type Level } from '@/lib/types'
import { RunnerLauncher } from '@/components/game/RunnerLauncher'
import { Empty } from '@/components/ui'

export const metadata = { title: 'Play' }

export default async function Play({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requirePageUser()
  const enrolled = await db('enrollments as e').join('courses as c', 'c.id', 'e.course_id').where('e.user_id', user.id)
    .select('c.id', 'c.title', 'c.icon', 'e.level').orderBy('e.last_activity_at', 'desc')
  const courses = await Promise.all(enrolled.map(async (c) => {
    const id = Number(c.id)
    const [rows, sections, best, week] = await Promise.all([
      db('questions as q').leftJoin('concepts as k', 'k.id', 'q.concept_id').where('q.course_id', id).whereIn('q.level', levelsUpTo(c.level as Level)).select('q.*', 'k.section_id as section_id'),
      getSections(id),
      personalBest(user.id, id),
      leaderboard(id, 'week', 5),
    ])
    const fit = rows.filter((r) => fitsRunner(toQuestion(r)))
    return {
      id, title: c.title as string, icon: c.icon as string, best, week,
      playable: fit.length,
      sections: sections.map((s) => ({ id: s.id, title: s.title, playable: fit.filter((r) => Number(r.section_id) === s.id).length })),
    }
  }))
  const initial = Number((await searchParams).course) || undefined

  return (
    <main className="container page stack-lg">
      <div>
        <h1 style={{ margin: 0 }}>🎮 Play</h1>
        <p className="muted" style={{ margin: 0 }}>Learn at speed. Every game uses the questions from your courses.</p>
      </div>
      {!courses.length ? (
        <Empty title="Enrol in a course to start playing" action={{ href: '/courses', label: 'Browse courses' }} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 24, alignItems: 'start' }}>
          <RunnerLauncher courses={courses.map(({ best, week, ...c }) => c)} initialCourse={initial && courses.some((c) => c.id === initial) ? initial : undefined} />
          <aside className="stack">
            {courses.map((c) => (
              <div key={c.id} className="card">
                <div className="card-title">{c.icon} {c.title}</div>
                <div className="small muted mb">Your best: <b>{c.best.best.toLocaleString()}</b> · {c.best.plays} runs</div>
                <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top this week</div>
                <ol className="runner-board">
                  {c.week.map((r) => <li key={r.userId} className={r.userId === user.id ? 'me' : ''}><span>{r.name}</span><b>{r.score.toLocaleString()}</b></li>)}
                  {!c.week.length && <li className="muted">Be the first this week!</li>}
                </ol>
              </div>
            ))}
            <Link href="/dashboard" className="small muted">← Back to my learning</Link>
          </aside>
        </div>
      )}
      <style>{`@media (max-width: 900px) { main .grid[style] { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  )
}
