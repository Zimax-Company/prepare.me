// Small, safe markdown renderer: builds React elements (never raw HTML, except KaTeX output).
// Supports ## headings, paragraphs, - / 1. lists, ``` fenced code, **bold**, _italic_, `code`,
// [links](url), $inline math$, $$display math$$ (inline or on its own lines) and \$ for a literal dollar.
import { Fragment, type ReactNode } from 'react'
import katex from 'katex'
import { highlight } from './highlight'

const cache = new Map<string, string>()

function tex(src: string, display: boolean) {
  const key = (display ? 'D:' : 'I:') + src
  let html = cache.get(key)
  if (html === undefined) {
    html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    if (cache.size > 2000) cache.clear()
    cache.set(key, html)
  }
  return html
}

export function MathTex({ src, display = false }: { src: string; display?: boolean }) {
  const Tag = display ? 'div' : 'span'
  return <Tag className={display ? 'math-display' : 'math-inline'} dangerouslySetInnerHTML={{ __html: tex(src, display) }} />
}

// Inline math follows pandoc's rules so prices like "$1,600 and $960" stay plain text:
// the opening $ is not followed by whitespace, the closing $ is not preceded by whitespace
// and not followed by a digit.
const INLINE = new RegExp(
  [
    '(`[^`]+`)', // 1 code
    '(\\\\\\$)', // 2 escaped dollar
    '(\\$\\$[^$]+?\\$\\$)', // 3 display math inline
    '(\\$(?=\\S)(?:\\\\.|[^$\\\\\\n])+?(?<=\\S)\\$(?!\\d))', // 4 inline math
    '(\\*\\*[^*]+\\*\\*)', // 5 bold
    '(_[^_\\s][^_]*_)', // 6 italic
    '(\\*[^*\\s][^*]*\\*)', // 7 italic
    '(\\[[^\\]]+\\]\\([^)\\s]+\\))', // 8 link
  ].join('|'),
  'g',
)

function inline(text: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = []
  const re = new RegExp(INLINE.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${keyPrefix}${i++}`
    if (m[1]) out.push(<code key={k}>{t.slice(1, -1)}</code>)
    else if (m[2]) out.push('$')
    else if (m[3]) out.push(<MathTex key={k} src={t.slice(2, -2)} display />)
    else if (m[4]) out.push(<MathTex key={k} src={t.slice(1, -1)} />)
    else if (m[5]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>)
    else if (m[6] || m[7]) out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>)
    else if (m[8]) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : '#'
      out.push(<a key={k} href={safe} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{label}</a>)
    }
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const BLOCK_START = /^(```|#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|\s*\$\$)/

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
    const trimmed = line.trim()
    if (trimmed.startsWith('$$')) {
      // Display math: "$$ ... $$" on one line, or spread over several lines.
      let src = trimmed.slice(2)
      if (src.length >= 2 && src.endsWith('$$')) {
        src = src.slice(0, -2)
        i++
      } else {
        const parts = [src]
        i++
        while (i < lines.length && !lines[i].trim().endsWith('$$')) parts.push(lines[i++])
        if (i < lines.length) parts.push(lines[i++].trim().slice(0, -2))
        src = parts.join('\n')
      }
      blocks.push(<MathTex key={key++} src={src.trim()} display />)
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
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !BLOCK_START.test(lines[i]))) para.push(lines[i++])
    blocks.push(<p key={key++}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `${j}-`)}</Fragment>)}</p>)
  }
  return <div className={`md ${className}`}>{blocks}</div>
}

/** Inline-only variant for short strings (question prompts, options, card faces). */
export function InlineMd({ text }: { text: string }) {
  return <>{inline(text ?? '')}</>
}
