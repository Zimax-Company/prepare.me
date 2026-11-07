'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'
import { LEVELS, LEVEL_LABEL, type Level } from '@/lib/types'

export function StartExam({ slug, defaultLevel, pool, disabledReason, resumeId }: {
  slug: string
  defaultLevel: Level
  pool: Record<Level, number>
  disabledReason?: string | null
  resumeId?: number | null
}) {
  const [level, setLevel] = useState<Level>(defaultLevel)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (resumeId) {
    return <button className="btn primary lg block" onClick={() => router.push(`/exam/${resumeId}`)}>⏱ Resume your exam in progress →</button>
  }

  async function start() {
    setPending(true)
    setError(null)
    try {
      const { id } = await apiCall<{ id: number }>('POST', `/courses/${slug}/exams`, { level })
      router.push(`/exam/${id}`)
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  return (
    <div className="stack">
      <div style={{ fontWeight: 700 }}>Exam difficulty</div>
      <div className="level-pick">
        {LEVELS.map((l) => (
          <button key={l} type="button" className={level === l ? 'sel' : ''} onClick={() => setLevel(l)} disabled={!pool[l]}>
            <b>{LEVEL_LABEL[l]}</b>
            <small>{pool[l]} questions in pool</small>
          </button>
        ))}
      </div>
      {error && <div className="error-box">{error}</div>}
      {disabledReason && <div className="error-box">{disabledReason}</div>}
      <button className="btn primary lg block" onClick={start} disabled={pending || !!disabledReason || !pool[level]}>
        {pending ? 'Preparing your questions…' : 'Start exam →'}
      </button>
      <p className="tiny muted center" style={{ margin: 0 }}>The timer starts as soon as you click. Your answers are saved automatically as you go.</p>
    </div>
  )
}
