import { db } from '@/lib/db'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { sectionSchema } from '@/lib/schemas'

export const PATCH = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const body = await parseBody(req, sectionSchema.partial())
  const patch = { ...body, ...(body.competencies ? { competencies: JSON.stringify(body.competencies) } : {}), updated_at: new Date() }
  const n = await db('course_sections').where({ id: id(params.id) }).update(patch)
  if (!n) throw notFound('Section')
  return ok({ id: id(params.id) })
})

/** Concepts in the section are kept; they just become unsectioned. */
export const DELETE = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  await db('course_sections').where({ id: id(params.id) }).delete()
  return noContent()
})
