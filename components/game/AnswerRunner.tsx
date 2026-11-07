'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiCall, errorMessage } from '@/lib/client'
import type { RunnerQuestion, LeaderRow } from '@/lib/games'
import { InlineMd, Markdown } from '../Markdown'
import { isMuted, setMuted, sfx } from './sound'

type Phase = 'loading' | 'ready' | 'countdown' | 'running' | 'resolving' | 'paused' | 'over'
type AnswerResult = { correct: boolean; correctOptionId: string | null; gained: number; score: number; streak: number; multiplier: number; lives: number; over: boolean }
type Summary = {
  score: number; answered: number; correct: number; maxStreak: number; accuracy: number; previousBest: number; isBest: boolean; durationSec: number
  missed: { prompt: string; given: string | null; correct: string | null; explanation: string }[]
  leaderboard: LeaderRow[]
}

const TRACK_TOP = 0.02 // gate start (fraction of track height)
const PLAYER_Y = 0.86 // collision line
const BOOST = 2.6

function travelSeconds(q: RunnerQuestion, correctSoFar: number) {
  const base = Math.max(4.2, 9.5 - 0.22 * correctSoFar)
  const reading = (q.prompt.length + q.options.reduce((n, o) => n + o.text.length, 0) * 0.6) / 90
  return base + Math.min(3.5, reading)
}

export function AnswerRunner({ courseId, sectionId, courseTitle, onExit }: { courseId: number; sectionId: number | null; courseTitle: string; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(3)
  const [qIndex, setQIndex] = useState(0)
  const [questions, setQuestions] = useState<RunnerQuestion[]>([])
  const [lane, setLane] = useState(0)
  const [hud, setHud] = useState({ score: 0, lives: 3, streak: 0, multiplier: 1, answered: 0, correct: 0 })
  const [gateState, setGateState] = useState<{ chosen: string | null; correct: string | null } | null>(null)
  const [popup, setPopup] = useState<{ id: number; text: string; good: boolean } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [mute, setMute] = useState(false)
  const [reduced, setReduced] = useState(false)

  const session = useRef<number | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progress = useRef(0)
  const boosting = useRef(false)
  const phaseRef = useRef<Phase>('loading')
  const laneRef = useRef(0)
  const correctRef = useRef(0)
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([])
  const stars = useRef<{ x: number; y: number; z: number }[]>([])

  phaseRef.current = phase
  laneRef.current = lane
  const q = questions.length ? questions[qIndex % questions.length] : null
  const lanes = q?.options.length ?? 3

  useEffect(() => {
    setMute(isMuted())
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // ---- Start a run ------------------------------------------------------------------------
  const start = useCallback(async () => {
    setPhase('loading')
    setError(null)
    setSummary(null)
    try {
      const r = await apiCall<{ sessionId: number; lives: number; questions: RunnerQuestion[] }>('POST', '/games/runner/start', { courseId, sectionId })
      session.current = r.sessionId
      setQuestions(r.questions)
      setQIndex(0)
      setHud({ score: 0, lives: r.lives, streak: 0, multiplier: 1, answered: 0, correct: 0 })
      correctRef.current = 0
      progress.current = 0
      setGateState(null)
      setLane(Math.floor((r.questions[0]?.options.length ?? 3) / 2))
      setPhase('ready')
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [courseId, sectionId])

  useEffect(() => { start() }, [start])

  const go = () => {
    sfx.unlock()
    setCount(3)
    setPhase('countdown')
  }

  useEffect(() => {
    if (phase !== 'countdown') return
    sfx.count(count === 0)
    if (count === 0) { const t = setTimeout(() => setPhase('running'), 450); return () => clearTimeout(t) }
    const t = setTimeout(() => setCount((c) => c - 1), 650)
    return () => clearTimeout(t)
  }, [phase, count])

  // ---- Resolve a gate -------------------------------------------------------------------------
  const resolve = useCallback(async () => {
    if (!q || session.current === null) return
    setPhase('resolving')
    const chosen = q.options[Math.min(laneRef.current, q.options.length - 1)]?.id ?? null
    setGateState({ chosen, correct: null })
    let r: AnswerResult
    try {
      r = await apiCall<AnswerResult>('POST', '/games/runner/answer', { sessionId: session.current, questionId: q.id, optionId: chosen })
    } catch (e) {
      setError(errorMessage(e))
      setPhase('paused')
      return
    }
    setGateState({ chosen, correct: r.correctOptionId })
    setHud((h) => ({ score: r.score, lives: r.lives, streak: r.streak, multiplier: r.multiplier, answered: h.answered + 1, correct: h.correct + (r.correct ? 1 : 0) }))
    const stage = stageRef.current
    const px = stage ? ((laneRef.current + 0.5) / (q.options.length)) * stage.clientWidth : 0
    const py = stage ? stage.clientHeight * PLAYER_Y : 0
    if (r.correct) {
      correctRef.current++
      sfx.correct(r.multiplier)
      if (r.streak > 0 && r.streak % 3 === 0) sfx.combo()
      burst(px, py, ['#3ddc84', '#8b7fff', '#ffffff'], 40)
      setPopup({ id: Date.now(), text: r.streak % 3 === 0 && r.multiplier > 1 ? `+${r.gained} · ×${r.multiplier} COMBO!` : `+${r.gained}`, good: true })
    } else {
      sfx.wrong()
      burst(px, py, ['#ff6369', '#ffb4b4'], 26)
      if (!reduced && stage) { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake') }
      setPopup({ id: Date.now(), text: chosen === null ? 'Missed!' : 'Wrong gate', good: false })
    }
    setTimeout(async () => {
      if (r.over) {
        sfx.over()
        setPhase('over')
        await finish()
        return
      }
      progress.current = 0
      setGateState(null)
      setQIndex((i) => i + 1)
      setPhase('running')
    }, r.correct ? 900 : 1700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, reduced])

  const finish = useCallback(async () => {
    if (session.current === null) return
    try {
      const s = await apiCall<Summary>('POST', '/games/runner/end', { sessionId: session.current })
      setSummary(s)
      if (s.isBest) sfx.best()
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  function burst(x: number, y: number, colors: string[], n: number) {
    if (reduced) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 80 + Math.random() * 260
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.6 + Math.random() * 0.5, color: colors[i % colors.length] })
    }
  }

  // ---- Main loop: gate movement, starfield, particles --------------------------------------
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d') ?? null
    if (!stars.current.length) stars.current = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8 }))

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const ph = phaseRef.current
      const cur = questions.length ? questions[qIndex % questions.length] : null

      // Gate movement
      if (ph === 'running' && cur) {
        const dur = travelSeconds(cur, correctRef.current)
        progress.current = Math.min(1, progress.current + (dt / dur) * (boosting.current ? BOOST : 1))
        if (progress.current >= 1) { phaseRef.current = 'resolving'; resolve() }
      }
      const row = rowRef.current
      const track = trackRef.current
      if (row && track) {
        const h = track.clientHeight
        const y = (TRACK_TOP + (PLAYER_Y - TRACK_TOP) * progress.current) * h - row.offsetHeight / 2
        row.style.transform = `translateY(${y}px) scale(${0.82 + 0.18 * progress.current})`
        row.style.opacity = String(Math.min(1, 0.35 + progress.current * 2))
      }

      // Background + particles
      if (canvas && g) {
        const w = (canvas.width = canvas.clientWidth * devicePixelRatio)
        const h = (canvas.height = canvas.clientHeight * devicePixelRatio)
        g.clearRect(0, 0, w, h)
        const speed = (ph === 'running' ? (boosting.current ? 3.2 : 1) : 0.15) * 0.35
        for (const s of stars.current) {
          s.y += dt * speed * s.z * (reduced ? 0.2 : 1)
          if (s.y > 1) { s.y -= 1; s.x = Math.random() }
          g.fillStyle = `rgba(200,195,255,${0.25 + s.z * 0.6})`
          const len = boosting.current && ph === 'running' && !reduced ? 10 * s.z * devicePixelRatio : 0
          g.fillRect(s.x * w, s.y * h, 1.6 * s.z * devicePixelRatio, 1.6 * s.z * devicePixelRatio + len)
        }
        particles.current = particles.current.filter((p) => (p.life -= dt) > 0)
        for (const p of particles.current) {
          p.vy += 520 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6))
          g.fillStyle = p.color
          g.fillRect(p.x * devicePixelRatio, p.y * devicePixelRatio, 4 * devicePixelRatio, 4 * devicePixelRatio)
        }
        g.globalAlpha = 1
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [questions, qIndex, resolve, reduced])

  // ---- Controls -----------------------------------------------------------------------------
  const move = useCallback((to: number) => {
    const max = (q?.options.length ?? 3) - 1
    const next = Math.max(0, Math.min(max, to))
    if (next !== laneRef.current && (phaseRef.current === 'running' || phaseRef.current === 'countdown')) sfx.move()
    if (phaseRef.current === 'running' || phaseRef.current === 'countdown' || phaseRef.current === 'ready') setLane(next)
  }, [q])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'running') setPhase('paused')
    else if (phaseRef.current === 'paused' && !error) setPhase('running')
  }, [error])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat && !['ArrowUp', 'w', 'W', ' '].includes(e.key)) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); move(laneRef.current - 1) }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); move(laneRef.current + 1) }
      else if (/^[1-4]$/.test(k)) move(Number(k) - 1)
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') {
        e.preventDefault()
        if (phaseRef.current === 'ready') { go(); return }
        if (!boosting.current && phaseRef.current === 'running') sfx.boost()
        boosting.current = true
      } else if (k === 'p' || k === 'P' || k === 'Escape') togglePause()
      else if (k === 'Enter' && phaseRef.current === 'ready') go()
    }
    const up = (e: KeyboardEvent) => { if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) boosting.current = false }
    const blur = () => { boosting.current = false; if (phaseRef.current === 'running') setPhase('paused') }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [move, togglePause])

  // Tap a lane to move there; swipe left/right.
  const touch = useRef<{ x: number; t: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => { touch.current = { x: e.clientX, t: Date.now() } }
  const onPointerUp = (e: React.PointerEvent) => {
    const st = touch.current
    touch.current = null
    const track = trackRef.current
    if (!st || !track) return
    const dx = e.clientX - st.x
    if (Math.abs(dx) > 40 && Date.now() - st.t < 400) { move(laneRef.current + (dx > 0 ? 1 : -1)); return }
    const r = track.getBoundingClientRect()
    move(Math.floor(((e.clientX - r.left) / r.width) * lanes))
  }

  // ---- Render -------------------------------------------------------------------------------
  const hearts = Array.from({ length: 3 }, (_, i) => (i < hud.lives ? '❤️' : '🖤')).join(' ')
  const laneW = 100 / lanes

  return (
    <div className="runner-wrap">
      <div className="runner-top row between wrap">
        <div className="small"><b>Answer Runner</b> <span className="muted">· {courseTitle}</span></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" onClick={() => { const m = !mute; setMute(m); setMuted(m) }} aria-label={mute ? 'Unmute' : 'Mute'}>{mute ? '🔇' : '🔊'}</button>
          {(phase === 'running' || phase === 'paused') && <button className="btn sm ghost" onClick={togglePause}>{phase === 'paused' ? '▶ Resume' : '⏸ Pause'}</button>}
          <button className="btn sm" onClick={async () => { if (session.current && phase !== 'over') await finish(); onExit() }}>Exit</button>
        </div>
      </div>

      <div ref={stageRef} className="runner-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <canvas ref={canvasRef} className="runner-canvas" aria-hidden />

        {/* HUD */}
        <div className="runner-hud">
          <div className="runner-stats">
            <span className="runner-hearts" aria-label={`${hud.lives} lives`}>{hearts}</span>
            <span><b className="runner-score">{hud.score.toLocaleString()}</b></span>
            <span className={`runner-mult ${hud.multiplier > 1 ? 'hot' : ''}`}>×{hud.multiplier}</span>
            <span className="tiny">🔥 {hud.streak}</span>
          </div>
          {q && phase !== 'ready' && phase !== 'loading' && phase !== 'over' && (
            <div key={q.id + '-' + qIndex} className="runner-prompt"><InlineMd text={q.prompt} /></div>
          )}
        </div>

        {/* Track */}
        <div ref={trackRef} className="runner-track">
          {Array.from({ length: lanes - 1 }, (_, i) => <div key={i} className="runner-divider" style={{ left: `${laneW * (i + 1)}%` }} />)}
          {q && (phase === 'running' || phase === 'resolving' || phase === 'paused') && (
            <div ref={rowRef} className="runner-row" key={q.id + '-' + qIndex}>
              {q.options.map((o, i) => {
                const st = gateState
                const cls = !st ? '' : st.correct === null ? (st.chosen === o.id ? 'pending' : '') : o.id === st.correct ? 'right' : o.id === st.chosen ? 'wrong' : 'dim'
                return (
                  <div key={o.id} className={`runner-gate ${cls}`} style={{ width: `${laneW}%` }}>
                    <span className="runner-key">{i + 1}</span>
                    <span className="runner-gate-text"><InlineMd text={o.text} /></span>
                  </div>
                )
              })}
            </div>
          )}
          {/* Player */}
          <div className="runner-player" style={{ left: `${laneW * (lane + 0.5)}%`, top: `${PLAYER_Y * 100}%` }}>
            <svg viewBox="0 0 40 48" width="40" height="48" aria-hidden>
              <defs><linearGradient id="shipg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c86bff" /><stop offset="1" stopColor="#6d5efc" /></linearGradient></defs>
              <path d="M20 2 L34 38 L20 31 L6 38 Z" fill="url(#shipg)" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
              <path d="M14 40 Q20 48 26 40" stroke="#ffb86b" strokeWidth="4" fill="none" className="runner-flame" />
            </svg>
          </div>
          {popup && <div key={popup.id} className={`runner-popup ${popup.good ? 'good' : 'bad'}`} style={{ left: `${laneW * (lane + 0.5)}%` }}>{popup.text}</div>}
        </div>

        {/* Overlays */}
        {phase === 'loading' && <div className="runner-overlay"><div className="runner-panel center">{error ? <><div className="error-box">{error}</div><div className="row mt" style={{ justifyContent: 'center' }}><button className="btn" onClick={onExit}>Back</button></div></> : 'Loading questions…'}</div></div>}
        {phase === 'ready' && (
          <div className="runner-overlay">
            <div className="runner-panel">
              <h2 style={{ marginTop: 0 }}>🚀 Answer Runner</h2>
              <p className="muted small">Answers rush toward you as gates. Fly through the correct one.</p>
              <ul className="small runner-help">
                <li><b>← →</b> or <b>A D</b> to change lane, or <b>1–4</b> to jump. On touch, tap a lane or swipe.</li>
                <li>Hold <b>↑</b> or <b>Space</b> to boost when you're sure. Faster answers score more.</li>
                <li>Every 3 in a row raises your multiplier (up to ×5). Three mistakes ends the run.</li>
                <li><b>P</b> or <b>Esc</b> to pause.</li>
              </ul>
              <button className="btn primary lg block" onClick={go} autoFocus>Start · Space</button>
            </div>
          </div>
        )}
        {phase === 'countdown' && <div className="runner-overlay clear"><div key={count} className="runner-count">{count === 0 ? 'GO!' : count}</div></div>}
        {phase === 'paused' && (
          <div className="runner-overlay">
            <div className="runner-panel center">
              <h2 style={{ marginTop: 0 }}>Paused</h2>
              {error && <div className="error-box mb">{error}</div>}
              <div className="row" style={{ justifyContent: 'center' }}>
                {!error && <button className="btn primary" onClick={() => setPhase('running')} autoFocus>▶ Resume</button>}
                <button className="btn" onClick={async () => { setPhase('over'); await finish() }}>End run</button>
              </div>
            </div>
          </div>
        )}
        {phase === 'over' && (
          <div className="runner-overlay">
            <div className="runner-panel wide">
              {!summary ? <div className="center">Tallying your run…</div> : (
                <>
                  <div className="center">
                    <div style={{ fontSize: '2.4rem' }}>{summary.isBest ? '🏆' : summary.accuracy >= 70 ? '🌟' : '🚀'}</div>
                    <h2 style={{ margin: '4px 0' }}>{summary.isBest ? 'New personal best!' : 'Run complete'}</h2>
                    <div className="runner-final">{summary.score.toLocaleString()}</div>
                    <div className="small muted">{summary.correct}/{summary.answered} correct ({summary.accuracy}%) · best streak {summary.maxStreak} · {summary.durationSec}s{!summary.isBest && summary.previousBest > 0 ? ` · your best ${summary.previousBest.toLocaleString()}` : ''}</div>
                  </div>
                  <div className="grid mt" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    <div>
                      <div className="small" style={{ fontWeight: 700 }}>Review what you missed</div>
                      {summary.missed.length ? (
                        <div className="stack mt" style={{ gap: 8, maxHeight: 240, overflow: 'auto' }}>
                          {summary.missed.map((m, i) => (
                            <div key={i} className="runner-miss">
                              <div className="small" style={{ fontWeight: 600 }}><InlineMd text={m.prompt} /></div>
                              {m.given !== null && <div className="tiny" style={{ color: 'var(--danger)' }}>You: <InlineMd text={m.given} /></div>}
                              <div className="tiny" style={{ color: 'var(--success)' }}>Answer: <InlineMd text={m.correct ?? ''} /></div>
                              {m.explanation && <div className="tiny muted"><Markdown text={m.explanation} /></div>}
                            </div>
                          ))}
                        </div>
                      ) : <div className="small muted mt">Nothing missed. Flawless! ✨</div>}
                    </div>
                    <div>
                      <div className="small" style={{ fontWeight: 700 }}>This week's top runners</div>
                      <ol className="runner-board">
                        {summary.leaderboard.map((r) => <li key={r.userId}><span>{r.name}</span><b>{r.score.toLocaleString()}</b></li>)}
                        {!summary.leaderboard.length && <li className="muted">No scores yet this week.</li>}
                      </ol>
                    </div>
                  </div>
                  <div className="row mt" style={{ justifyContent: 'center' }}>
                    <button className="btn primary lg" onClick={start} autoFocus>↻ Play again</button>
                    <button className="btn lg" onClick={onExit}>Done</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="tiny muted center mt hide-sm">← → change lane · hold ↑ / Space to boost · P to pause</div>
      {/* Mobile boost button */}
      {phase === 'running' && (
        <button className="runner-boost-btn" onPointerDown={() => { boosting.current = true; sfx.boost() }} onPointerUp={() => (boosting.current = false)} onPointerLeave={() => (boosting.current = false)} aria-label="Boost">⚡</button>
      )}
    </div>
  )
}
