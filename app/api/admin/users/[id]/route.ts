import { z } from 'zod'
import { db } from '@/lib/db'
import { badRequest, handle, id, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'

export const PATCH = handle<{ id: string }>(async (req, params) => {
  const me = await requireAdmin(req)
  const uid = id(params.id, 'User')
  const body = await parseBody(req, z.object({ role: z.enum(['student', 'admin']).optional(), is_active: z.boolean().optional() }))
  if (uid === me.id && (body.role === 'student' || body.is_active === false)) throw badRequest("You can't demote or deactivate yourself")
  await db('users').where({ id: uid }).update({ ...body, updated_at: new Date() })
  return ok({ id: uid, ...body })
})
