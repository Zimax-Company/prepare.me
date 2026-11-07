import { db } from '@/lib/db'
import { handle, id, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { examSettingsSchema } from '@/lib/schemas'

export const PUT = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const body = await parseBody(req, examSettingsSchema)
  const course_id = id(params.id)
  await db('exam_settings').insert({ course_id, ...body }).onConflict('course_id').merge(body)
  return ok({ course_id, ...body })
})
