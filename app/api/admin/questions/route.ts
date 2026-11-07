import { z } from 'zod'
import { db } from '@/lib/db'
import { created, handle, parseBody } from '@/lib/http'
import { requireAdmin } from '@/lib/auth'
import { questionSchema } from '@/lib/schemas'

const toRow = (q: z.infer<typeof questionSchema>) => ({ ...q, options: JSON.stringify(q.options), answer: JSON.stringify(q.answer) })

/** Accepts one question, or `{ questions: [...] }` for bulk import. */
export const POST = handle(async (req) => {
  await requireAdmin(req)
  const body = await parseBody(req, z.union([z.object({ questions: z.array(questionSchema).min(1).max(500) }), questionSchema]))
  const list = 'questions' in body ? body.questions : [body]
  const ids = await db.transaction(async (trx) => {
    const out: number[] = []
    for (const q of list) out.push(Number((await trx('questions').insert(toRow(q)))[0]))
    return out
  })
  return created({ ids })
})
