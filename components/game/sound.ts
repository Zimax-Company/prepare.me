'use client'

// Tiny synthesised sound effects (no audio files). Created lazily on the first user gesture.
let ctx: AudioContext | null = null
let muted = false

try { muted = localStorage.getItem('prepareme.mute') === '1' } catch { /* private mode */ }

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('prepareme.mute', m ? '1' : '0') } catch { /* ignore */ }
}

function ac() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slideTo?: number) {
  const a = ac()
  if (!a || muted) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  unlock: () => ac(),
  move: () => tone(520, 0, 0.05, 'triangle', 0.05),
  count: (last = false) => tone(last ? 880 : 440, 0, last ? 0.25 : 0.12, 'square', 0.06),
  correct: (combo: number) => { const b = 520 + combo * 40; tone(b, 0, 0.1, 'triangle', 0.1); tone(b * 1.5, 0.08, 0.16, 'triangle', 0.1) },
  wrong: () => { tone(200, 0, 0.25, 'sawtooth', 0.08, 90); tone(150, 0.05, 0.25, 'square', 0.04, 70) },
  combo: () => [660, 830, 990, 1320].forEach((f, i) => tone(f, i * 0.06, 0.12, 'triangle', 0.08)),
  boost: () => tone(300, 0, 0.18, 'sawtooth', 0.03, 600),
  over: () => [440, 370, 311, 247].forEach((f, i) => tone(f, i * 0.16, 0.22, 'triangle', 0.09)),
  best: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.1)),
}
