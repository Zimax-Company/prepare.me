import { z } from 'zod'
import { handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { endRunner } from '@/lib/games'

export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const { sessionId } = await parseBody(req, z.object({ sessionId: z.number().int().positive() }))
  return ok(await endRunner(user.id, sessionId))
})
