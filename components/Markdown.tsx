// Small, safe markdown renderer: builds React elements (never raw HTML).
// Supports ## headings, paragraphs, - / 1. lists, ``` fenced code, **bold**, _italic_, `code`, [links](url).
import { Fragment, type ReactNode } from 'react'
import { highlight } from './highlight'

function inline(text: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(_[^_\s][^_]*_)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${keyPrefix}${i++}`
    if (m[1]) out.push(<code key={k}>{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>)
    else if (m[3] || m[4]) out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>)
    else if (m[5]) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : '#'
      out.push(<a key={k} href={safe} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{label}</a>)
    }
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(<pre key={key++}><code>{highlight(code.join('\n'))}</code></pre>)
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const level = Math.min(4, h[1].length + 1)
      const Tag = (`h${level}`) as 'h2' | 'h3' | 'h4'
      blocks.push(<Tag key={key++}>{inline(h[2])}</Tag>)
      i++
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      blocks.push(<ul key={key++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
      blocks.push(<ol key={key++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) para.push(lines[i++])
    blocks.push(<p key={key++}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `${j}-`)}</Fragment>)}</p>)
  }
  return <div className={`md ${className}`}>{blocks}</div>
}

/** Inline-only variant for short strings (question prompts, options). */
export function InlineMd({ text }: { text: string }) {
  return <>{inline(text ?? '')}</>
}
