import { db } from '@/lib/db'
import { requirePageAdmin } from '@/lib/auth'
import { UserActions } from '@/components/admin/UserActions'
import { fmtDate } from '@/components/ui'

export const metadata = { title: 'Students' }

export default async function Students() {
  const me = await requirePageAdmin()
  const [users, enroll, attempts, done] = await Promise.all([
    db('users').select('id', 'name', 'email', 'role', 'is_active', 'created_at').orderBy('created_at', 'desc'),
    db('enrollments').groupBy('user_id').select('user_id').count({ n: '*' }).max({ last: 'last_activity_at' }) as Promise<any[]>,
    db('exam_attempts').whereNotNull('submitted_at').groupBy('user_id').select('user_id').count({ n: '*' }).avg({ avg: 'percent' }).sum({ passed: 'passed' }) as Promise<any[]>,
    db('concept_progress').whereNotNull('completed_at').groupBy('user_id').select('user_id').count({ n: '*' }) as Promise<any[]>,
  ])
  const by = <T,>(rows: any[], f: (r: any) => T) => new Map(rows.map((r) => [Number(r.user_id), f(r)]))
  const e = by(enroll, (r) => ({ n: Number(r.n), last: r.last }))
  const a = by(attempts, (r) => ({ n: Number(r.n), avg: Math.round(Number(r.avg)), passed: Number(r.passed) }))
  const d = by(done, (r) => Number(r.n))

  return (
    <div className="stack-lg">
      <div><h1 style={{ margin: 0 }}>Students</h1><p className="muted" style={{ margin: 0 }}>{users.filter((u) => u.role === 'student').length} students · {users.filter((u) => u.role === 'admin').length} admins</p></div>
      <div className="card flat table-wrap" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Courses</th><th>Concepts done</th><th>Exams</th><th>Avg score</th><th className="hide-sm">Last active</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td><div style={{ fontWeight: 600 }}>{u.name}</div><div className="tiny muted">{u.email}</div></td>
                <td><span className={`badge ${u.role === 'admin' ? 'primary' : ''}`}>{u.role}</span>{!u.is_active && <span className="badge danger" style={{ marginLeft: 4 }}>inactive</span>}</td>
                <td>{e.get(u.id)?.n ?? 0}</td>
                <td>{d.get(u.id) ?? 0}</td>
                <td>{a.get(u.id) ? <>{a.get(u.id)!.n} <span className="tiny muted">({a.get(u.id)!.passed} passed)</span></> : 0}</td>
                <td>{a.get(u.id) ? `${a.get(u.id)!.avg}%` : '—'}</td>
                <td className="small muted hide-sm">{fmtDate(e.get(u.id)?.last ?? null)}</td>
                <td><UserActions id={u.id} role={u.role} active={!!u.is_active} self={u.id === me.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
