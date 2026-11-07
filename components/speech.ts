'use client'

// Thin wrapper over the browser's Web Speech API (speechSynthesis).
import { useEffect, useState } from 'react'

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

const KEY = 'prepareme.voice'
export type VoicePrefs = { rate: number; voiceURI: string | null }

export function loadPrefs(): VoicePrefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return { rate: typeof p.rate === 'number' ? p.rate : 1, voiceURI: p.voiceURI ?? null }
  } catch {
    return { rate: 1, voiceURI: null }
  }
}

export function savePrefs(p: VoicePrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ }
}

/** English voices, best-sounding first. Voices load asynchronously in Chrome. */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!speechSupported()) return
    const load = () => {
      const rank = (v: SpeechSynthesisVoice) => (/natural|neural|premium|enhanced/i.test(v.name) ? 0 : /google|samantha|daniel|karen|serena|aria|jenny/i.test(v.name) ? 1 : v.localService ? 2 : 3)
      setVoices(speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)))
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  return voices
}

export function pickVoice(voices: SpeechSynthesisVoice[], uri: string | null) {
  return voices.find((v) => v.voiceURI === uri) ?? voices[0] ?? null
}

/** Browsers cut off or stall very long utterances, so speak sentence-sized chunks (≤ ~220 chars). */
export function chunkText(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [text]
  const out: string[] = []
  for (const raw of sentences) {
    let s = raw.trim()
    if (!s) continue
    while (s.length > max) {
      const cut = Math.max(s.lastIndexOf(', ', max), s.lastIndexOf('; ', max), s.lastIndexOf(' ', max))
      const at = cut > max / 2 ? cut + 1 : max
      out.push(s.slice(0, at).trim())
      s = s.slice(at).trim()
    }
    if (s) out.push(s)
  }
  return out
}

/** Speak one utterance; resolves when it ends, rejects if it was interrupted. */
export function speakOnce(text: string, prefs: VoicePrefs, voice: SpeechSynthesisVoice | null) {
  return new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = prefs.rate
    if (voice) { u.voice = voice; u.lang = voice.lang } else u.lang = 'en-US'
    u.onend = () => resolve()
    u.onerror = (e) => reject(e.error)
    speechSynthesis.speak(u)
  })
}
