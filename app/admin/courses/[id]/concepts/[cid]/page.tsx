import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { toConcept } from '@/lib/learning'
import { ConceptEditor } from '@/components/admin/ConceptEditor'

export const metadata = { title: 'Edit concept' }

export default async function EditConcept({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params
  const row = await db('concepts').where({ id: Number(cid) || 0, course_id: Number(id) || 0 }).first()
  if (!row) notFound()
  const c = toConcept(row)
  const course = await db('courses').where({ id: c.course_id }).first('slug')
  return <ConceptEditor id={c.id} courseId={c.course_id} courseSlug={course.slug} initial={c} />
}
