'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogoutButton } from './LogoutButton'

type Item = { href: string; label: string }

/** Hamburger menu for small screens (the desktop links are hidden below 720px). */
export function MobileMenu({ items, userName, showLogout = false }: { items: Item[]; userName?: string; showLogout?: boolean }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setOpen(false), [path]) // close after navigating
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [open])

  return (
    <div ref={ref} className="mobile-menu show-sm">
      <button className="btn sm ghost icon-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu-panel" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{open ? '✕' : '☰'}</span>
      </button>
      {open && (
        <nav id="mobile-menu-panel" className="mobile-menu-panel">
          {userName && <div className="tiny muted" style={{ padding: '4px 12px 8px' }}>Signed in as <b>{userName}</b></div>}
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={path === i.href || (i.href !== '/' && path.startsWith(i.href + '/')) ? 'active' : ''}>{i.label}</Link>
          ))}
          {showLogout && <div style={{ padding: '8px 12px 0', borderTop: '1px solid var(--border)', marginTop: 6 }}><LogoutButton /></div>}
        </nav>
      )}
    </div>
  )
}
