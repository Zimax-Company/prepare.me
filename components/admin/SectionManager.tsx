'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import type { Section } from '@/lib/learning'

export function SectionManager({ courseId, sections }: { courseId: number; sections: Section[] }) {
  const [editing, setEditing] = useState<Partial<Section> | null>(null)
  const { pending, error, run } = useAction()

  async function save() {
    if (!editing) return
    const body = { title: editing.title ?? '', objective: editing.objective ?? '', competencies: (editing.competencies ?? []).map((c) => c.trim()).filter(Boolean), assessment: editing.assessment ?? '' }
    const r = await run(() => (editing.id ? apiCall('PATCH', `/admin/sections/${editing.id}`, body) : apiCall('POST', `/admin/courses/${courseId}/sections`, body)))
    if (r !== undefined) setEditing(null)
  }

  async function remove(s: Section) {
    if (!confirm(`Delete section "${s.title}"? Its concepts are kept but become unsectioned.`)) return
    await run(() => apiCall('DELETE', `/admin/sections/${s.id}`))
  }

  return (
    <details className="card flat section-card">
      <summary><div className="grow"><b>Sections</b> <span className="small muted">({sections.length}) · group concepts into levels or units</span></div></summary>
      <div className="stack mt">
        {sections.map((s) => (
          <div key={s.id} className="row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <div className="grow"><div style={{ fontWeight: 600 }}>{s.title}</div><div className="tiny muted">{s.objective}</div></div>
            <button className="btn sm" onClick={() => setEditing(s)}>Edit</button>
            <button className="btn sm danger" onClick={() => remove(s)}>Delete</button>
          </div>
        ))}
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing({ title: '', objective: '', competencies: [], assessment: '' })}>＋ Add section</button>
        {error && <div className="error-box">{error}</div>}
      </div>
      {editing && (
        <div className="modal-back" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing.id ? 'Edit section' : 'New section'}</h2>
            <div className="stack">
              <label className="field">Title<input className="input" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Level 1: Foundations" /></label>
              <label className="field">Objective<textarea className="input" rows={2} value={editing.objective ?? ''} onChange={(e) => setEditing({ ...editing, objective: e.target.value })} /></label>
              <label className="field">Expected competencies<span className="hint">One per line</span><textarea className="input" rows={4} value={(editing.competencies ?? []).join('\n')} onChange={(e) => setEditing({ ...editing, competencies: e.target.value.split('\n') })} /></label>
              <label className="field">Assessment<input className="input" value={editing.assessment ?? ''} onChange={(e) => setEditing({ ...editing, assessment: e.target.value })} /></label>
              <div className="row"><button className="btn primary" onClick={save} disabled={pending || !editing.title?.trim()}>Save section</button><button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </details>
  )
}
