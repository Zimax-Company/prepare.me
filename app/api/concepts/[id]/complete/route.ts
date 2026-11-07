import { z } from 'zod'
import { db } from '@/lib/db'
import { forbidden, handle, id, notFound, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { logEvent } from '@/lib/activity'
import { getEnrollment, progressForUser } from '@/lib/learning'
import { goalStatus } from '@/lib/streaks'

export const POST = handle<{ id: string }>(async (req, params) => {
  const user = await requireUser(req)
  const { completed } = await parseBody(req, z.object({ completed: z.boolean() }))
  const concept = await db('concepts').where({ id: id(params.id, 'Concept') }).first()
  if (!concept) throw notFound('Concept')
  if (!(await getEnrollment(user.id, concept.course_id))) throw forbidden('Enroll in the course first')
  const completed_at = completed ? new Date() : null
  await db('concept_progress')
    .insert({ user_id: user.id, concept_id: concept.id, viewed_at: new Date(), completed_at })
    .onConflict(['user_id', 'concept_id'])
    .merge({ completed_at })
  await db('enrollments').where({ user_id: user.id, course_id: concept.course_id }).update({ last_activity_at: new Date() })
  if (completed) await logEvent(user.id, 'complete_concept', { courseId: Number(concept.course_id), conceptId: Number(concept.id) })
  const progress = (await progressForUser(user.id)).get(Number(concept.course_id))
  return ok({ completed, progress, goal: completed ? await goalStatus(user.id, { record: true }) : null })
})
