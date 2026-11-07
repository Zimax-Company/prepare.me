'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#6d5efc', '#c86bff', '#ff7eb3', '#17c964', '#f5a524', '#0b7fd6']

export function Confetti() {
  const [pieces, setPieces] = useState<{ left: number; delay: number; dur: number; color: string; rot: number }[]>([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setPieces(Array.from({ length: 90 }, () => ({ left: Math.random() * 100, delay: Math.random() * 0.8, dur: 2.2 + Math.random() * 1.8, color: COLORS[Math.floor(Math.random() * COLORS.length)], rot: Math.random() * 360 })))
    const t = setTimeout(() => setPieces([]), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />)}
    </div>
  )
}
