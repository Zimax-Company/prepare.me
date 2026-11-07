import { z } from 'zod'
import { answersSchema } from '@/lib/schemas'
import { handle, id, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { getOwnAttempt, saveAnswers } from '@/lib/learning'



/** Autosave: called as the student answers so nothing is lost on refresh or timeout. */
export const PUT = handle<{ id: string }>(async (req, params) => {
  const user = await requireUser(req)
  const { answers } = await parseBody(req, z.object({ answers: answersSchema }))
  const attempt = await getOwnAttempt(id(params.id, 'Attempt'), user.id)
  await saveAnswers(attempt, answers)
  return ok({ saved_at: new Date().toISOString(), expires_at: attempt.expires_at.toISOString() })
})
