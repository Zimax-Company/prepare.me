'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'
import type { Level, PublicQuestion } from '@/lib/types'
import { InlineMd } from './Markdown'
import { QuestionInput } from './QuestionInput'
import { LevelBadge } from './ui'
import { SpeakButton } from './SpeakButton'

type Answers = Record<string, string[]>

export function ExamRunner({ attemptId, course, level, questions, initialAnswers, expiresAt, serverNow, durationMinutes }: {
  attemptId: number
  course: { title: string; icon: string; slug: string }
  level: Level
  questions: PublicQuestion[]
  initialAnswers: Answers
  expiresAt: string
  serverNow: string
  durationMinutes: number
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})
  const [current, setCurrent] = useState(0)
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  // Correct for client clock drift using the server's time at render.
  const skew = useRef(new Date(serverNow).getTime() - Date.now())
  const end = new Date(expiresAt).getTime()
  const [remaining, setRemaining] = useState(() => end - (Date.now() + skew.current))
  const answersRef = useRef(answers)
  answersRef.current = answers
  const submittedRef = useRef(false)

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await apiCall('POST', `/attempts/${attemptId}/submit`, { answers: answersRef.current })
      router.replace(`/results/${attemptId}${auto ? '?timeout=1' : ''}`)
    } catch (e) {
      submittedRef.current = false
      setSubmitting(false)
      setError(errorMessage(e))
    }
  }, [attemptId, router])

  // Countdown
  useEffect(() => {
    const t = setInterval(() => {
      const left = end - (Date.now() + skew.current)
      setRemaining(left)
      if (left <= 0) { clearInterval(t); setTimedOut(true); submit(true) }
    }, 250)
    return () => clearInterval(t)
  }, [end, submit])

  // Debounced autosave
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaveState('saving')
    const t = setTimeout(async () => {
      try {
        await apiCall('PUT', `/attempts/${attemptId}`, { answers })
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 700)
    return () => clearTimeout(t)
  }, [answers, attemptId])

  // Warn before leaving mid-exam
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!submittedRef.current) e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  const q = questions[current]
  const answeredCount = questions.filter((qq) => answers[qq.id]?.length).length

  // Keyboard: ← → to navigate, 1-9 to choose an option, F to flag
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || confirm) return
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(questions.length - 1, c + 1))
      else if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1))
      else if (e.key.toLowerCase() === 'f') toggleFlag(current)
      else if (/^[1-9]$/.test(e.key) && q && q.type !== 'short') {
        const opt = q.options[Number(e.key) - 1]
        if (!opt) return
        setAnswers((a) => {
          const cur = a[q.id] ?? []
          const v = q.type === 'multiple' ? (cur.includes(opt.id) ? cur.filter((x) => x !== opt.id) : [...cur, opt.id]) : [opt.id]
          return { ...a, [q.id]: v }
        })
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  function toggleFlag(i: number) {
    setFlagged((f) => { const n = new Set(f); if (n.has(i)) n.delete(i); else n.add(i); return n })
  }

  const secs = Math.max(0, Math.ceil(remaining / 1000))
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const pctLeft = (remaining / (durationMinutes * 60_000)) * 100
  const timerClass = secs <= 60 ? 'crit' : pctLeft <= 20 ? 'warn' : ''

  return (
    <div>
      <div className="exam-bar">
        <div className="container exam-bar-inner">
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.icon} {course.title}</div>
            <div className="row tiny muted" style={{ gap: 8 }}><LevelBadge level={level} /> {answeredCount}/{questions.length} answered · <span>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Not saved, retrying on next change' : '✓ Saved'}</span></div>
          </div>
          <div className={`timer ${timerClass}`} aria-live="polite">⏱ {mm}:{ss}</div>
          <button className="btn primary hide-sm" onClick={() => setConfirm(true)} disabled={submitting}>Submit</button>
        </div>
        <div className="progress thin" style={{ borderRadius: 0 }}><span style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      </div>

      <main className="container page">
        <div className="exam-layout">
          <section className="card" style={{ padding: 28 }}>
            {q && (
              <div key={q.id} className="block-anim">
                <div className="row between small muted mb">
                  <span className="row" style={{ gap: 6 }}>Question {current + 1} of {questions.length} <SpeakButton text={q.speech} /></span>
                  <button className={`btn sm ${flagged.has(current) ? '' : 'ghost'}`} onClick={() => toggleFlag(current)} style={flagged.has(current) ? { color: 'var(--warning)', borderColor: 'var(--warning)' } : undefined}>
                    {flagged.has(current) ? '⚑ Flagged' : '⚐ Flag for review'}
                  </button>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20, lineHeight: 1.45 }}><InlineMd text={q.prompt} /></div>
                <QuestionInput q={q} value={answers[q.id] ?? []} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} disabled={submitting} />
              </div>
            )}
            <div className="row between mt-lg">
              <button className="btn" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</button>
              {current < questions.length - 1 ? (
                <button className="btn primary" onClick={() => setCurrent(current + 1)}>Next →</button>
              ) : (
                <button className="btn primary" onClick={() => setConfirm(true)}>Finish &amp; submit</button>
              )}
            </div>
            <div className="tiny muted center mt hide-sm">Shortcuts: ← → to move · 1–9 to pick an option · F to flag</div>
          </section>
          <aside className="card" style={{ position: 'sticky', top: 90 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Questions</div>
            <div className="palette">
              {questions.map((qq, i) => (
                <button key={qq.id} onClick={() => setCurrent(i)} className={`${answers[qq.id]?.length ? 'answered' : ''} ${i === current ? 'current' : ''} ${flagged.has(i) ? 'flagged' : ''}`}>{i + 1}</button>
              ))}
            </div>
            <div className="stack small muted mt" style={{ gap: 4 }}>
              <span>🟪 Answered · <span style={{ color: 'var(--warning)' }}>●</span> Flagged</span>
            </div>
            <button className="btn primary block mt" onClick={() => setConfirm(true)} disabled={submitting}>Submit exam</button>
          </aside>
        </div>
      </main>

      {confirm && (
        <div className="modal-back" onClick={() => !submitting && setConfirm(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h2>Submit your exam?</h2>
            <p className="muted">
              You&apos;ve answered <b>{answeredCount}</b> of <b>{questions.length}</b> questions.
              {answeredCount < questions.length && <> <b style={{ color: 'var(--danger)' }}>{questions.length - answeredCount} unanswered</b> will be marked wrong.</>}
              {flagged.size > 0 && <> You have <b>{flagged.size}</b> flagged for review.</>}
            </p>
            {error && <div className="error-box mb">{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirm(false)} disabled={submitting}>Keep working</button>
              <button className="btn primary" onClick={() => submit(false)} disabled={submitting}>{submitting ? 'Grading…' : 'Submit now'}</button>
            </div>
          </div>
        </div>
      )}
      {timedOut && (
        <div className="modal-back"><div className="modal center" style={{ maxWidth: 360 }}><h2>⏰ Time&apos;s up!</h2><p className="muted">Submitting your answers…</p>{error && <div className="error-box">{error} <button className="btn sm" onClick={() => submit(true)}>Retry</button></div>}</div></div>
      )}
    </div>
  )
}
