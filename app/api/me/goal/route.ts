import { z } from 'zod'
import { db } from '@/lib/db'
import { badRequest, handle, ok, parseBody } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { GOAL_OPTIONS, goalStatus, validTimezone } from '@/lib/streaks'

export const GET = handle(async (req) => {
  const user = await requireUser(req)
  return ok(await goalStatus(user.id))
})

/** Change the daily goal (and/or report the browser's time zone). */
export const PATCH = handle(async (req) => {
  const user = await requireUser(req)
  const b = await parseBody(req, z.object({ kind: z.enum(['minutes', 'lessons']).optional(), value: z.number().int().optional(), tz: z.string().max(64).optional() }))
  const patch: Record<string, unknown> = {}
  if (b.kind || b.value !== undefined) {
    const kind = b.kind ?? 'minutes'
    if (b.value === undefined || !(GOAL_OPTIONS[kind] as readonly number[]).includes(b.value)) throw badRequest(`Pick one of: ${GOAL_OPTIONS[kind].join(', ')}`)
    patch.goal_kind = kind
    patch.goal_value = b.value
  }
  const tz = validTimezone(b.tz)
  if (tz) patch.timezone = tz
  if (Object.keys(patch).length) await db('users').where({ id: user.id }).update({ ...patch, updated_at: new Date() })
  // Changing the goal can complete today straight away (e.g. lowering it).
  return ok(await goalStatus(user.id, { record: true }))
})
