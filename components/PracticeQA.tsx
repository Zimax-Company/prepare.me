'use client'

import { useState } from 'react'
import { apiCall, errorMessage } from '@/lib/client'
import type { PublicQuestion } from '@/lib/types'
import { InlineMd, Markdown } from './Markdown'
import { QuestionInput } from './QuestionInput'
import { LevelBadge } from './ui'

type Result = { correct: boolean; answer: string[]; explanation: string }

export function PracticeQA({ questions, onFinished }: { questions: PublicQuestion[]; onFinished?: (score: number) => void }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [results, setResults] = useState<Record<number, Result>>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!questions.length) return <div className="empty small">No practice questions for this concept yet.</div>

  const finished = i >= questions.length
  const score = Object.values(results).filter((r) => r.correct).length

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="block-card center block-anim">
        <div style={{ fontSize: '2.6rem' }}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}</div>
        <h3>You got {score} of {questions.length} right ({pct}%)</h3>
        <p className="muted small">{pct >= 80 ? 'Excellent. You have a solid grip on this concept.' : pct >= 50 ? 'Good progress. Review the explanations, then try again.' : 'Worth another read. Revisit the examples above and retry.'}</p>
        <button className="btn" onClick={() => { setI(0); setAnswers({}); setResults({}) }}>↻ Practice again</button>
      </div>
    )
  }

  const q = questions[i]
  const value = answers[q.id] ?? []
  const result = results[q.id]

  async function check() {
    setPending(true)
    setError(null)
    try {
      const r = await apiCall<Result>('POST', `/practice/${q.id}`, { answer: value })
      setResults((s) => ({ ...s, [q.id]: r }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  function next() {
    const n = i + 1
    setI(n)
    if (n >= questions.length) onFinished?.(score)
  }

  return (
    <div className="block-card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="block-label" style={{ margin: 0 }}>💬 Practice Q&amp;A</div>
        <div className="row" style={{ gap: 6 }}>
          {questions.map((qq, j) => (
            <span key={qq.id} style={{ width: 10, height: 10, borderRadius: '50%', background: results[qq.id] ? (results[qq.id].correct ? 'var(--success)' : 'var(--danger)') : j === i ? 'var(--primary)' : 'var(--surface-2)', transition: 'background .3s' }} />
          ))}
        </div>
      </div>
      <div key={q.id} className="block-anim">
        <div className="row small muted" style={{ marginBottom: 6 }}>Question {i + 1} of {questions.length} <LevelBadge level={q.level} /></div>
        <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 14 }}><InlineMd text={q.prompt} /></div>
        <QuestionInput q={q} value={value} onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))} disabled={!!result} reveal={result?.answer} />
        {result && (
          <div className={`feedback mt ${result.correct ? 'ok' : 'no'}`}>
            <strong>{result.correct ? '✅ Correct!' : '❌ Not quite'}</strong>
            {result.explanation && <div className="small" style={{ marginTop: 4 }}><Markdown text={result.explanation} /></div>}
          </div>
        )}
        {error && <div className="error-box mt">{error}</div>}
        <div className="row mt">
          {!result ? (
            <button className="btn primary" onClick={check} disabled={pending || !value.length}>{pending ? 'Checking…' : 'Check answer'}</button>
          ) : (
            <button className="btn primary" onClick={next}>{i === questions.length - 1 ? 'See results' : 'Next question →'}</button>
          )}
          {!result && <button className="btn ghost" onClick={next}>Skip</button>}
        </div>
      </div>
    </div>
  )
}
