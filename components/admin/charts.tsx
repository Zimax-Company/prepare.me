'use client'

// Small, dependency-free SVG charts for the admin analytics.
// Single-series charts use the validated brand hue (--primary, checked against both surfaces);
// the heatmap is a one-hue light→dark ramp of the same hue. Every chart has a hover layer and a table view.
import { useEffect, useRef, useState, type ReactNode } from 'react'

const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtNum = (v: number) => v.toLocaleString('en-GB')

function niceMax(v: number) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Card wrapper with title, optional caption and a chart/table toggle. */
export function ChartCard({ title, caption, table, children, right }: { title: string; caption?: string; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; right?: ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <div className="card chart-card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="card-title" style={{ margin: 0 }}>{title}</div>
          {caption && <div className="tiny muted">{caption}</div>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {right}
          <button className="btn sm ghost" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>{asTable ? 'Chart' : 'Table'}</button>
        </div>
      </div>
      <div className="mt">
        {asTable ? (
          <div className="table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="table">
              <thead><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === 'number' ? fmtNum(c) : c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : children}
      </div>
    </div>
  )
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70)
  return <div className="chart-tip" style={{ left, top: y }}>{children}</div>
}

/** Line + soft area over time, with crosshair tooltip. */
export function TimeSeries({ data, unit, height = 180 }: { data: { date: string; value: number }[]; unit: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 36, r: 12, t: 12, b: 24 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const x = (i: number) => pad.l + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w)
  const y = (v: number) => pad.t + h - (v / max) * h
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const area = `${line}L${x(data.length - 1)},${pad.t + h}L${x(0)},${pad.t + h}Z`
  const ticks = [0, max / 2, max]
  const labelIdx = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0]

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = Math.round(((px - pad.l) / w) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${unit} per day`} style={{ display: 'block', touchAction: 'none' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 6} y={y(t) + 4} className="chart-axis" textAnchor="end">{fmtNum(t)}</text>
          </g>
        ))}
        {labelIdx.map((i) => <text key={i} x={x(i)} y={height - 6} className="chart-axis" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{fmtDay(data[i].date)}</text>)}
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} className="chart-crosshair" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} className="chart-dot" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={y(data[hover].value) - 12} width={width}>
          <b>{fmtNum(data[hover].value)}</b> {unit}<div className="tiny muted">{fmtDay(data[hover].date)}</div>
        </Tooltip>
      )}
    </div>
  )
}

/** Vertical bars for categories (distribution) or many items (funnel). */
export function Columns({ data, unit, height = 180, showValues = true, labelEvery }: {
  data: { label: string; value: number; sub?: string }[]
  unit: string
  height?: number
  showValues?: boolean
  labelEvery?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 36, r: 8, t: showValues ? 18 : 10, b: 24 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const slot = w / Math.max(1, data.length)
  const gap = data.length > 40 ? 1 : 2 // surface gap between adjacent fills
  const bw = Math.max(1, slot - gap)
  const y = (v: number) => pad.t + h - (v / max) * h
  const r = Math.min(4, bw / 2)
  const every = labelEvery ?? (data.length <= 12 ? 1 : Math.ceil(data.length / 8))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={width} height={height} onPointerLeave={() => setHover(null)} role="img" aria-label={unit} style={{ display: 'block' }}>
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 6} y={y(t) + 4} className="chart-axis" textAnchor="end">{fmtNum(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = pad.l + i * slot + gap / 2
          const top = y(d.value)
          const bh = pad.t + h - top
          // Rounded data-end, square baseline.
          const path = bh <= 0 ? '' : bh < r
            ? `M${x0},${pad.t + h}V${top}H${x0 + bw}V${pad.t + h}Z`
            : `M${x0},${pad.t + h}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${pad.t + h}Z`
          return (
            <g key={i} onPointerEnter={() => setHover(i)}>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={h} fill="transparent" />
              {path && <path d={path} className={`chart-bar ${hover === i ? 'on' : ''}`} />}
              {showValues && data.length <= 12 && <text x={x0 + bw / 2} y={top - 5} className="chart-value" textAnchor="middle">{fmtNum(d.value)}</text>}
              {i % every === 0 && <text x={x0 + bw / 2} y={height - 6} className="chart-axis" textAnchor="middle">{d.label}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={pad.l + hover * slot + slot / 2} y={y(data[hover].value) - 12} width={width}>
          <b>{fmtNum(data[hover].value)}</b> {unit}<div className="tiny muted">{data[hover].sub ?? data[hover].label}</div>
        </Tooltip>
      )}
    </div>
  )
}

/** GitHub-style daily activity grid: weeks as columns, one-hue ramp by minutes. */
export function Heatmap({ data }: { data: { date: string; minutes: number; events: number }[] }) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)
  const max = Math.max(...data.map((d) => d.minutes), 1)
  const step = (d: { minutes: number; events: number }) => (d.minutes > 0 ? 1 + Math.min(3, Math.floor((d.minutes / max) * 4 - 1e-9)) : d.events > 0 ? 1 : 0)
  // Align so each column is Mon..Sun.
  const firstDow = (new Date(`${data[0].date}T00:00:00Z`).getUTCDay() + 6) % 7
  const cells = [...Array(firstDow).fill(null), ...data]
  const weeks = Math.ceil(cells.length / 7)
  const size = 14
  const gap = 3
  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <svg width={weeks * (size + gap) + 28} height={7 * (size + gap) + 4} role="img" aria-label="Daily learning activity" style={{ display: 'block' }} onPointerLeave={() => setHover(null)}>
        {['Mon', 'Wed', 'Fri'].map((d, k) => <text key={d} x={0} y={(k * 2) * (size + gap) + size - 3} className="chart-axis">{d}</text>)}
        {cells.map((c, idx) => {
          if (!c) return null
          const col = Math.floor(idx / 7)
          const row = idx % 7
          const x = 28 + col * (size + gap)
          const y = row * (size + gap)
          const i = idx - firstDow
          return <rect key={c.date} x={x} y={y} width={size} height={size} rx={3} className={`heat heat-${step(c)}`} onPointerEnter={() => setHover({ i, x: x + size / 2, y })} />
        })}
      </svg>
      <div className="row tiny muted mt" style={{ gap: 4 }}>
        Less {[0, 1, 2, 3, 4].map((s) => <svg key={s} width={12} height={12}><rect width={12} height={12} rx={3} className={`heat heat-${s}`} /></svg>)} More
      </div>
      {hover && (
        <div className="chart-tip" style={{ left: hover.x, top: hover.y - 8 }}>
          <b>{data[hover.i].minutes} min</b> learning · {data[hover.i].events} actions
          <div className="tiny muted">{fmtDay(data[hover.i].date)}</div>
        </div>
      )}
    </div>
  )
}

/** Horizontal labelled bars (e.g. level split); values are direct-labelled. */
export function BarList({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="stack" style={{ gap: 8 }}>
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: ${fmtNum(d.value)} ${unit}`}>
          <div className="row between small"><span>{d.label}</span><b>{fmtNum(d.value)}</b></div>
          <div className="barlist-track"><span style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

/** KPI tile with change vs the previous equal-length period. */
export function Kpi({ label, value, prev, suffix = '', hint }: { label: string; value: number | null; prev?: number; suffix?: string; hint?: string }) {
  let delta: ReactNode = null
  if (prev !== undefined && value !== null) {
    if (prev === 0 && value === 0) delta = <span className="tiny muted">no change</span>
    else if (prev === 0) delta = <span className="tiny delta up">▲ new</span>
    else {
      const pct = Math.round(((value - prev) / prev) * 100)
      delta = <span className={`tiny delta ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} {Math.abs(pct)}% <span className="muted">vs prev.</span></span>
    }
  }
  return (
    <div className="card stat" title={hint}>
      <b>{value === null ? '—' : `${fmtNum(value)}${suffix}`}</b>
      <span>{label}</span>
      {delta}
    </div>
  )
}
