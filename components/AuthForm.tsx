'use client'

import Link from 'next/link'
import { useState } from 'react'
import { apiCall, errorMessage } from '@/lib/client'

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await apiCall<{ role?: string }>('POST', `/auth/${mode}`, mode === 'login' ? { email: form.email, password: form.password } : form)
      window.location.href = safeNext ?? (res?.role === 'admin' ? '/admin' : mode === 'register' ? '/courses' : '/dashboard')
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <div className="container narrow page" style={{ maxWidth: 440 }}>
      <div className="card" style={{ padding: 28 }}>
        <h1 style={{ fontSize: '1.6rem' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">{mode === 'login' ? 'Log in to continue learning.' : 'Join for free and start your first course in seconds.'}</p>
        <form onSubmit={submit} className="stack mt">
          {mode === 'register' && (
            <label className="field">Full name<input className="input" required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" /></label>
          )}
          <label className="field">Email<input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
          <label className="field">Password<input className="input" type="password" required minLength={mode === 'register' ? 8 : 1} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary lg block" disabled={pending}>{pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <p className="small muted center mt">
          {mode === 'login' ? <>New here? <Link href="/register" style={{ color: 'var(--primary)' }}>Create an account</Link></> : <>Already have an account? <Link href="/login" style={{ color: 'var(--primary)' }}>Log in</Link></>}
        </p>
      </div>
    </div>
  )
}
