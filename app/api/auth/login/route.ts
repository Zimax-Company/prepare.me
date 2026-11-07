import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { handle, parseBody, unauthorized } from '@/lib/http'
import { issueToken, setSessionCookie, verifyPassword } from '@/lib/auth'

const schema = z.object({ email: z.string().trim().toLowerCase(), password: z.string() })

export const POST = handle(async (req) => {
  const { email, password } = await parseBody(req, schema)
  const user = await db('users').where({ email }).first()
  if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) throw unauthorized('Incorrect email or password')
  const res = NextResponse.json({ data: { role: user.role } })
  setSessionCookie(res, req, await issueToken(Number(user.id)))
  return res
})
