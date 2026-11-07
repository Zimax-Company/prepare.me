import Link from 'next/link'
import { RANGES, type Range } from '@/lib/analytics'

/** Segmented 7/30/90-day control; keeps other query params. */
export function RangePicker({ value, params = {} }: { value: Range; params?: Record<string, string | undefined> }) {
  const href = (r: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>, range: String(r) })}`
  return (
    <div className="seg" role="group" aria-label="Date range">
      {RANGES.map((r) => <Link key={r} href={href(r)} className={r === value ? 'active' : ''} aria-current={r === value ? 'true' : undefined}>{r} days</Link>)}
    </div>
  )
}
