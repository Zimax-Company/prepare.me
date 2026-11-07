import { z } from 'zod'
import { handle, id, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { finalizeAttempt, getOwnAttempt } from '@/lib/learning'
import { answersSchema } from '@/lib/schemas'

export const POST = handle<{ id: string }>(async (req, params) => {
  const user = await requireUser(req)
  const { answers } = await parseBody(req, z.object({ answers: answersSchema.optional() }))
  const attempt = await getOwnAttempt(id(params.id, 'Attempt'), user.id)
  const done = await finalizeAttempt(attempt, answers)
  return ok({ id: done.id, score: done.score, total: done.total, percent: done.percent, passed: done.passed })
})
