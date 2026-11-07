'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'
import { LEVELS, LEVEL_LABEL, type Level } from '@/lib/types'

const BLURB: Record<Level, string> = {
  beginner: 'New to the topic',
  intermediate: 'Know the basics',
  advanced: 'Ready to go deep',
}

export function EnrollPanel({ slug, loggedIn, current, counts, compact = false }: { slug: string; loggedIn: boolean; current?: Level | null; counts: Record<Level, number>; compact?: boolean }) {
  const [level, setLevel] = useState<Level>(current ?? 'beginner')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function go() {
    setPending(true)
    setError(null)
    try {
      await apiCall('POST', `/courses/${slug}/enroll`, { level })
      router.push(`/learn/${slug}`)
      router.refresh()
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  return (
    <div className="stack">
      {!compact && <div style={{ fontWeight: 700 }}>Choose your level</div>}
      <div className="level-pick">
        {LEVELS.map((l) => (
          <button key={l} className={level === l ? 'sel' : ''} onClick={() => setLevel(l)} type="button">
            <b>{LEVEL_LABEL[l]}</b>
            <small>{BLURB[l]}</small>
            <div className="tiny muted" style={{ marginTop: 4 }}>{counts[l]} concepts</div>
          </button>
        ))}
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>Each level includes every concept from the levels below it. You can switch levels at any time.</p>
      {error && <div className="error-box">{error}</div>}
      {loggedIn ? (
        <button className="btn primary lg block" onClick={go} disabled={pending || level === current}>
          {pending ? 'Saving…' : current ? (level === current ? `Enrolled as ${LEVEL_LABEL[current]}` : `Switch to ${LEVEL_LABEL[level]}`) : `Enroll as ${LEVEL_LABEL[level]} →`}
        </button>
      ) : (
        <Link className="btn primary lg block" href={`/register?next=/courses/${slug}`}>Sign up to enroll →</Link>
      )}
    </div>
  )
}
