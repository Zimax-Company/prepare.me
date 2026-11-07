import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSections, toConcept } from '@/lib/learning'
import { ConceptEditor } from '@/components/admin/ConceptEditor'

export const metadata = { title: 'Edit concept' }

export default async function EditConcept({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params
  const row = await db('concepts').where({ id: Number(cid) || 0, course_id: Number(id) || 0 }).first()
  if (!row) notFound()
  const c = toConcept(row)
  const [course, sections] = await Promise.all([db('courses').where({ id: c.course_id }).first('slug'), getSections(c.course_id)])
  return <ConceptEditor id={c.id} courseId={c.course_id} courseSlug={course.slug} initial={c} sections={sections.map((x) => ({ id: x.id, title: x.title }))} />
}
