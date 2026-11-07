'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import type { ExamSettings } from '@/lib/types'

export function ExamSettingsForm({ settings, pool }: { settings: ExamSettings; pool: number }) {
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)
  const { pending, error, run } = useAction()
  const num = (k: keyof ExamSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) })
  const bool = (k: keyof ExamSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.checked })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const { course_id, ...body } = s
    const r = await run(() => apiCall('PUT', `/admin/courses/${course_id}/exam-settings`, body))
    if (r !== undefined) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <form onSubmit={save} className="stack" style={{ maxWidth: 640 }}>
      <div className="grid grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <label className="field">Time limit (minutes)<input className="input" type="number" min={1} max={600} value={s.duration_minutes} onChange={num('duration_minutes')} /></label>
        <label className="field">Questions per attempt<span className="hint">{pool} exam questions in bank</span><input className="input" type="number" min={1} max={200} value={s.question_count} onChange={num('question_count')} /></label>
        <label className="field">Pass mark (%)<input className="input" type="number" min={1} max={100} value={s.pass_mark} onChange={num('pass_mark')} /></label>
        <label className="field">Max attempts<span className="hint">0 = unlimited</span><input className="input" type="number" min={0} max={100} value={s.max_attempts} onChange={num('max_attempts')} /></label>
        <label className="field">Cooldown between attempts (min)<span className="hint">0 = none</span><input className="input" type="number" min={0} value={s.cooldown_minutes} onChange={num('cooldown_minutes')} /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={s.shuffle_options} onChange={bool('shuffle_options')} /> Shuffle answer options</label>
      <label className="check-row"><input type="checkbox" checked={s.include_lower_levels} onChange={bool('include_lower_levels')} /> Top up with lower-level questions when the chosen level runs short</label>
      <label className="check-row"><input type="checkbox" checked={s.show_review} onChange={bool('show_review')} /> Show the correct answers and explanations after submitting</label>
      {s.question_count > pool && <div className="error-box" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>The bank only has {pool} exam questions, so attempts will contain fewer than {s.question_count}.</div>}
      {error && <div className="error-box">{error}</div>}
      <div className="row"><button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save exam settings'}</button>{saved && <span className="small" style={{ color: 'var(--success)' }}>✓ Saved</span>}</div>
    </form>
  )
}
