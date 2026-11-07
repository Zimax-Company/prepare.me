'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall } from '@/lib/client'
import type { PublicQuestion } from '@/lib/types'
import { PracticeQA } from './PracticeQA'
import { announceGoal } from './goal-events'
import type { GoalStatus } from '@/lib/streaks'

export function ConceptActions({ conceptId, completed, questions, nextHref, examHref }: {
  conceptId: number
  completed: boolean
  questions: PublicQuestion[]
  nextHref: string | null
  examHref: string
}) {
  const [done, setDone] = useState(completed)
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const router = useRouter()

  async function setCompleted(value: boolean) {
    setPending(true)
    try {
      const r = await apiCall<{ progress?: { percent: number }; goal?: GoalStatus }>('POST', `/concepts/${conceptId}/complete`, { completed: value })
      announceGoal(r?.goal)
      setDone(value)
      if (value) {
        setToast(`Concept complete! Course progress: ${r?.progress?.percent ?? 0}% 🎉`)
        setTimeout(() => setToast(null), 2600)
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="stack-lg">
      <section id="practice">
        <h2>Check your understanding</h2>
        <PracticeQA questions={questions} onFinished={() => { if (!done) setCompleted(true) }} />
      </section>
      <div className="card row wrap between" style={{ background: done ? 'var(--success-soft)' : undefined }}>
        <div>
          <div style={{ fontWeight: 700 }}>{done ? '✅ You completed this concept' : 'Finished this concept?'}</div>
          <div className="small muted">{done ? 'Nice work. Keep the momentum going.' : 'Mark it complete to update your progress bar.'}</div>
        </div>
        <div className="row wrap">
          {done ? (
            <button className="btn ghost sm" disabled={pending} onClick={() => setCompleted(false)}>Mark incomplete</button>
          ) : (
            <button className="btn success" disabled={pending} onClick={() => setCompleted(true)}>✓ Mark complete</button>
          )}
          {nextHref ? <Link className="btn primary" href={nextHref}>Next concept →</Link> : <Link className="btn primary" href={examHref}>Take the exam →</Link>}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
