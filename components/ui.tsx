import Link from 'next/link'
import { LEVEL_LABEL, type Level } from '@/lib/types'

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge ${level}`}>{LEVEL_LABEL[level]}</span>
}

export function ProgressBar({ value, thin = false, success = false }: { value: number; thin?: boolean; success?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={`progress ${thin ? 'thin' : ''} ${success ? 'success' : ''}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${v}%` }} />
    </div>
  )
}

export function ProgressRing({ value, size = 84, stroke = 8, label, color = 'var(--primary)' }: { value: number; size?: number; stroke?: number; label?: string; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <span className="ring-label" style={{ fontSize: size / 4.6 }}>{label ?? `${Math.round(v)}%`}</span>
    </div>
  )
}

export function CourseCover({ icon, color, height = 110 }: { icon: string; color: string; height?: number }) {
  return (
    <div className="course-cover" style={{ height, background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #6d5efc))` }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {children}
      {action && <div className="mt"><Link className="btn primary" href={action.href}>{action.label}</Link></div>}
    </div>
  )
}

export function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m}m ${s % 60}s` : `${s}s`
}
