import Link from 'next/link'
import { db } from '@/lib/db'
import { requirePageAdmin } from '@/lib/auth'
import { parseRange, studentTable } from '@/lib/analytics'
import { UserActions } from '@/components/admin/UserActions'
import { RangePicker } from '@/components/admin/RangePicker'
import { fmtDate, ProgressBar } from '@/components/ui'

export const metadata = { title: 'Students' }

const fmtMin = (m: number) => (m >= 120 ? `${Math.round(m / 6) / 10} h` : `${m} min`)
const SORTS = { lastActive: 'Last active', minutes: 'Learning time', name: 'Name' } as const

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; range?: string }> }) {
  const me = await requirePageAdmin()
  const sp = await searchParams
  const range = parseRange(sp.range)
  const sort = (sp.sort && sp.sort in SORTS ? sp.sort : 'lastActive') as keyof typeof SORTS
  const q = sp.q?.trim() || undefined
  const [rows, admins] = await Promise.all([
    studentTable({ from: new Date(Date.now() - range * 86_400_000), sort, q }),
    db('users').where({ role: 'admin' }).select('id', 'name', 'email', 'is_active').orderBy('name'),
  ])
  const weekAgo = Date.now() - 7 * 86_400_000
  const active7 = rows.filter((r) => r.lastActive && r.lastActive.getTime() > weekAgo).length

  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div><h1 style={{ margin: 0 }}>Students</h1><p className="muted" style={{ margin: 0 }}>{rows.length} students{q ? ` matching "${q}"` : ''} · {active7} active in the last 7 days</p></div>
        <div className="row wrap"><RangePicker value={range} params={{ q, sort }} /><a className="btn sm" href="/api/admin/export/students">⬇ CSV</a></div>
      </div>
      <form className="card flat row wrap" style={{ padding: 12 }}>
        <input className="input grow" style={{ minWidth: 220 }} name="q" defaultValue={q} placeholder="Search name or email…" />
        <select className="input" name="sort" defaultValue={sort} style={{ width: 180 }}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v}</option>)}
        </select>
        <input type="hidden" name="range" value={range} />
        <button className="btn">Apply</button>
      </form>
      <div className="card flat table-wrap" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Student</th><th>Courses</th><th style={{ width: 150 }}>Avg progress</th><th>Lessons done</th><th>Streak</th><th>Learning time ({range}d)</th><th>Exams</th><th className="hide-sm">Last active</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                <td><Link href={`/admin/students/${u.id}`} style={{ fontWeight: 600 }}>{u.name}</Link>{!u.isActive && <span className="badge danger" style={{ marginLeft: 6 }}>inactive</span>}<div className="tiny muted">{u.email}</div></td>
                <td>{u.courses}</td>
                <td>{u.avgProgress === null ? <span className="muted">—</span> : <div className="row" style={{ gap: 8 }}><div className="grow"><ProgressBar value={u.avgProgress} thin /></div><span className="small">{u.avgProgress}%</span></div>}</td>
                <td>{u.completions}</td>
                <td>{u.streak ? <>🔥 {u.streak}</> : <span className="muted">0</span>} <span className="tiny muted">best {u.longestStreak}</span></td>
                <td>{fmtMin(u.minutes)} <span className="tiny muted">· {fmtMin(u.minutesAll)} total</span></td>
                <td>{u.exams ? <>{u.exams} <span className="tiny muted">avg {u.examAvg}%</span></> : 0}</td>
                <td className="small muted hide-sm">{u.lastActive ? fmtDate(u.lastActive) : 'never'}</td>
                <td><UserActions id={u.id} role="student" active={u.isActive} self={false} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="center muted" style={{ padding: 32 }}>No students found.</td></tr>}
          </tbody>
        </table>
      </div>
      <details className="card flat">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Admins ({admins.length})</summary>
        <table className="table mt">
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}><td><b>{a.name}</b><div className="tiny muted">{a.email}</div></td><td><UserActions id={Number(a.id)} role="admin" active={!!a.is_active} self={Number(a.id) === me.id} /></td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
