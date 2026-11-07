import { z } from 'zod'
import { handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { answerRunner } from '@/lib/games'

export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const b = await parseBody(req, z.object({ sessionId: z.number().int().positive(), questionId: z.number().int().positive(), optionId: z.string().max(20).nullable() }))
  return ok(await answerRunner(user.id, b.sessionId, b.questionId, b.optionId))
})
