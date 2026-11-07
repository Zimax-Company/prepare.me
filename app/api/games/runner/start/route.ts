import { z } from 'zod'
import { handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { startRunner } from '@/lib/games'

export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const { courseId, sectionId } = await parseBody(req, z.object({ courseId: z.number().int().positive(), sectionId: z.number().int().positive().nullable().optional() }))
  return ok(await startRunner(user.id, courseId, sectionId ?? null))
})
