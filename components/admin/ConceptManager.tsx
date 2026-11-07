'use client'

import Link from 'next/link'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { slugify } from '@/lib/slug'
import { LEVELS, LEVEL_LABEL, type Level } from '@/lib/types'
import { LevelBadge } from '../ui'

type Row = { id: number; title: string; slug: string; level: Level; est_minutes: number; blocks: number; questions: number }

export function ConceptManager({ courseId, concepts }: { courseId: number; concepts: Row[] }) {
  const [list, setList] = useState(concepts)
  const [drag, setDrag] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<Level>('beginner')
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
    const r = await run(() => apiCall<{ id: number }>('POST', `/admin/courses/${courseId}/concepts`, { title, slug: slugify(title), level, blocks: [{ type: 'text', md: `## ${title}\n\nStart writing here…` }] }))
    if (r) window.location.href = `/admin/courses/${courseId}/concepts/${r.id}`
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
        <button className="btn primary" disabled={pending}>+ Add concept</button>
      </form>
      {error && <div className="error-box">{error}</div>}
      {dirty && <div className="row"><span className="small muted">Order changed</span><button className="btn sm primary" onClick={saveOrder} disabled={pending}>Save order</button></div>}
      {list.map((c, i) => (
        <div
          key={c.id}
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
          <button className="btn sm danger" onClick={() => remove(c)}>Delete</button>
        </div>
      ))}
      {!list.length && <div className="empty small">No concepts yet. Add the first one above.</div>}
    </div>
  )
}
