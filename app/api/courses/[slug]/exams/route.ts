import { z } from 'zod'
import { forbidden, handle, notFound, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { logEvent } from '@/lib/activity'
import { getCourseBySlug, getEnrollment, startAttempt } from '@/lib/learning'
import { LEVELS } from '@/lib/types'

export const POST = handle<{ slug: string }>(async (req, { slug }) => {
  const user = await requireUser(req)
  const { level } = await parseBody(req, z.object({ level: z.enum(LEVELS) }))
  const course = await getCourseBySlug(slug, { includeDrafts: user.role === 'admin' })
  if (!course) throw notFound('Course')
  if (!(await getEnrollment(user.id, course.id))) throw forbidden('Enroll in the course first')
  const attempt = await startAttempt(user.id, course.id, level)
  // A resumed attempt started earlier; only log genuinely new ones.
  if (Date.now() - attempt.started_at.getTime() < 10_000) await logEvent(user.id, 'exam_start', { courseId: course.id, meta: { attemptId: attempt.id, level } })
  return ok({ id: attempt.id })
})
