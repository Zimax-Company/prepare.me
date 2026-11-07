import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { forbidden, unauthorized } from './http'
import type { User } from './types'

export const SESSION_COOKIE = 'prepareme_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 14
const USER_COLUMNS = ['id', 'name', 'email', 'role', 'is_active'] as const

function secret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long')
  return new TextEncoder().encode(s)
}

export async function issueToken(userId: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(secret())
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

const toUser = (row: Record<string, unknown>): User => ({
  id: Number(row.id),
  name: String(row.name),
  email: String(row.email),
  role: row.role === 'admin' ? 'admin' : 'student',
  is_active: Boolean(row.is_active),
})

async function userFromToken(token: string | undefined | null): Promise<User | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    const row = await db('users').select(USER_COLUMNS).where({ id: Number(payload.sub) }).first()
    return row && row.is_active ? toUser(row) : null
  } catch {
    return null
  }
}

export function setSessionCookie(res: NextResponse, req: NextRequest, token: string) {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

// ---- API routes ----------------------------------------------------------------------------

/** Cookie-authenticated writes must be same-origin (SameSite=Lax covers most of it; this closes the rest). */
export async function requireUser(req: NextRequest): Promise<User> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    if (origin && new URL(origin).host !== host) throw forbidden('Cross-origin request rejected')
  }
  const user = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (!user) throw unauthorized()
  return user
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req)
  if (user.role !== 'admin') throw forbidden('Admins only')
  return user
}

// ---- Server components ---------------------------------------------------------------------

/** The signed-in user, or null (memoised per request). */
export const getSessionUser = cache(async () => userFromToken((await cookies()).get(SESSION_COOKIE)?.value))

export async function requirePageUser() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

export async function requirePageAdmin() {
  const user = await requirePageUser()
  if (user.role !== 'admin') redirect('/dashboard')
  return user
}
