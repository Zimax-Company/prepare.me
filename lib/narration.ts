// Server-side: turns concept blocks and questions into plain text a browser voice can read.
// Formulas ($…$, $$…$$) are converted to spoken English with Speech Rule Engine
// ("|a_n - L| < \varepsilon" → "the absolute value of a sub n minus L is less than epsilon").
import 'server-only'
import katex from 'katex'
import type { Block, PublicQuestion } from './types'

export type NarrationSegment = { block: number; text: string }

type SRE = { setupEngine: (o: object) => Promise<void>; engineReady: () => Promise<void>; toSpeech: (mml: string) => string }
let sre: SRE | null = null

// Loaded lazily so a missing or broken engine never takes the page down: narration
// just falls back to a simpler reading of the formulas.
const g = globalThis as unknown as { __sreReady?: Promise<boolean> }
function ready() {
  g.__sreReady ??= (async () => {
    try {
      const mod = await import('speech-rule-engine')
      sre = ((mod as { default?: SRE }).default ?? mod) as unknown as SRE
      await sre.setupEngine({ locale: 'en', domain: 'clearspeak', modality: 'speech', style: 'default' })
      await sre.engineReady()
      return true
    } catch (err) {
      console.error('Speech Rule Engine unavailable; formulas will be read with the simple fallback.', err)
      return false
    }
  })()
  return g.__sreReady
}

const cache = new Map<string, string>()

/** Rough fallback when SRE is unavailable: strip TeX commands to something pronounceable. */
function texFallback(tex: string) {
  return tex
    .replace(/\\(frac|dfrac|tfrac)\{([^}]*)\}\{([^}]*)\}/g, '$2 over $3')
    .replace(/\\([a-zA-Z]+)/g, ' $1 ')
    .replace(/[{}_^\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function polish(s: string) {
  return s
    .replace(/\bnormal /g, '')
    .replace(/\blim over (.+?) right arrow (.+?) of\b/g, 'the limit as $1 approaches $2 of')
    .replace(/\blim sup over (.+?) right arrow (.+?) of\b/g, 'the limit superior as $1 approaches $2 of')
    .replace(/\blim inf over (.+?) right arrow (.+?) of\b/g, 'the limit inferior as $1 approaches $2 of')
    .replace(/\bright arrow\b/g, 'tends to')
    .replace(/\bsup of\b/g, 'the supremum of')
    .replace(/\binf of\b/g, 'the infimum of')
    .replace(/\s+/g, ' ')
    .trim()
}

function speakTex(tex: string, ok: boolean) {
  const hit = cache.get(tex)
  if (hit !== undefined) return hit
  let out: string
  try {
    if (!ok || !sre) throw new Error('SRE unavailable')
    const mml = katex
      .renderToString(tex, { output: 'mathml', throwOnError: false, strict: 'ignore' })
      .replace(/^<span class="katex">|<\/span>$/g, '')
      .replace(/ mathvariant="normal"/g, '')
    out = polish(sre.toSpeech(mml)) || texFallback(tex)
  } catch {
    out = texFallback(tex)
  }
  if (cache.size > 5000) cache.clear()
  cache.set(tex, out)
  return out
}

// Same delimiter rules as components/Markdown.tsx
const MATH = /(\\\$)|\$\$([\s\S]+?)\$\$|\$(?=\S)((?:\\.|[^$\\\n])+?)(?<=\S)\$(?!\d)/g

/** Markdown (with maths) → speakable plain text. */
function speakMd(md: string, ok: boolean) {
  if (!md) return ''
  return md
    .replace(/```[\s\S]*?```/g, ' (code example) ')
    .replace(MATH, (_m, esc, display, inline) => (esc ? 'dollar' : ` ${speakTex(display ?? inline, ok)} `))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1$2')
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, '$1$2')
    .replace(/^#{1,4}\s+(.*)$/gm, '$1.')
    .replace(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/gm, (_m, item: string) => (/[.!?:;]$/.test(item.trim()) ? item : `${item}.`))
    .replace(/∎/g, ' End of proof. ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\b(is|are) (is|are) /g, '$1 ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

const end = (s: string) => (s && !/[.!?:]$/.test(s) ? `${s}.` : s)

function blockText(b: Block, ok: boolean): string[] {
  const md = (s: string | undefined) => speakMd(s ?? '', ok)
  switch (b.type) {
    case 'text': return [md(b.md)]
    case 'callout': return [`${{ info: 'Note', tip: 'Tip', warning: 'Warning', success: 'Key point' }[b.tone] ?? 'Note'}: ${end(md(b.title))} ${md(b.md)}`]
    case 'code': return [b.caption ? `Code example: ${end(md(b.caption))}` : 'Code example.']
    case 'example': return [`Worked example: ${end(md(b.title))} ${end(md(b.problem))} Try it yourself, then reveal the solution.`]
    case 'image': return b.alt || b.caption ? [`Image: ${end(md(b.alt))} ${md(b.caption)}`] : []
    case 'video': return b.caption ? [`Video: ${end(md(b.caption))}`] : []
    case 'diagram': return [`Diagram${b.title ? `: ${end(md(b.title))}` : '.'} ${b.nodes.map((n, i) => `Step ${i + 1}: ${end(md(n))}`).join(' ')}`]
    case 'flashcards': return [`Flashcards. ${b.cards.map((c) => `${end(md(c.front))} ${end(md(c.back))}`).join(' ')}`]
    case 'steps': return [end(md(b.title)) || 'Step by step.', ...b.steps.map((s, i) => `Step ${i + 1}: ${end(md(s.title))} ${md(s.md)}`)]
    case 'reveal': return [`Common questions. ${b.items.map((it) => `${end(md(it.q))} ${end(md(it.a))}`).join(' ')}`]
    case 'order': return [`Exercise: ${end(md(b.prompt))} Drag the items into the correct order.`]
    case 'match': return [`Exercise: ${end(md(b.prompt))}`]
    case 'check': return [`Quick check: ${end(md(b.question))} ${b.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${end(md(o))}`).join(' ')}`]
    default: return []
  }
}

/** One or more segments per block, tagged with the block index so the player can highlight it. */
export async function narrateConcept(title: string, summary: string, blocks: Block[]): Promise<NarrationSegment[]> {
  const ok = await ready()
  const out: NarrationSegment[] = [{ block: -1, text: `${end(title)} ${summary ? end(speakMd(summary, ok)) : ''}`.trim() }]
  blocks.forEach((b, i) => {
    for (const text of blockText(b, ok)) if (text.trim()) out.push({ block: i, text })
  })
  return out
}

export async function narrateQuestions<Q extends PublicQuestion>(questions: Q[]): Promise<(Q & { speech: string })[]> {
  const ok = await ready()
  return questions.map((q) => {
    const prompt = end(speakMd(q.prompt, ok))
    const options =
      q.type === 'short' ? 'Type your answer.'
      : q.type === 'true_false' ? 'True or false?'
      : `${q.type === 'multiple' ? 'Select all that apply. ' : ''}${q.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${end(speakMd(o.text, ok))}`).join(' ')}`
    return { ...q, speech: `${prompt} ${options}` }
  })
}
