'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall } from '@/lib/client'
import { useAction } from '@/lib/client'
import { slugify } from '@/lib/slug'
import type { Course } from '@/lib/types'
import { CourseCover } from '../ui'

const ICONS = ['📘', '⚡', '💰', '🧠', '🧪', '🌍', '🎨', '📈', '🛠', '🩺', '⚖️', '🎵', '🧮', '💻', '🗣', '🔐']
const COLORS = ['#6d5efc', '#f5a524', '#17c964', '#0b7fd6', '#e5484d', '#c86bff', '#ff7eb3', '#12a594']

type Form = Omit<Course, 'id'>
const blank: Form = { title: '', slug: '', tagline: '', description: '', category: 'General', icon: '📘', color: '#6d5efc', published: false }

export function CourseForm({ course, onDone }: { course?: Course; onDone?: () => void }) {
  const [f, setF] = useState<Form>(course ?? blank)
  const [slugTouched, setSlugTouched] = useState(!!course)
  const [saved, setSaved] = useState(false)
  const { pending, error, run } = useAction()
  const router = useRouter()
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v, ...(k === 'title' && !slugTouched ? { slug: slugify(String(v)) } : {}) }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const r = await run(async () => (course ? apiCall('PATCH', `/admin/courses/${course.id}`, f) : apiCall<{ id: number }>('POST', '/admin/courses', f)))
    if (r === undefined) return
    if (!course && r && typeof r === 'object' && 'id' in r) router.push(`/admin/courses/${(r as { id: number }).id}`)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onDone?.()
  }

  return (
    <form onSubmit={save} className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 200px', gap: 20 }}>
        <div className="stack">
          <label className="field">Title<input className="input" required value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Intro to Python" /></label>
          <label className="field">URL slug<span className="hint">/courses/{f.slug || '…'}</span><input className="input" required value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></label>
          <label className="field">Tagline<input className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One line that sells the course" /></label>
          <label className="field">Category<input className="input" value={f.category} onChange={(e) => set('category', e.target.value)} /></label>
        </div>
        <div className="stack">
          <CourseCover icon={f.icon} color={f.color} height={100} />
          <div className="row wrap" style={{ gap: 4 }}>{ICONS.map((i) => <button type="button" key={i} className={`btn sm ${f.icon === i ? '' : 'ghost'}`} style={{ padding: '3px 6px' }} onClick={() => set('icon', i)}>{i}</button>)}</div>
          <div className="row wrap" style={{ gap: 6 }}>{COLORS.map((c) => <button type="button" key={c} onClick={() => set('color', c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: f.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} aria-label={c} />)}</div>
        </div>
      </div>
      <label className="field">Description<span className="hint">Supports **markdown**</span><textarea className="input" rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
      <label className="check-row"><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Published (visible in the catalog)</label>
      {error && <div className="error-box">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : course ? 'Save changes' : 'Create course'}</button>
        {saved && <span className="small" style={{ color: 'var(--success)' }}>✓ Saved</span>}
      </div>
    </form>
  )
}
