'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiCall, errorMessage } from '@/lib/client'
import { slugify } from '@/lib/slug'
import { BLOCK_META, emptyBlock, LEVELS, LEVEL_LABEL, type Block, type BlockType, type Level } from '@/lib/types'
import { Blocks } from '../Blocks'

type Meta = { title: string; slug: string; summary: string; level: Level; est_minutes: number }

export function ConceptEditor({ id, courseId, courseSlug, initial }: { id: number; courseId: number; courseSlug: string; initial: Meta & { blocks: Block[] } }) {
  const [meta, setMeta] = useState<Meta>({ title: initial.title, slug: initial.slug, summary: initial.summary, level: initial.level, est_minutes: initial.est_minutes })
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [view, setView] = useState<'split' | 'edit' | 'preview'>('split')
  const stateRef = useRef({ meta, blocks })
  stateRef.current = { meta, blocks }

  const touch = () => setDirty(true)
  const setM = <K extends keyof Meta>(k: K, v: Meta[K]) => { setMeta((m) => ({ ...m, [k]: v })); touch() }
  const update = (i: number, b: Block) => { setBlocks((bs) => bs.map((x, j) => (j === i ? b : x))); touch() }
  const insert = (at: number, type: BlockType) => { setBlocks((bs) => [...bs.slice(0, at), emptyBlock(type), ...bs.slice(at)]); setAdding(null); touch() }
  const remove = (i: number) => { setBlocks((bs) => bs.filter((_, j) => j !== i)); touch() }
  const dup = (i: number) => { setBlocks((bs) => [...bs.slice(0, i + 1), structuredClone(bs[i]), ...bs.slice(i + 1)]); touch() }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= blocks.length) return
    setBlocks((bs) => { const n = [...bs]; [n[i], n[j]] = [n[j], n[i]]; return n })
    touch()
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const { meta, blocks } = stateRef.current
      await apiCall('PATCH', `/admin/concepts/${id}`, { ...meta, blocks })
      setDirty(false)
      setSavedAt(new Date())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ⌘S / Ctrl+S to save; warn before leaving with unsaved changes.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() } }
    const u = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('keydown', k)
    window.addEventListener('beforeunload', u)
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('beforeunload', u) }
  })

  const AddMenu = ({ at }: { at: number }) =>
    adding === at ? (
      <div className="card flat block-anim" style={{ padding: 12 }}>
        <div className="row between mb"><b className="small">Add a block</b><button className="btn sm ghost" onClick={() => setAdding(null)}>✕</button></div>
        <div className="add-menu">
          {(Object.keys(BLOCK_META) as BlockType[]).map((t) => (
            <button key={t} onClick={() => insert(at, t)} title={BLOCK_META[t].hint}><span style={{ width: 22, textAlign: 'center' }}>{BLOCK_META[t].icon}</span>{BLOCK_META[t].label}</button>
          ))}
        </div>
      </div>
    ) : (
      <button className="btn sm ghost" style={{ alignSelf: 'center', opacity: 0.7 }} onClick={() => setAdding(at)}>＋ Add block</button>
    )

  return (
    <div className="stack-lg">
      <div className="row between wrap" style={{ position: 'sticky', top: 60, zIndex: 20, background: 'var(--bg)', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <Link href={`/admin/courses/${courseId}`} className="small muted">← Back to course</Link>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{meta.title || 'Untitled concept'}</div>
        </div>
        <div className="row wrap">
          <div className="tabs" style={{ margin: 0, border: 'none' }}>
            {(['edit', 'split', 'preview'] as const).map((v) => <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>{v}</button>)}
          </div>
          <span className="small muted">{saving ? 'Saving…' : dirty ? '● Unsaved changes' : savedAt ? `✓ Saved ${savedAt.toLocaleTimeString()}` : ''}</span>
          <Link className="btn" href={`/learn/${courseSlug}/${meta.slug}`} target="_blank">Open as student ↗</Link>
          <button className="btn primary" onClick={save} disabled={saving || !dirty}>Save <span className="tiny" style={{ opacity: 0.7 }}>⌘S</span></button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className={view === 'split' ? 'editor' : ''}>
        {view !== 'preview' && (
          <div className="stack">
            <div className="card stack">
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="field">Title<input className="input" value={meta.title} onChange={(e) => setM('title', e.target.value)} /></label>
                <label className="field">Slug<input className="input" value={meta.slug} onChange={(e) => setM('slug', slugify(e.target.value))} /></label>
                <label className="field">Level<select className="input" value={meta.level} onChange={(e) => setM('level', e.target.value as Level)}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select></label>
                <label className="field">Est. minutes<input className="input" type="number" min={1} value={meta.est_minutes} onChange={(e) => setM('est_minutes', Number(e.target.value))} /></label>
              </div>
              <label className="field">Summary<input className="input" value={meta.summary} onChange={(e) => setM('summary', e.target.value)} placeholder="One-line description shown in the outline" /></label>
            </div>
            <AddMenu at={0} />
            {blocks.map((b, i) => (
              <div key={i} className="stack" style={{ gap: 10 }}>
                <div className="block-edit">
                  <div className="block-edit-head">
                    <span>{BLOCK_META[b.type].icon}</span>
                    <span className="grow" style={{ cursor: 'pointer' }} onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(i)) n.delete(i); else n.add(i); return n })}>
                      {BLOCK_META[b.type].label} {collapsed.has(i) && <span className="muted tiny">· collapsed</span>}
                    </span>
                    <button className="btn sm ghost icon-btn" onClick={() => move(i, -1)} title="Move up">↑</button>
                    <button className="btn sm ghost icon-btn" onClick={() => move(i, 1)} title="Move down">↓</button>
                    <button className="btn sm ghost icon-btn" onClick={() => dup(i)} title="Duplicate">⧉</button>
                    <button className="btn sm ghost icon-btn danger" onClick={() => remove(i)} title="Delete">🗑</button>
                  </div>
                  {!collapsed.has(i) && <div className="block-edit-body"><BlockFields block={b} onChange={(nb) => update(i, nb)} /></div>}
                </div>
                <AddMenu at={i + 1} />
              </div>
            ))}
          </div>
        )}
        {view !== 'edit' && (
          <div className="editor-preview">
            <div className="card" style={{ padding: 28 }}>
              <div className="tiny muted mb" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Live preview</div>
              <h1 style={{ fontSize: '1.8rem' }}>{meta.title}</h1>
              {meta.summary && <p className="muted">{meta.summary}</p>}
              <Blocks blocks={blocks} animate={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Per-type field editors -----------------------------------------------------------------

const T = ({ label, value, onChange, rows = 1, mono = false, placeholder }: { label?: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean; placeholder?: string }) => (
  <label className="field">
    {label}
    {rows > 1 ? (
      <textarea className={`input ${mono ? 'mono' : ''}`} rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className="input" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
)

/** Editable list helper with add/remove/reorder. */
function ListEditor<I>({ items, onChange, make, render, addLabel }: { items: I[]; onChange: (v: I[]) => void; make: () => I; render: (item: I, set: (v: I) => void, i: number) => React.ReactNode; addLabel: string }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
          <span className="tiny muted" style={{ paddingTop: 10, width: 18 }}>{i + 1}</span>
          <div className="grow stack" style={{ gap: 6 }}>{render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
          <div className="stack" style={{ gap: 2 }}>
            <button className="btn sm ghost icon-btn" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n) }}>↑</button>
            <button className="btn sm ghost icon-btn danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
          </div>
        </div>
      ))}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...items, make()])}>＋ {addLabel}</button>
    </div>
  )
}

function BlockFields({ block: b, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = (patch: Partial<Block>) => onChange({ ...b, ...patch } as Block)
  switch (b.type) {
    case 'text':
      return <T rows={8} mono value={b.md} onChange={(md) => set({ md })} placeholder={'## Heading\nParagraph with **bold**, _italic_, `code`\n- bullet\n1. numbered'} />
    case 'callout':
      return (
        <>
          <div className="row">
            <select className="input" style={{ width: 140 }} value={b.tone} onChange={(e) => set({ tone: e.target.value as typeof b.tone })}>
              {['info', 'tip', 'warning', 'success'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input grow" value={b.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title" />
          </div>
          <T rows={3} value={b.md} onChange={(md) => set({ md })} />
        </>
      )
    case 'code':
      return (
        <>
          <div className="row"><input className="input" style={{ width: 120 }} value={b.language} onChange={(e) => set({ language: e.target.value })} placeholder="lang" /><input className="input grow" value={b.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption (optional)" /></div>
          <T rows={8} mono value={b.code} onChange={(code) => set({ code })} />
        </>
      )
    case 'example':
      return (
        <>
          <T label="Title" value={b.title} onChange={(title) => set({ title })} />
          <T label="Problem" rows={3} value={b.problem} onChange={(problem) => set({ problem })} />
          <T label="Solution (hidden until revealed)" rows={4} mono value={b.solution} onChange={(solution) => set({ solution })} />
        </>
      )
    case 'image':
      return (
        <>
          <T label="Image URL" value={b.url} onChange={(url) => set({ url })} placeholder="https://…" />
          <div className="row"><input className="input grow" value={b.alt} onChange={(e) => set({ alt: e.target.value })} placeholder="Alt text" /><input className="input grow" value={b.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption" /></div>
        </>
      )
    case 'video':
      return (
        <>
          <T label="YouTube / Vimeo / MP4 URL" value={b.url} onChange={(url) => set({ url })} />
          <T label="Caption" value={b.caption ?? ''} onChange={(caption) => set({ caption })} />
        </>
      )
    case 'diagram':
      return (
        <>
          <T label="Title" value={b.title ?? ''} onChange={(title) => set({ title })} />
          <div className="small" style={{ fontWeight: 600 }}>Steps in the flow</div>
          <ListEditor items={b.nodes} onChange={(nodes) => set({ nodes })} make={() => ''} addLabel="Step" render={(n, s) => <input className="input" value={n} onChange={(e) => s(e.target.value)} />} />
        </>
      )
    case 'flashcards':
      return <ListEditor items={b.cards} onChange={(cards) => set({ cards })} make={() => ({ front: '', back: '' })} addLabel="Card" render={(c, s) => (
        <div className="row"><input className="input grow" placeholder="Front" value={c.front} onChange={(e) => s({ ...c, front: e.target.value })} /><input className="input grow" placeholder="Back" value={c.back} onChange={(e) => s({ ...c, back: e.target.value })} /></div>
      )} />
    case 'steps':
      return (
        <>
          <T label="Title" value={b.title} onChange={(title) => set({ title })} />
          <ListEditor items={b.steps} onChange={(steps) => set({ steps })} make={() => ({ title: '', md: '' })} addLabel="Step" render={(st, s) => (
            <><input className="input" placeholder="Step title" value={st.title} onChange={(e) => s({ ...st, title: e.target.value })} /><textarea className="input" rows={2} placeholder="Explanation" value={st.md} onChange={(e) => s({ ...st, md: e.target.value })} /></>
          )} />
        </>
      )
    case 'reveal':
      return <ListEditor items={b.items} onChange={(items) => set({ items })} make={() => ({ q: '', a: '' })} addLabel="Question" render={(it, s) => (
        <><input className="input" placeholder="Question" value={it.q} onChange={(e) => s({ ...it, q: e.target.value })} /><textarea className="input" rows={2} placeholder="Answer" value={it.a} onChange={(e) => s({ ...it, a: e.target.value })} /></>
      )} />
    case 'order':
      return (
        <>
          <T label="Prompt" value={b.prompt} onChange={(prompt) => set({ prompt })} />
          <div className="small" style={{ fontWeight: 600 }}>Items in the <u>correct</u> order (students see them shuffled)</div>
          <ListEditor items={b.items} onChange={(items) => set({ items })} make={() => ''} addLabel="Item" render={(n, s) => <input className="input" value={n} onChange={(e) => s(e.target.value)} />} />
        </>
      )
    case 'match':
      return (
        <>
          <T label="Prompt" value={b.prompt} onChange={(prompt) => set({ prompt })} />
          <ListEditor items={b.pairs} onChange={(pairs) => set({ pairs })} make={() => ({ left: '', right: '' })} addLabel="Pair" render={(p, s) => (
            <div className="row"><input className="input grow" placeholder="Term" value={p.left} onChange={(e) => s({ ...p, left: e.target.value })} /><span>↔</span><input className="input grow" placeholder="Match" value={p.right} onChange={(e) => s({ ...p, right: e.target.value })} /></div>
          )} />
        </>
      )
    case 'check':
      return (
        <>
          <T label="Question" value={b.question} onChange={(question) => set({ question })} />
          <div className="small" style={{ fontWeight: 600 }}>Options (select the correct one)</div>
          <ListEditor items={b.options} onChange={(options) => set({ options, correct: Math.min(b.correct, Math.max(0, options.length - 1)) })} make={() => ''} addLabel="Option" render={(o, s, i) => (
            <div className="row"><input type="radio" name={`c-${b.question}`} checked={b.correct === i} onChange={() => set({ correct: i })} style={{ accentColor: 'var(--success)' }} /><input className="input grow" value={o} onChange={(e) => s(e.target.value)} /></div>
          )} />
          <T label="Explanation (optional)" rows={2} value={b.explanation ?? ''} onChange={(explanation) => set({ explanation })} />
        </>
      )
  }
}
