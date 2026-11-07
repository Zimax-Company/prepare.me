import { z } from 'zod'
import { db } from '@/lib/db'
import { handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { getEnrollment } from '@/lib/learning'
import { addUsage } from '@/lib/activity'
import { goalStatus, validTimezone } from '@/lib/streaks'

/** Called by <UsageTracker> while a student actively uses a lesson, exam or game. */
export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const body = await parseBody(req, z.object({ courseId: z.number().int().positive(), seconds: z.number().int().min(1).max(600), tz: z.string().max(64).optional() }))
  const row = await db('users').where({ id: user.id }).first('timezone')
  let tz = row?.timezone ?? 'UTC'
  const reported = validTimezone(body.tz)
  if (reported && reported !== tz) { tz = reported; await db('users').where({ id: user.id }).update({ timezone: tz }) }
  if (!(await getEnrollment(user.id, body.courseId))) return ok({ recorded: 0, goal: null })
  const recorded = Math.min(body.seconds, 120) // never trust a client for more than two minutes per beat
  await addUsage(user.id, body.courseId, recorded, tz)
  return ok({ recorded, goal: await goalStatus(user.id, { record: true }) })
})
