'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Block } from '@/lib/types'
import { InlineMd, Markdown } from './Markdown'
import { highlight } from './highlight'

export function Blocks({ blocks, animate = true }: { blocks: Block[]; animate?: boolean }) {
  return (
    <div className="blocks">
      {blocks.map((b, i) => (
        <div key={i} data-block={i} className={animate ? 'block-anim' : ''} style={animate ? { animationDelay: `${Math.min(i, 8) * 60}ms` } : undefined}>
          <BlockView block={b} />
        </div>
      ))}
    </div>
  )
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text': return <Markdown text={block.md} />
    case 'callout': return <Callout {...block} />
    case 'code': return <CodeBlock {...block} />
    case 'example': return <Example {...block} />
    case 'image': return <ImageBlock {...block} />
    case 'diagram': return <Diagram {...block} />
    case 'flashcards': return <Flashcards {...block} />
    case 'steps': return <Steps {...block} />
    case 'reveal': return <Reveal {...block} />
    case 'order': return <OrderDrill {...block} />
    case 'match': return <MatchPairs {...block} />
    case 'check': return <QuickCheck {...block} />
    case 'video': return <Video {...block} />
    default: return null
  }
}

const Label = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <div className="block-label"><span>{icon}</span>{children}</div>
)

function Callout({ tone, title, md }: Extract<Block, { type: 'callout' }>) {
  const icon = { info: 'ℹ️', tip: '💡', warning: '⚠️', success: '✅' }[tone] ?? '💡'
  return (
    <div className={`callout ${tone}`}>
      <div className="callout-icon">{icon}</div>
      <div className="grow">
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}><InlineMd text={title} /></div>}
        <Markdown text={md} />
      </div>
    </div>
  )
}

function CodeBlock({ code, language, caption }: Extract<Block, { type: 'code' }>) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      {(caption || language) && (
        <div className="code-head"><span>{caption}</span><span>{language}</span></div>
      )}
      <div className="code-block">
        <pre className="code"><code>{highlight(code)}</code></pre>
        <button
          className="copy"
          onClick={() => {
            navigator.clipboard?.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function Example({ title, problem, solution }: Extract<Block, { type: 'example' }>) {
  const [open, setOpen] = useState(false)
  return (
    <div className="block-card">
      <Label icon="🧪">Worked example</Label>
      <h3><InlineMd text={title} /></h3>
      <Markdown text={problem} />
      <div className="mt">
        {open ? (
          <div className="feedback ok"><div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>Solution</div><Markdown text={solution} /></div>
        ) : (
          <button className="btn sm" onClick={() => setOpen(true)}>Try it yourself, then reveal the solution →</button>
        )}
      </div>
    </div>
  )
}

function ImageBlock({ url, alt, caption }: Extract<Block, { type: 'image' }>) {
  if (!url) return null
  return (
    <figure style={{ margin: 0, textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} style={{ maxHeight: 360, borderRadius: 12 }} />
      {caption && <figcaption className="muted small mt">{caption}</figcaption>}
    </figure>
  )
}

function Video({ url, caption }: Extract<Block, { type: 'video' }>) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  const embed = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        {embed ? (
          <iframe src={embed} title={caption ?? 'Video'} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        ) : (
          <video src={url} controls style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        )}
      </div>
      {caption && <figcaption className="muted small mt center">{caption}</figcaption>}
    </figure>
  )
}

/** Flow graphic that lights up step by step; autoplays when scrolled into view. */
function Diagram({ title, nodes }: Extract<Block, { type: 'diagram' }>) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPlaying(true); io.disconnect() } }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    if (active >= nodes.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setActive((a) => a + 1), active < 0 ? 200 : 750)
    return () => clearTimeout(t)
  }, [playing, active, nodes.length])

  return (
    <div className="block-card" ref={ref}>
      <div className="row between">
        <Label icon="➜">{title || 'Diagram'}</Label>
        <button className="btn sm ghost" onClick={() => { setActive(-1); setPlaying(true) }}>↻ Replay</button>
      </div>
      <div className="flow">
        {nodes.map((n, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 && <div className={`flow-arrow ${i <= active ? 'on' : ''}`}>→</div>}
            <button className={`flow-node ${i <= active ? 'on' : ''}`} onClick={() => { setPlaying(false); setActive(i) }} style={{ font: 'inherit', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', color: 'inherit' }}>
              <span><span className="tiny muted" style={{ display: 'block' }}>{i + 1}</span><InlineMd text={n} /></span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Flashcards({ cards }: Extract<Block, { type: 'flashcards' }>) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setFlipped((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  return (
    <div className="block-card">
      <div className="row between"><Label icon="🃏">Flashcards</Label><span className="tiny muted">{flipped.size}/{cards.length} flipped · tap to flip</span></div>
      <div className="flashcards">
        {cards.map((c, i) => (
          <div key={i} className={`flip ${flipped.has(i) ? 'on' : ''}`} onClick={() => toggle(i)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(i)}>
            <div className="flip-inner">
              <div className="flip-face flip-front"><InlineMd text={c.front} /></div>
              <div className="flip-face flip-back"><span>{c.back.split(/\n\s*\n/).map((para, j) => <span key={j} className="flip-para"><InlineMd text={para} /></span>)}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Steps({ title, steps }: Extract<Block, { type: 'steps' }>) {
  const [i, setI] = useState(0)
  const step = steps[i]
  if (!step) return null
  return (
    <div className="block-card">
      <Label icon="👣">Step-through</Label>
      {title && <h3><InlineMd text={title} /></h3>}
      <div className="steps-track">{steps.map((_, j) => <span key={j} className={j <= i ? 'on' : ''} />)}</div>
      <div key={i} className="block-anim" style={{ minHeight: 70 }}>
        <div className="small muted">Step {i + 1} of {steps.length}</div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0 6px' }}><InlineMd text={step.title} /></div>
        <Markdown text={step.md} />
      </div>
      <div className="row mt">
        <button className="btn sm" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
        {i < steps.length - 1 ? (
          <button className="btn sm primary" onClick={() => setI(i + 1)}>Next step →</button>
        ) : (
          <button className="btn sm" onClick={() => setI(0)}>↻ Start over</button>
        )}
      </div>
    </div>
  )
}

function Reveal({ items }: Extract<Block, { type: 'reveal' }>) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div>
      <Label icon="❓">Common questions</Label>
      {items.map((it, i) => (
        <div key={i} className="accordion-item">
          <button className="accordion-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span><InlineMd text={it.q} /></span>
            <span style={{ transition: 'transform .2s', transform: open === i ? 'rotate(45deg)' : 'none' }}>＋</span>
          </button>
          {open === i && <div className="accordion-a"><Markdown text={it.a} /></div>}
        </div>
      ))}
    </div>
  )
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  // Don't start already-solved.
  if (a.length > 1 && a.every((x, i) => x === items[i])) [a[0], a[1]] = [a[1], a[0]]
  return a
}

/** Drag (or use arrows) to arrange items in the right order. */
function OrderDrill({ prompt, items }: Extract<Block, { type: 'order' }>) {
  const [list, setList] = useState<string[]>(items)
  const [checked, setChecked] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  useEffect(() => setList(shuffled(items)), [items])
  const solved = checked && list.every((x, i) => x === items[i])

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return
    setChecked(false)
    setList((l) => { const n = [...l]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n })
  }

  return (
    <div className="block-card">
      <Label icon="↕">Put in order</Label>
      <p style={{ fontWeight: 600 }}><InlineMd text={prompt} /></p>
      <div>
        {list.map((item, i) => (
          <div
            key={item}
            draggable
            onDragStart={() => setDrag(i)}
            onDragEnd={() => setDrag(null)}
            onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setDrag(i) } }}
            className={`order-item ${drag === i ? 'dragging' : ''} ${checked ? (item === items[i] ? 'right' : 'wrong') : ''}`}
          >
            <span className="grip">⋮⋮</span>
            <span className="grow"><InlineMd text={item} /></span>
            <button className="btn sm ghost icon-btn" onClick={() => move(i, i - 1)} aria-label="Move up">↑</button>
            <button className="btn sm ghost icon-btn" onClick={() => move(i, i + 1)} aria-label="Move down">↓</button>
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn sm primary" onClick={() => setChecked(true)}>Check order</button>
        <button className="btn sm ghost" onClick={() => { setChecked(false); setList(shuffled(items)) }}>Shuffle</button>
        {checked && <span className={solved ? '' : 'muted'} style={{ fontWeight: 600, color: solved ? 'var(--success)' : undefined }}>{solved ? '🎉 Perfect!' : `${list.filter((x, i) => x === items[i]).length}/${items.length} in the right place`}</span>}
      </div>
    </div>
  )
}

/** Tap a term then its match. Correct pairs lock in; wrong ones shake. */
function MatchPairs({ prompt, pairs }: Extract<Block, { type: 'match' }>) {
  const [right, setRight] = useState<string[]>(pairs.map((p) => p.right))
  useEffect(() => setRight(shuffled(pairs.map((p) => p.right))), [pairs])
  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [bad, setBad] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  const answerOf = useMemo(() => new Map(pairs.map((p, i) => [i, p.right])), [pairs])

  const pickRight = (r: string) => {
    if (selLeft === null) return
    setTries((t) => t + 1)
    if (answerOf.get(selLeft) === r) {
      setDone((d) => new Set(d).add(selLeft))
      setSelLeft(null)
    } else {
      setBad(r)
      setTimeout(() => setBad(null), 400)
    }
  }
  const doneRights = new Set([...done].map((i) => pairs[i].right))
  const complete = done.size === pairs.length

  return (
    <div className="block-card">
      <div className="row between"><Label icon="🔗">Match pairs</Label><span className="tiny muted">{done.size}/{pairs.length} matched</span></div>
      <p style={{ fontWeight: 600 }}><InlineMd text={prompt} /></p>
      <div className="match-grid">
        <div className="stack" style={{ gap: 8 }}>
          {pairs.map((p, i) => (
            <button key={i} className={`match-btn ${done.has(i) ? 'done' : selLeft === i ? 'sel' : ''}`} disabled={done.has(i)} onClick={() => setSelLeft(i)}>
              <InlineMd text={p.left} />
            </button>
          ))}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {right.map((r) => (
            <button key={r} className={`match-btn ${doneRights.has(r) ? 'done' : ''} ${bad === r ? 'bad' : ''}`} disabled={doneRights.has(r)} onClick={() => pickRight(r)}>
              <InlineMd text={r} />
            </button>
          ))}
        </div>
      </div>
      {complete && (
        <div className="feedback ok mt">
          🎉 All matched in {tries} {tries === 1 ? 'try' : 'tries'}!{' '}
          <button className="btn sm ghost" onClick={() => { setDone(new Set()); setTries(0); setRight(shuffled(pairs.map((p) => p.right))) }}>Play again</button>
        </div>
      )}
      {!complete && selLeft === null && done.size === 0 && <div className="tiny muted mt">Tap an item on the left, then its match on the right.</div>}
    </div>
  )
}

function QuickCheck({ question, options, correct, explanation }: Extract<Block, { type: 'check' }>) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  return (
    <div className="block-card">
      <Label icon="✔">Quick check</Label>
      <p style={{ fontWeight: 600 }}><InlineMd text={question} /></p>
      <div className="stack" style={{ gap: 8 }}>
        {options.map((o, i) => {
          const state = !answered ? '' : i === correct ? 'right' : i === picked ? 'wrong' : ''
          return (
            <button key={i} className={`q-option ${state}`} disabled={answered} onClick={() => setPicked(i)}>
              <span className="q-key">{String.fromCharCode(97 + i)}</span>
              <span><InlineMd text={o} /></span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={`feedback mt ${picked === correct ? 'ok' : 'no'}`}>
          <strong>{picked === correct ? 'Correct! 🎉' : 'Not quite.'}</strong>
          {explanation && <div className="small mt" style={{ marginTop: 4 }}><InlineMd text={explanation} /></div>}
          {picked !== correct && <div className="mt" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => setPicked(null)}>Try again</button></div>}
        </div>
      )}
    </div>
  )
}
