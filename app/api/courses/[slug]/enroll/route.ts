import { z } from 'zod'
import { handle, notFound, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { enroll, getCourseBySlug } from '@/lib/learning'
import { LEVELS } from '@/lib/types'

export const POST = handle<{ slug: string }>(async (req, { slug }) => {
  const user = await requireUser(req)
  const { level } = await parseBody(req, z.object({ level: z.enum(LEVELS) }))
  const course = await getCourseBySlug(slug)
  if (!course) throw notFound('Course')
  await enroll(user.id, course.id, level)
  return ok({ slug, level })
})
