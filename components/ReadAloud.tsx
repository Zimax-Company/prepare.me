'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { NarrationSegment } from '@/lib/narration'
import { chunkText, loadPrefs, pickVoice, savePrefs, speakOnce, speechSupported, useVoices, type VoicePrefs } from './speech'

type Item = { block: number; text: string }
const RATES = [0.75, 1, 1.25, 1.5, 1.75]

/**
 * "Listen" player for a concept. Reads the server-prepared narration sentence by sentence,
 * highlights the block being read ([data-block] elements) and keeps it in view.
 */
export function ReadAloud({ segments }: { segments: NarrationSegment[] }) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [index, setIndex] = useState(0)
  const [prefs, setPrefs] = useState<VoicePrefs>({ rate: 1, voiceURI: null })
  const [showSettings, setShowSettings] = useState(false)
  const voices = useVoices()
  const run = useRef(0) // bumps on every start/stop so stale utterance callbacks are ignored

  const items: Item[] = useMemo(() => segments.flatMap((s) => chunkText(s.text).map((text) => ({ block: s.block, text }))), [segments])
  const minutes = useMemo(() => Math.max(1, Math.round(items.reduce((n, it) => n + it.text.split(/\s+/).length, 0) / 160)), [items])

  useEffect(() => {
    setSupported(speechSupported())
    setPrefs(loadPrefs())
    return () => { run.current++; if (speechSupported()) speechSynthesis.cancel() }
  }, [])

  // Highlight and scroll to the block being read.
  const current = status === 'idle' ? null : items[index]?.block ?? null
  useEffect(() => {
    document.querySelectorAll('[data-block].reading').forEach((el) => el.classList.remove('reading'))
    if (current === null) return
    const el = document.querySelector(`[data-block="${current}"]`)
    if (!el) return
    el.classList.add('reading')
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight * 0.7 ? 'start' : 'center' })
  }, [current])

  async function playFrom(start: number, p = prefs) {
    const token = ++run.current
    speechSynthesis.cancel()
    setStatus('playing')
    const voice = pickVoice(voices, p.voiceURI)
    for (let i = start; i < items.length; i++) {
      if (run.current !== token) return
      setIndex(i)
      try {
        await speakOnce(items[i].text, p, voice)
      } catch (err) {
        // Interrupted by another speaker (e.g. a question's 🔊 button) or by our own cancel.
        if (run.current === token) setStatus('paused')
        return
      }
    }
    if (run.current === token) { setStatus('idle'); setIndex(0) }
  }

  function pause() { run.current++; speechSynthesis.cancel(); setStatus('paused') }
  function stop() { run.current++; speechSynthesis.cancel(); setStatus('idle'); setIndex(0) }

  function jumpBlock(dir: 1 | -1) {
    const block = items[index]?.block ?? -1
    let i = index
    if (dir === 1) { while (i < items.length && items[i].block === block) i++ }
    else {
      while (i > 0 && items[i - 1].block === block) i--
      if (i > 0) { const prev = items[i - 1].block; i--; while (i > 0 && items[i - 1].block === prev) i-- }
    }
    if (i >= items.length) return stop()
    playFrom(Math.max(0, i))
  }

  function update(p: Partial<VoicePrefs>) {
    const next = { ...prefs, ...p }
    setPrefs(next)
    savePrefs(next)
    if (status === 'playing') playFrom(index, next) // apply immediately from the current sentence
  }

  if (!supported || !items.length) return null

  const progress = status === 'idle' ? 0 : ((index + 1) / items.length) * 100

  return (
    <>
      {status === 'idle' ? (
        <button className="btn sm listen-btn" onClick={() => playFrom(0)} title="Read this lesson aloud">
          🔊 Listen <span className="muted tiny">· {minutes} min</span>
        </button>
      ) : null}
      {status !== 'idle' && (
        <div className="player" role="region" aria-label="Read aloud player">
          <div className="player-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm ghost icon-btn" onClick={() => jumpBlock(-1)} title="Previous section" aria-label="Previous section">⏮</button>
            {status === 'playing' ? (
              <button className="btn sm primary icon-btn" onClick={pause} title="Pause" aria-label="Pause">⏸</button>
            ) : (
              <button className="btn sm primary icon-btn" onClick={() => playFrom(index)} title="Resume" aria-label="Resume">▶</button>
            )}
            <button className="btn sm ghost icon-btn" onClick={() => jumpBlock(1)} title="Next section" aria-label="Next section">⏭</button>
            <div className="player-text grow small">{items[index]?.text}</div>
            <button className="btn sm ghost" onClick={() => update({ rate: RATES[(RATES.indexOf(prefs.rate) + 1) % RATES.length] ?? 1 })} title="Speed">{prefs.rate}×</button>
            <button className="btn sm ghost icon-btn" onClick={() => setShowSettings((s) => !s)} title="Voice" aria-label="Voice settings">⚙</button>
            <button className="btn sm ghost icon-btn" onClick={stop} title="Stop" aria-label="Stop">✕</button>
          </div>
          {showSettings && (
            <div className="row wrap mt" style={{ gap: 8 }}>
              <label className="small muted" htmlFor="voice-pick">Voice</label>
              <select id="voice-pick" className="input" style={{ maxWidth: 320, padding: '5px 8px' }} value={pickVoice(voices, prefs.voiceURI)?.voiceURI ?? ''} onChange={(e) => update({ voiceURI: e.target.value })}>
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
              <span className="tiny muted">Voices come from your device. Natural or Enhanced voices sound best.</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
