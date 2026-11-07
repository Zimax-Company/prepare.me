import { z } from 'zod'
import { db } from '@/lib/db'
import { handle, id, ok, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'

export const PUT = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const course_id = id(params.id)
  const { ids } = await parseBody(req, z.object({ ids: z.array(z.number().int()).max(500) }))
  await db.transaction(async (trx) => {
    for (const [position, cid] of ids.entries()) await trx('concepts').where({ id: cid, course_id }).update({ position })
  })
  return ok({ ids })
})
