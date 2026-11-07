'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'
import { LEVELS, LEVEL_LABEL, QUESTION_TYPE_LABEL, type Level, type Question, type QuestionType } from '@/lib/types'
import { InlineMd } from '../Markdown'
import { QuestionInput } from '../QuestionInput'
import { LevelBadge } from '../ui'

type CourseOpt = { id: number; title: string; icon: string }
type ConceptOpt = { id: number; course_id: number; title: string; slug: string }

export function QuestionBank({ courses, concepts, questions, total }: { courses: CourseOpt[]; concepts: ConceptOpt[]; questions: Question[]; total: number }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [editing, setEditing] = useState<Partial<Question> | null>(null)
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState(sp.get('q') ?? '')
  const courseId = Number(sp.get('course')) || null
  const conceptName = useMemo(() => new Map(concepts.map((c) => [c.id, c.title])), [concepts])
  const courseName = useMemo(() => new Map(courses.map((c) => [c.id, `${c.icon} ${c.title}`])), [courses])

  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString())
    if (v) p.set(k, v)
    else p.delete(k)
    if (k === 'course') p.delete('concept')
    router.push(`?${p.toString()}`)
  }

  async function remove(q: Question) {
    if (!confirm('Delete this question? Past exam attempts that used it will lose it from their review.')) return
    await apiCall('DELETE', `/admin/questions/${q.id}`)
    router.refresh()
  }

  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div><h1 style={{ margin: 0 }}>Question bank</h1><p className="muted" style={{ margin: 0 }}>{total} questions{courseId ? ` in ${courseName.get(courseId)}` : ''}</p></div>
        <div className="row">
          <button className="btn" onClick={() => setImporting(true)} disabled={!courses.length}>⇪ Bulk import</button>
          <button className="btn primary" disabled={!courses.length} onClick={() => setEditing({ course_id: courseId ?? courses[0]?.id, level: 'beginner', type: 'single', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], answer: [], in_exam: true, in_practice: true, concept_id: null, prompt: '', explanation: '' })}>+ New question</button>
        </div>
      </div>
      <div className="card flat row wrap" style={{ padding: 12 }}>
        <select className="input" style={{ width: 220 }} value={sp.get('course') ?? ''} onChange={(e) => setFilter('course', e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
        </select>
        {courseId && (
          <select className="input" style={{ width: 220 }} value={sp.get('concept') ?? ''} onChange={(e) => setFilter('concept', e.target.value)}>
            <option value="">All concepts</option>
            <option value="none">Not linked to a concept</option>
            {concepts.filter((c) => c.course_id === courseId).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
        <select className="input" style={{ width: 160 }} value={sp.get('level') ?? ''} onChange={(e) => setFilter('level', e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        <select className="input" style={{ width: 170 }} value={sp.get('type') ?? ''} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          {Object.entries(QUESTION_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <form className="grow" onSubmit={(e) => { e.preventDefault(); setFilter('q', search) }}>
          <input className="input" placeholder="Search prompts… (Enter)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>
      <div className="card flat table-wrap" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th style={{ width: '45%' }}>Question</th><th>Type</th><th>Level</th><th className="hide-sm">Concept</th><th className="hide-sm">Used in</th><th></th></tr></thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="click" onClick={() => setEditing(q)}>
                <td><div style={{ fontWeight: 500 }}><InlineMd text={q.prompt.length > 140 ? q.prompt.slice(0, 140) + '…' : q.prompt} /></div>{!courseId && <div className="tiny muted">{courseName.get(q.course_id)}</div>}</td>
                <td className="small">{QUESTION_TYPE_LABEL[q.type]}</td>
                <td><LevelBadge level={q.level} /></td>
                <td className="small muted hide-sm">{q.concept_id ? conceptName.get(q.concept_id) : '—'}</td>
                <td className="hide-sm"><div className="row" style={{ gap: 4 }}>{q.in_practice && <span className="badge">Practice</span>}{q.in_exam && <span className="badge primary">Exam</span>}</div></td>
                <td onClick={(e) => e.stopPropagation()}><button className="btn sm ghost danger" onClick={() => remove(q)}>🗑</button></td>
              </tr>
            ))}
            {!questions.length && <tr><td colSpan={6} className="center muted" style={{ padding: 40 }}>No questions match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <QuestionEditor initial={editing} courses={courses} concepts={concepts} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh() }} />}
      {importing && <ImportModal courses={courses} concepts={concepts} defaultCourse={courseId ?? courses[0]?.id} onClose={() => setImporting(false)} onDone={() => { setImporting(false); router.refresh() }} />}
    </div>
  )
}

const LETTERS = 'abcdefghij'

function QuestionEditor({ initial, courses, concepts, onClose, onSaved }: { initial: Partial<Question>; courses: CourseOpt[]; concepts: ConceptOpt[]; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState<Partial<Question>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<string[]>([])
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setQ((s) => ({ ...s, [k]: v }))
  const type = q.type ?? 'single'
  const options = q.options ?? []
  const answer = q.answer ?? []

  const changeType = (t: QuestionType) => {
    if (t === 'true_false') setQ((s) => ({ ...s, type: t, options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }], answer: ['true'] }))
    else if (t === 'short') setQ((s) => ({ ...s, type: t, options: [], answer: [] }))
    else setQ((s) => ({ ...s, type: t, options: s.type === 'true_false' || s.type === 'short' || !s.options?.length ? [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }] : s.options, answer: t === 'single' ? (s.answer ?? []).slice(0, 1) : s.answer }))
  }
  const toggleCorrect = (id: string) => set('answer', type === 'multiple' ? (answer.includes(id) ? answer.filter((a) => a !== id) : [...answer, id]) : [id])

  async function save() {
    setPending(true)
    setError(null)
    try {
      const body = { course_id: q.course_id, concept_id: q.concept_id ?? null, level: q.level, type, prompt: q.prompt, options: options.filter((o) => o.text.trim()), answer: type === 'short' ? answer.map((a) => a.trim()).filter(Boolean) : answer, explanation: q.explanation ?? '', in_exam: q.in_exam ?? true, in_practice: q.in_practice ?? true }
      if (q.id) await apiCall('PUT', `/admin/questions/${q.id}`, body)
      else await apiCall('POST', '/admin/questions', body)
      onSaved()
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
        <div className="row between mb"><h2 style={{ margin: 0 }}>{q.id ? 'Edit question' : 'New question'}</h2><button className="btn ghost sm" onClick={onClose}>✕</button></div>
        <div className="editor" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' }}>
          <div className="stack">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field">Course<select className="input" value={q.course_id} onChange={(e) => setQ((s) => ({ ...s, course_id: Number(e.target.value), concept_id: null }))}>{courses.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
              <label className="field">Concept<select className="input" value={q.concept_id ?? ''} onChange={(e) => set('concept_id', e.target.value ? Number(e.target.value) : null)}><option value="">(none, exam only)</option>{concepts.filter((c) => c.course_id === q.course_id).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
              <label className="field">Level<select className="input" value={q.level} onChange={(e) => set('level', e.target.value as Level)}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select></label>
              <label className="field">Type<select className="input" value={type} onChange={(e) => changeType(e.target.value as QuestionType)}>{Object.entries(QUESTION_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
            <label className="field">Prompt<span className="hint">Supports `code`, **bold**, _italic_</span><textarea className="input" rows={3} value={q.prompt ?? ''} onChange={(e) => set('prompt', e.target.value)} /></label>
            {type === 'short' ? (
              <label className="field">Accepted answers<span className="hint">One per line. Matching ignores case and extra spaces.</span><textarea className="input" rows={3} value={answer.join('\n')} onChange={(e) => set('answer', e.target.value.split('\n'))} /></label>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                <div className="small" style={{ fontWeight: 600 }}>Options <span className="muted" style={{ fontWeight: 400 }}>· tick the correct {type === 'multiple' ? 'ones' : 'one'}</span></div>
                {options.map((o, i) => (
                  <div key={o.id} className="row" style={{ gap: 6 }}>
                    <input type={type === 'multiple' ? 'checkbox' : 'radio'} checked={answer.includes(o.id)} onChange={() => toggleCorrect(o.id)} style={{ width: 18, height: 18, accentColor: 'var(--success)' }} />
                    <input className="input grow" value={o.text} disabled={type === 'true_false'} placeholder={`Option ${LETTERS[i]?.toUpperCase()}`} onChange={(e) => set('options', options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)))} />
                    {type !== 'true_false' && <button className="btn sm ghost icon-btn danger" onClick={() => setQ((s) => ({ ...s, options: options.filter((x) => x.id !== o.id), answer: answer.filter((a) => a !== o.id) }))}>✕</button>}
                  </div>
                ))}
                {type !== 'true_false' && options.length < 10 && (
                  <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('options', [...options, { id: LETTERS.split('').find((l) => !options.some((o) => o.id === l)) ?? String(Date.now()), text: '' }])}>＋ Option</button>
                )}
              </div>
            )}
            <label className="field">Explanation<span className="hint">Shown after answering in practice and in the exam review</span><textarea className="input" rows={2} value={q.explanation ?? ''} onChange={(e) => set('explanation', e.target.value)} /></label>
            <div className="row wrap" style={{ gap: 18 }}>
              <label className="check-row"><input type="checkbox" checked={q.in_practice ?? true} onChange={(e) => set('in_practice', e.target.checked)} /> Use in concept practice</label>
              <label className="check-row"><input type="checkbox" checked={q.in_exam ?? true} onChange={(e) => set('in_exam', e.target.checked)} /> Use in exams</label>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="row"><button className="btn primary" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save question'}</button><button className="btn ghost" onClick={onClose}>Cancel</button></div>
          </div>
          <div className="card flat" style={{ background: 'var(--surface-2)' }}>
            <div className="tiny muted mb" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Student preview</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}><InlineMd text={q.prompt || 'Your question prompt…'} /></div>
            <QuestionInput q={{ id: 0, type, prompt: q.prompt ?? '', options: options.filter((o) => o.text), level: q.level ?? 'beginner' }} value={preview} onChange={setPreview} reveal={preview.length ? answer : null} />
            <div className="tiny muted mt">Click an answer to preview the feedback.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TEMPLATE = `[
  {
    "prompt": "What does HTML stand for?",
    "type": "single",
    "level": "beginner",
    "concept": "optional-concept-slug",
    "options": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language"],
    "answer": [0],
    "explanation": "HTML = HyperText Markup Language."
  },
  { "prompt": "CSS is a programming language.", "type": "true_false", "level": "beginner", "answer": [false] },
  { "prompt": "Which are JS frameworks?", "type": "multiple", "level": "intermediate", "options": ["React", "Vue", "Django"], "answer": [0, 1] },
  { "prompt": "Keyword to declare a constant?", "type": "short", "level": "beginner", "answer": ["const"] }
]`

function ImportModal({ courses, concepts, defaultCourse, onClose, onDone }: { courses: CourseOpt[]; concepts: ConceptOpt[]; defaultCourse?: number; onClose: () => void; onDone: () => void }) {
  const [courseId, setCourseId] = useState(defaultCourse)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function parse() {
    const raw = JSON.parse(text)
    if (!Array.isArray(raw)) throw new Error('Expected a JSON array of questions')
    const bySlug = new Map(concepts.filter((c) => c.course_id === courseId).map((c) => [c.slug, c.id]))
    return raw.map((r: any, i: number) => {
      const type = (r.type ?? 'single') as QuestionType
      const opts: string[] = (r.options ?? []).map((o: any) => (typeof o === 'string' ? o : o.text))
      const options = type === 'true_false' ? [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }] : type === 'short' ? [] : opts.map((t, j) => ({ id: LETTERS[j], text: t }))
      const answer = (r.answer ?? []).map((a: any) => {
        if (type === 'short') return String(a)
        if (type === 'true_false') return String(a).toLowerCase() === 'true' ? 'true' : 'false'
        return typeof a === 'number' ? LETTERS[a] : String(a)
      })
      if (!r.prompt) throw new Error(`Question ${i + 1}: missing prompt`)
      return { course_id: courseId, concept_id: r.concept ? bySlug.get(r.concept) ?? null : null, level: r.level ?? 'beginner', type, prompt: r.prompt, options, answer, explanation: r.explanation ?? '', in_exam: r.in_exam ?? true, in_practice: r.in_practice ?? true }
    })
  }

  let count = 0
  try { count = text.trim() ? parse().length : 0 } catch { count = -1 }

  async function go() {
    setPending(true)
    setError(null)
    try {
      await apiCall('POST', '/admin/questions', { questions: parse() })
      onDone()
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between mb"><h2 style={{ margin: 0 }}>Bulk import questions</h2><button className="btn ghost sm" onClick={onClose}>✕</button></div>
        <div className="stack">
          <label className="field">Into course<select className="input" value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>{courses.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
          <label className="field">
            <span className="row between">Questions JSON <button type="button" className="btn sm ghost" onClick={() => setText(TEMPLATE)}>Insert template</button></span>
            <span className="hint">For choice questions, `answer` lists option indexes starting at 0. For true/false, use true or false. For short answers, list the accepted strings. `concept` is an optional concept slug.</span>
            <textarea className="input mono" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder={TEMPLATE} />
          </label>
          {count === -1 && text.trim() && <div className="small" style={{ color: 'var(--danger)' }}>Invalid JSON</div>}
          {count > 0 && <div className="small" style={{ color: 'var(--success)' }}>✓ {count} questions ready to import</div>}
          {error && <div className="error-box">{error}</div>}
          <div className="row"><button className="btn primary" onClick={go} disabled={pending || count <= 0}>{pending ? 'Importing…' : `Import ${count > 0 ? count : ''} questions`}</button></div>
        </div>
      </div>
    </div>
  )
}
