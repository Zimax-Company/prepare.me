import { db } from '@/lib/db'
import { created, handle, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { courseSchema } from '@/lib/schemas'
import { DEFAULT_EXAM } from '@/lib/learning'

export const POST = handle(async (req) => {
  await requireAdmin(req)
  const body = await parseBody(req, courseSchema)
  const [id] = await db('courses').insert(body)
  await db('exam_settings').insert({ course_id: id, ...DEFAULT_EXAM })
  return created({ id: Number(id) })
})
