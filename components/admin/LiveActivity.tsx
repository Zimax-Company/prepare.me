'use client'

import { useEffect, useState } from 'react'

type Live = {
  at: string
  students: number
  in_progress: number
  attempts_24h: number
  avg_percent: number | null
  recent: { id: number; name: string; title: string; icon: string; level: string; started_at: string; submitted_at: string | null; score: number | null; total: number; percent: number | null; passed: number | null; live: boolean }[]
}

/** Polls every 5s, so admins see exams start and finish in near real time. */
export function LiveActivity() {
  const [data, setData] = useState<Live | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/live', { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!stop) { setData(json.data); setError(false) }
      } catch {
        if (!stop) setError(true)
      }
    }
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 5000)
    return () => { stop = true; clearInterval(t) }
  }, [])

  if (!data) return <div className="card muted">{error ? 'Could not load live data.' : 'Loading live activity…'}</div>

  return (
    <div className="stack-lg">
      <div className="grid grid-4">
        <div className="card stat"><b>{data.students}</b><span>students</span></div>
        <div className="card stat"><b className="row" style={{ gap: 8 }}>{data.in_progress}{data.in_progress > 0 && <span className="badge live">LIVE</span>}</b><span>exams in progress</span></div>
        <div className="card stat"><b>{data.attempts_24h}</b><span>attempts in the last 24h</span></div>
        <div className="card stat"><b>{data.avg_percent == null ? '—' : `${data.avg_percent}%`}</b><span>average exam score</span></div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '16px 20px 8px' }}>
          <div className="card-title" style={{ margin: 0 }}>Live exam activity</div>
          <span className="tiny muted">{error ? '⚠ reconnecting…' : `updated ${new Date(data.at).toLocaleTimeString()}`}</span>
        </div>
        {data.recent.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Student</th><th>Course</th><th>Level</th><th>Status</th><th>Score</th><th className="hide-sm">Started</th></tr></thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.icon} {r.title}</td>
                    <td className="small" style={{ textTransform: 'capitalize' }}>{r.level}</td>
                    <td>{r.live ? <span className="badge live">In progress</span> : r.submitted_at ? <span className={`badge ${r.passed ? 'success' : 'danger'}`}>{r.passed ? 'Passed' : 'Failed'}</span> : <span className="badge">Expired</span>}</td>
                    <td>{r.percent != null ? `${Math.round(Number(r.percent))}% (${r.score}/${r.total})` : '—'}</td>
                    <td className="small muted hide-sm">{new Date(r.started_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="muted small" style={{ padding: 20 }}>No exam attempts yet.</div>}
      </div>
    </div>
  )
}
