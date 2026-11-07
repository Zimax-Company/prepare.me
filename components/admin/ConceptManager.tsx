'use client'

import Link from 'next/link'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { slugify } from '@/lib/slug'
import { LEVELS, LEVEL_LABEL, type Level } from '@/lib/types'
import { LevelBadge } from '../ui'

type Row = { id: number; section_id: number | null; title: string; slug: string; level: Level; est_minutes: number; blocks: number; questions: number }

export function ConceptManager({ courseId, concepts, sections }: { courseId: number; concepts: Row[]; sections: { id: number; title: string }[] }) {
  const [list, setList] = useState(concepts)
  const [drag, setDrag] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<Level>('beginner')
  const [sectionId, setSectionId] = useState<number | ''>(sections.at(-1)?.id ?? '')
  const sectionTitle = new Map(sections.map((x) => [x.id, x.title]))
  const { pending, error, run } = useAction()
  const [dirty, setDirty] = useState(false)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return
    setList((l) => { const n = [...l]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n })
    setDirty(true)
  }

  async function saveOrder() {
    await run(() => apiCall('PUT', `/admin/courses/${courseId}/concepts/order`, { ids: list.map((c) => c.id) }))
    setDirty(false)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const r = await run(() => apiCall<{ id: number }>('POST', `/admin/courses/${courseId}/concepts`, { title, slug: slugify(title), level, section_id: sectionId || null, blocks: [{ type: 'text', md: `## ${title}\n\nStart writing here…` }] }))
    if (r) window.location.href = `/admin/courses/${courseId}/concepts/${r.id}`
  }

  async function assign(c: Row, section_id: number | null) {
    await run(() => apiCall('PATCH', `/admin/concepts/${c.id}`, { section_id }), { refresh: false })
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, section_id } : x)))
  }

  async function remove(c: Row) {
    if (!confirm(`Delete "${c.title}"? Its practice questions stay in the bank but are unlinked.`)) return
    await run(() => apiCall('DELETE', `/admin/concepts/${c.id}`))
    setList((l) => l.filter((x) => x.id !== c.id))
  }

  return (
    <div className="stack">
      <form onSubmit={add} className="card flat row wrap">
        <input className="input grow" style={{ minWidth: 220 }} placeholder="New concept title…" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
        <select className="input" style={{ width: 160 }} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        {sections.length > 0 && (
          <select className="input" style={{ width: 220 }} value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">No section</option>
            {sections.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        )}
        <button className="btn primary" disabled={pending}>+ Add concept</button>
      </form>
      {error && <div className="error-box">{error}</div>}
      {dirty && <div className="row"><span className="small muted">Order changed</span><button className="btn sm primary" onClick={saveOrder} disabled={pending}>Save order</button></div>}
      {list.map((c, i) => (
        <div key={c.id} className="stack" style={{ gap: 6 }}>
        {sections.length > 0 && (i === 0 || list[i - 1].section_id !== c.section_id) && (
          <div className="small" style={{ fontWeight: 700, marginTop: i ? 14 : 0, color: c.section_id ? 'var(--primary)' : 'var(--muted)' }}>{c.section_id ? sectionTitle.get(c.section_id) : 'No section'}</div>
        )}
        <div
          className={`concept-item ${drag === i ? 'dragging' : ''}`}
          draggable
          onDragStart={() => setDrag(i)}
          onDragEnd={() => setDrag(null)}
          onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setDrag(i) } }}
          style={{ cursor: 'grab', opacity: drag === i ? 0.5 : 1 }}
        >
          <span className="grip">⋮⋮</span>
          <div className="concept-num">{i + 1}</div>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{c.title}</div>
            <div className="tiny muted">{c.blocks} blocks · {c.questions} questions · {c.est_minutes} min</div>
          </div>
          <LevelBadge level={c.level} />
          <button className="btn sm ghost icon-btn" onClick={() => move(i, i - 1)}>↑</button>
          <button className="btn sm ghost icon-btn" onClick={() => move(i, i + 1)}>↓</button>
          <Link className="btn sm" href={`/admin/courses/${courseId}/concepts/${c.id}`}>Edit</Link>
          {sections.length > 0 && (
            <select className="input hide-sm" style={{ width: 150, padding: '4px 8px', fontSize: '0.8rem' }} value={c.section_id ?? ''} title="Move to section" onChange={(e) => assign(c, e.target.value ? Number(e.target.value) : null)}>
              <option value="">No section</option>
              {sections.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          )}
          <button className="btn sm danger" onClick={() => remove(c)}>Delete</button>
        </div>
        </div>
      ))}
      {!list.length && <div className="empty small">No concepts yet. Add the first one above.</div>}
    </div>
  )
}
