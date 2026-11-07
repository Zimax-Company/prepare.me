'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'
import type { GoalStatus } from '@/lib/streaks'
import { announceGoal, browserTimezone } from './goal-events'

const OPTIONS = { minutes: [5, 10, 20, 30, 45], lessons: [1, 2, 3] } as const
const HINT: Record<string, string> = { '5': 'Casual', '10': 'Regular', '20': 'Serious', '30': 'Intense', '45': 'Hardcore', '1': 'Steady', '2': 'Focused', '3': 'Ambitious' }

export function GoalSettings({ kind, target }: { kind: 'minutes' | 'lessons'; target: number }) {
  const [open, setOpen] = useState(false)
  const [k, setK] = useState(kind)
  const [v, setV] = useState(target)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function save() {
    setPending(true)
    setError(null)
    try {
      const g = await apiCall<GoalStatus>('PATCH', '/me/goal', { kind: k, value: v, tz: browserTimezone() })
      announceGoal(g)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button className="btn sm ghost" onClick={() => { setK(kind); setV(target); setOpen(true) }}>Change goal</button>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Your daily goal</h2>
            <p className="muted small">Meet it every day to grow your streak. One missed day a week is covered by a free streak freeze ❄️.</p>
            <div className="tabs" style={{ marginBottom: 14 }}>
              <button className={k === 'minutes' ? 'active' : ''} onClick={() => { setK('minutes'); setV(10) }}>⏱ Minutes of learning</button>
              <button className={k === 'lessons' ? 'active' : ''} onClick={() => { setK('lessons'); setV(1) }}>✅ Lessons completed</button>
            </div>
            <div className="goal-options">
              {OPTIONS[k].map((n) => (
                <button key={n} className={v === n ? 'sel' : ''} onClick={() => setV(n)}>
                  {n} {k === 'minutes' ? 'min' : n === 1 ? 'lesson' : 'lessons'}<div className="tiny muted" style={{ fontWeight: 500 }}>{HINT[String(n)]}</div>
                </button>
              ))}
            </div>
            {error && <div className="error-box mt">{error}</div>}
            <div className="row mt-lg" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save goal'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
