import type { Question } from './types'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** True when `given` matches the question's answer exactly (all-or-nothing for multiple choice). */
export function isCorrect(q: Pick<Question, 'type' | 'answer'>, given: string[] | undefined): boolean {
  if (!given?.length) return false
  if (q.type === 'short') return q.answer.some((a) => norm(a) === norm(given[0] ?? ''))
  const want = new Set(q.answer)
  const got = new Set(given)
  return want.size === got.size && [...want].every((a) => got.has(a))
}

/** Deterministic PRNG so an attempt's option order is stable across reloads. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
