import { db } from '@/lib/db'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { courseSchema } from '@/lib/schemas'

export const PATCH = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const body = await parseBody(req, courseSchema.partial())
  const n = await db('courses').where({ id: id(params.id) }).update({ ...body, updated_at: new Date() })
  if (!n) throw notFound('Course')
  return ok({ id: id(params.id) })
})

export const DELETE = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  await db('courses').where({ id: id(params.id) }).delete()
  return noContent()
})
