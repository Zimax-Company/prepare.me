'use client'

import { useEffect } from 'react'

const BEAT = 60_000 // flush every minute
const IDLE = 5 * 60_000 // stop counting after 5 minutes without interaction (reading counts as scrolling/keys)

/** Measures active learning time on this page and reports it to the server. Renders nothing. */
export function UsageTracker({ courseId }: { courseId: number }) {
  useEffect(() => {
    let lastInput = Date.now()
    let lastTick = Date.now()
    let pending = 0

    const onInput = () => { lastInput = Date.now() }
    const tick = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible' && now - lastInput < IDLE) pending += now - lastTick
      lastTick = now
    }
    const flush = (beacon = false) => {
      tick()
      const seconds = Math.round(pending / 1000)
      if (seconds < 5) return
      pending = 0
      const body = JSON.stringify({ courseId, seconds })
      if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/activity/heartbeat', new Blob([body], { type: 'application/json' }))
      else fetch('/api/activity/heartbeat', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(true); else lastTick = Date.now() }

    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    const t1 = setInterval(tick, 5_000)
    const t2 = setInterval(() => flush(), BEAT)
    return () => {
      flush(true)
      events.forEach((e) => window.removeEventListener(e, onInput))
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [courseId])
  return null
}
