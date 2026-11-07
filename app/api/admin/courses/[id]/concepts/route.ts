import { db } from '@/lib/db'
import { created, handle, id, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { conceptSchema } from '@/lib/schemas'

export const POST = handle<{ id: string }>(async (req, params) => {
  await requireAdmin(req)
  const course_id = id(params.id)
  const body = await parseBody(req, conceptSchema)
  const max = await db('concepts').where({ course_id }).max({ p: 'position' }).first()
  const [cid] = await db('concepts').insert({ ...body, blocks: JSON.stringify(body.blocks), course_id, position: Number(max?.p ?? -1) + 1 })
  return created({ id: Number(cid) })
})
