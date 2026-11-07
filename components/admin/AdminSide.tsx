'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/courses', label: 'Courses', icon: '📚' },
  { href: '/admin/questions', label: 'Question bank', icon: '❓' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
]

export function AdminSide() {
  const path = usePathname()
  return (
    <aside className="admin-side">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href)
        return <Link key={l.href} href={l.href} className={active ? 'active' : ''}><span>{l.icon}</span>{l.label}</Link>
      })}
      <div className="hide-sm" style={{ borderTop: '1px solid var(--border)', margin: '12px 0', paddingTop: 12 }}>
        <Link href="/courses"><span>↗</span>View site</Link>
      </div>
    </aside>
  )
}
