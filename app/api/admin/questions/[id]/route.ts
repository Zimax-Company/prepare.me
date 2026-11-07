import { db } from '@/lib/db'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { questionSchema } from '@/lib/schemas'

export const PUT = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const q = await parseBody(req, questionSchema)
  const n = await db('questions').where({ id: id(params.id) }).update({ ...q, options: JSON.stringify(q.options), answer: JSON.stringify(q.answer), updated_at: new Date() })
  if (!n) throw notFound('Question')
  return ok({ id: id(params.id) })
})

export const DELETE = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  await db('questions').where({ id: id(params.id) }).delete()
  return noContent()
})
