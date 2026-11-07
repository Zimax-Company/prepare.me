import type { ReactNode } from 'react'

const KEYWORDS = new Set('const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of this null undefined true false yield delete void def print elif lambda pass None True False'.split(' '))

/** Tiny tokenizer good enough for JS/TS/Python-style snippets. */
export function highlight(code: string): ReactNode[] {
  const re = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?n?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const [t] = m
    if (m[1]) out.push(<span key={k++} className="tok-c">{t}</span>)
    else if (m[2]) out.push(<span key={k++} className="tok-s">{t}</span>)
    else if (m[3]) out.push(<span key={k++} className="tok-n">{t}</span>)
    else if (m[4]) out.push(<span key={k++} className={KEYWORDS.has(t) ? 'tok-k' : 'tok-f'}>{t}</span>)
    else out.push(KEYWORDS.has(t) ? <span key={k++} className="tok-k">{t}</span> : t)
    last = m.index + t.length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}
