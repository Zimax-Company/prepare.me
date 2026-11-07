import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container page center" style={{ paddingTop: 100 }}>
      <div style={{ fontSize: '3rem' }}>🧭</div>
      <h1>Page not found</h1>
      <p className="muted">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link className="btn primary" href="/">Go home</Link>
    </main>
  )
}
