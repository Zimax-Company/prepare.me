'use client'

import type { PublicQuestion } from '@/lib/types'
import { InlineMd } from './Markdown'

/** Renders the answer UI for any question type. `reveal` shows correct/incorrect states. */
export function QuestionInput({ q, value, onChange, disabled, reveal }: {
  q: PublicQuestion
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
  reveal?: string[] | null
}) {
  if (q.type === 'short') {
    const correct = reveal ? reveal.some((a) => a.trim().toLowerCase() === (value[0] ?? '').trim().toLowerCase()) : null
    return (
      <div className="stack" style={{ gap: 8 }}>
        <input
          className="input"
          style={{ fontSize: '1.05rem', padding: '12px 14px', borderColor: reveal ? (correct ? 'var(--success)' : 'var(--danger)') : undefined }}
          placeholder="Type your answer…"
          value={value[0] ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
          autoFocus
        />
        {reveal && !correct && <div className="small">Accepted answer{reveal.length > 1 ? 's' : ''}: <b>{reveal.join(' · ')}</b></div>}
      </div>
    )
  }
  const multi = q.type === 'multiple'
  const toggle = (id: string) => {
    if (multi) onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    else onChange([id])
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {multi && !reveal && <div className="tiny muted">Select all that apply</div>}
      {q.options.map((o, i) => {
        const sel = value.includes(o.id)
        let state = sel ? 'sel' : ''
        if (reveal) state = reveal.includes(o.id) ? 'right' : sel ? 'wrong' : ''
        return (
          <button key={o.id} type="button" className={`q-option ${state}`} disabled={disabled} onClick={() => toggle(o.id)} aria-pressed={sel}>
            <span className="q-key" style={multi ? { borderRadius: 6 } : undefined}>{multi ? (sel ? '✓' : '') : q.type === 'true_false' ? (o.id === 'true' ? 'T' : 'F') : String.fromCharCode(97 + i)}</span>
            <span className="grow"><InlineMd text={o.text} /></span>
            {reveal && reveal.includes(o.id) && <span>✓</span>}
          </button>
        )
      })}
    </div>
  )
}
