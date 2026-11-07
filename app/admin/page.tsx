import Link from 'next/link'
import { db } from '@/lib/db'
import { LiveActivity } from '@/components/admin/LiveActivity'

export default async function AdminHome() {
  const courses: any[] = await db('courses as c')
    .leftJoin('enrollments as e', 'e.course_id', 'c.id')
    .groupBy('c.id', 'c.title', 'c.icon', 'c.published')
    .select('c.id', 'c.title', 'c.icon', 'c.published')
    .count({ students: 'e.id' })
    .orderBy('c.title')
  const qByCourse = new Map(((await db('questions').groupBy('course_id').select('course_id').count({ n: '*' })) as any[]).map((r) => [Number(r.course_id), Number(r.n)]))
  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div><h1 style={{ margin: 0 }}>Dashboard</h1><p className="muted" style={{ margin: 0 }}>Live overview of learners and exams.</p></div>
        <div className="row"><Link href="/admin/questions" className="btn">+ Question</Link><Link href="/admin/courses?new=1" className="btn primary">+ New course</Link></div>
      </div>
      <LiveActivity />
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: '16px 20px 8px' }}>Courses</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Course</th><th>Status</th><th>Students</th><th>Questions</th><th></th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.icon} {c.title}</td>
                  <td><span className={`badge ${c.published ? 'success' : ''}`}>{c.published ? 'Published' : 'Draft'}</span></td>
                  <td>{Number(c.students)}</td>
                  <td>{qByCourse.get(Number(c.id)) ?? 0}</td>
                  <td><Link className="btn sm ghost" href={`/admin/courses/${c.id}`}>Manage →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
