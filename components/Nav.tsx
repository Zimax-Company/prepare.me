import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { LogoutButton } from './LogoutButton'
import { goalStatus } from '@/lib/streaks'
import { MobileMenu } from './MobileMenu'

export async function Nav() {
  const user = await getSessionUser()
  const goal = user ? await goalStatus(user.id) : null
  const items = [
    { href: '/courses', label: '📚 Courses' },
    ...(!user ? [{ href: '/login', label: '🔑 Log in' }, { href: '/register', label: '✨ Create account' }] : []),
    ...(user ? [{ href: '/dashboard', label: '🏠 My learning' }, { href: '/play', label: '🎮 Play' }] : []),
    ...(user?.role === 'admin' ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ]
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark">✦</span><span>prepare<span className="dot">.</span>me</span>
        </Link>
        <nav className="nav-links hide-sm">
          <Link href="/courses">Courses</Link>
          {user && <Link href="/dashboard">My learning</Link>}
          {user && <Link href="/play">🎮 Play</Link>}
          {user?.role === 'admin' && <Link href="/admin">Admin</Link>}
        </nav>
        <div className="grow" />
        {user ? (
          <div className="row">
            {goal && (
              <Link href="/dashboard#goal" className={`streak-chip ${goal.met ? 'lit' : ''}`} title={`${goal.streak}-day streak · today ${goal.progress}/${goal.target} ${goal.kind}${goal.met ? ' ✓' : ''}`}>
                <span aria-hidden>🔥</span><b>{goal.streak}</b><span className="sr-only"> day streak</span>
              </Link>
            )}
            <span className="small muted hide-sm">{user.name}</span>
            <span className="hide-sm"><LogoutButton /></span>
            <MobileMenu items={items} userName={user.name} showLogout />
          </div>
        ) : (
          <div className="row">
            <Link className="btn ghost sm hide-sm" href="/login">Log in</Link>
            <Link className="btn primary sm" href="/register">Get started</Link>
            <MobileMenu items={items} />
          </div>
        )}
      </div>
    </header>
  )
}
