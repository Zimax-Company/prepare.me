import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { LogoutButton } from './LogoutButton'

export async function Nav() {
  const user = await getSessionUser()
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark">✦</span><span>prepare<span className="dot">.</span>me</span>
        </Link>
        <nav className="nav-links hide-sm">
          <Link href="/courses">Courses</Link>
          {user && <Link href="/dashboard">My learning</Link>}
          {user?.role === 'admin' && <Link href="/admin">Admin</Link>}
        </nav>
        <div className="grow" />
        {user ? (
          <div className="row">
            <span className="small muted hide-sm">{user.name}</span>
            <LogoutButton />
          </div>
        ) : (
          <div className="row">
            <Link className="btn ghost sm" href="/login">Log in</Link>
            <Link className="btn primary sm" href="/register">Get started</Link>
          </div>
        )}
      </div>
    </header>
  )
}
