'use client'

import { useEffect, useRef, useState } from 'react'
import { chunkText, loadPrefs, pickVoice, speakOnce, speechSupported, useVoices } from './speech'

/** Small 🔊 toggle that reads a question (prompt + options) aloud. */
export function SpeakButton({ text, label = 'Read question aloud' }: { text?: string; label?: string }) {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voices = useVoices()
  const run = useRef(0)

  useEffect(() => {
    setSupported(speechSupported())
    return () => { if (run.current && speechSupported()) { run.current++; speechSynthesis.cancel() } }
  }, [])
  // Stop when the question changes.
  useEffect(() => () => { if (speechSupported()) { run.current++; speechSynthesis.cancel() } }, [text])

  if (!supported || !text) return null

  async function toggle() {
    if (speaking) { run.current++; speechSynthesis.cancel(); setSpeaking(false); return }
    const token = ++run.current
    speechSynthesis.cancel()
    setSpeaking(true)
    const prefs = loadPrefs()
    const voice = pickVoice(voices, prefs.voiceURI)
    try {
      for (const part of chunkText(text!)) {
        if (run.current !== token) return
        await speakOnce(part, prefs, voice)
      }
    } catch { /* interrupted */ }
    if (run.current === token) setSpeaking(false)
  }

  return (
    <button type="button" className={`btn sm ${speaking ? '' : 'ghost'} icon-btn`} onClick={toggle} title={speaking ? 'Stop reading' : label} aria-label={speaking ? 'Stop reading' : label} aria-pressed={speaking}>
      {speaking ? '⏹' : '🔊'}
    </button>
  )
}
