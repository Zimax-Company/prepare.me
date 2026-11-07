import { db } from '@/lib/db'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { conceptSchema } from '@/lib/schemas'

export const PATCH = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const body = await parseBody(req, conceptSchema.partial())
  const patch = { ...body, ...(body.blocks ? { blocks: JSON.stringify(body.blocks) } : {}), updated_at: new Date() }
  const n = await db('concepts').where({ id: id(params.id) }).update(patch)
  if (!n) throw notFound('Concept')
  return ok({ id: id(params.id), saved_at: new Date().toISOString() })
})

export const DELETE = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  await db('concepts').where({ id: id(params.id) }).delete()
  return noContent()
})
