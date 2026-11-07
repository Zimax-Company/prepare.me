'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ApiErrorBody = { message?: string; details?: { path: string; message: string }[] }

export class ApiClientError extends Error {
  constructor(public status: number, public body: ApiErrorBody | undefined) {
    super(body?.message ?? `Request failed (${status})`)
  }
}

/** Browser call to the API; the session cookie is sent automatically. Returns the unwrapped `data`. */
export async function apiCall<T = unknown>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return null as T
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiClientError(res.status, json?.error)
  return json?.data as T
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiClientError && err.body?.details?.length) {
    return `${err.body.message}: ${err.body.details.map((d) => `${d.path || 'field'} — ${d.message}`).join('; ')}`
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}

/** Form helper: pending/error state, and a server re-render after a successful mutation. */
export function useAction() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run<T>(fn: () => Promise<T>, { refresh = true } = {}): Promise<T | undefined> {
    setPending(true)
    setError(null)
    try {
      const result = await fn()
      if (refresh) router.refresh()
      return result
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return { pending, error, setError, run }
}
