import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { handle, parseBody, conflict } from '@/lib/http'
import { logEvent } from '@/lib/activity'
import { hashPassword, issueToken, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(190).transform((e) => e.toLowerCase()),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
})

export const POST = handle(async (req) => {
  const body = await parseBody(req, schema)
  if (await db('users').where({ email: body.email }).first()) throw conflict('An account with that email already exists')
  const [id] = await db('users').insert({ name: body.name, email: body.email, password_hash: await hashPassword(body.password), role: 'student' })
  await logEvent(Number(id), 'register')
  const res = NextResponse.json({ data: { id: Number(id) } }, { status: 201 })
  setSessionCookie(res, req, await issueToken(Number(id)))
  return res
})
