import { z } from 'zod'
import { db } from '@/lib/db'
import { forbidden, handle, id, notFound, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { getEnrollment, toQuestion } from '@/lib/learning'
import { isCorrect } from '@/lib/grading'
import { logEvent } from '@/lib/activity'

/** Checks a practice answer server-side so answers never ship to the browser before attempting. */
export const POST = handle<{ id: string }>(async (req, params) => {
  const user = await requireUser(req)
  const { answer } = await parseBody(req, z.object({ answer: z.array(z.string().max(500)).max(20) }))
  const row = await db('questions').where({ id: id(params.id, 'Question'), in_practice: true }).first()
  if (!row) throw notFound('Question')
  if (!(await getEnrollment(user.id, row.course_id))) throw forbidden('Enroll in the course first')
  const q = toQuestion(row)
  const correct = isCorrect(q, answer)
  if (q.concept_id) {
    await db('concept_progress')
      .insert({ user_id: user.id, concept_id: q.concept_id, viewed_at: new Date(), practice_answered: 1, practice_correct: correct ? 1 : 0 })
      .onConflict(['user_id', 'concept_id'])
      .merge({ practice_answered: db.raw('practice_answered + 1'), practice_correct: db.raw(`practice_correct + ${correct ? 1 : 0}`) })
  }
  await logEvent(user.id, 'practice_answer', { courseId: q.course_id, conceptId: q.concept_id, meta: { questionId: q.id, correct } })
  return ok({ correct, answer: q.answer, explanation: q.explanation })
})
