import { db } from '@/lib/db'
import { created, handle, id, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { sectionSchema } from '@/lib/schemas'

export const POST = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const course_id = id(params.id)
  const body = await parseBody(req, sectionSchema)
  const max = await db('course_sections').where({ course_id }).max({ p: 'position' }).first()
  const [sid] = await db('course_sections').insert({ ...body, competencies: JSON.stringify(body.competencies), course_id, position: Number(max?.p ?? -1) + 1 })
  return created({ id: Number(sid) })
})
