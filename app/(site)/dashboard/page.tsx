import Link from 'next/link'
import { requirePageUser } from '@/lib/auth'
import { listCatalog } from '@/lib/learning'
import { db } from '@/lib/db'
import { CourseCard } from '@/components/CourseCard'
import { Empty, fmtDate, ProgressRing } from '@/components/ui'

export const metadata = { title: 'My learning' }

export default async function Dashboard() {
  const user = await requirePageUser()
  const catalog = await listCatalog(user.id)
  const mine = catalog.filter((c) => c.enrolled)
  const others = catalog.filter((c) => !c.enrolled)
  const [attempts, completed] = await Promise.all([
    db('exam_attempts as a').join('courses as c', 'c.id', 'a.course_id').where('a.user_id', user.id).whereNotNull('a.submitted_at')
      .select('a.id', 'a.percent', 'a.passed', 'a.submitted_at', 'a.level', 'c.title', 'c.icon').orderBy('a.id', 'desc').limit(6),
    db('concept_progress').where({ user_id: user.id }).whereNotNull('completed_at').count({ n: '*' }).first(),
  ])
  const avg = mine.length ? Math.round(mine.reduce((s, c) => s + c.progress, 0) / mine.length) : 0
  const passed = attempts.filter((a) => a.passed).length

  return (
    <main className="container page stack-lg">
      <div>
        <h1>Hi {user.name.split(' ')[0]} 👋</h1>
        <p className="muted">Pick up where you left off.</p>
      </div>
      <div className="grid grid-4">
        <div className="card row"><ProgressRing value={avg} size={64} stroke={7} /><div className="stat"><b>{mine.length}</b><span>courses in progress</span></div></div>
        <div className="card stat"><b>{Number(completed?.n ?? 0)}</b><span>concepts completed</span></div>
        <div className="card stat"><b>{attempts.length}</b><span>recent exam attempts</span></div>
        <div className="card stat"><b>{passed}</b><span>exams passed</span></div>
      </div>
      <section>
        <h2>My courses</h2>
        {mine.length ? <div className="grid grid-3">{mine.map((c) => <CourseCard key={c.id} course={c} />)}</div> : <Empty title="You haven't enrolled in a course yet" action={{ href: '/courses', label: 'Browse courses' }} />}
      </section>
      {attempts.length > 0 && (
        <section>
          <h2>Recent exam results</h2>
          <div className="card flat table-wrap" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Course</th><th>Level</th><th>Score</th><th>Result</th><th className="hide-sm">Date</th><th></th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.icon} {a.title}</td>
                    <td className="small" style={{ textTransform: 'capitalize' }}>{a.level}</td>
                    <td><b>{Math.round(Number(a.percent))}%</b></td>
                    <td><span className={`badge ${a.passed ? 'success' : 'danger'}`}>{a.passed ? 'Passed' : 'Not passed'}</span></td>
                    <td className="small muted hide-sm">{fmtDate(a.submitted_at)}</td>
                    <td><Link className="btn sm ghost" href={`/results/${a.id}`}>Review →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section>
          <h2>Explore more</h2>
          <div className="grid grid-3">{others.slice(0, 3).map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}
    </main>
  )
}
