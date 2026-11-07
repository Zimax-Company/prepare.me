import Link from 'next/link'

type A = { id: number; percent: number | null; passed: boolean | null }

/** Mini bar chart of attempt scores with the pass mark drawn as a dashed line. */
export function AttemptBars({ attempts, passMark }: { attempts: A[]; passMark: number }) {
  return (
    <div style={{ position: 'relative', marginTop: 16 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(passMark / 100) * 140}px`, borderTop: '1.5px dashed var(--muted)', opacity: 0.5 }}>
        <span className="tiny muted" style={{ position: 'absolute', right: 0, top: -16 }}>pass {passMark}%</span>
      </div>
      <div className="bars">
        {attempts.map((a) => (
          <Link key={a.id} href={`/results/${a.id}`} className={`bar ${a.passed ? 'pass' : 'fail'}`} style={{ height: `${Math.max(3, a.percent ?? 0)}%` }} title={`Attempt #${a.id}: ${Math.round(a.percent ?? 0)}%`}>
            <span>{Math.round(a.percent ?? 0)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
