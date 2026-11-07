import { z } from 'zod'
import { handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { getEnrollment } from '@/lib/learning'
import { addUsage } from '@/lib/activity'

/** Called by <UsageTracker> while a student actively uses a lesson or exam. */
export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const { courseId, seconds } = await parseBody(req, z.object({ courseId: z.number().int().positive(), seconds: z.number().int().min(1).max(600) }))
  if (user.role !== 'student') return ok({ recorded: 0 })
  if (!(await getEnrollment(user.id, courseId))) return ok({ recorded: 0 })
  const recorded = Math.min(seconds, 120) // never trust a client for more than two minutes per beat
  await addUsage(user.id, courseId, recorded)
  return ok({ recorded })
})
