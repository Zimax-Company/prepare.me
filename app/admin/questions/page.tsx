import { Suspense } from 'react'
import { db } from '@/lib/db'
import { toQuestion } from '@/lib/learning'
import { QuestionBank } from '@/components/admin/QuestionBank'

export const metadata = { title: 'Question bank' }

type SP = Promise<{ course?: string; concept?: string; level?: string; type?: string; q?: string }>

export default async function Questions({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const query = db('questions')
  if (Number(sp.course)) query.where('course_id', Number(sp.course))
  if (sp.concept === 'none') query.whereNull('concept_id')
  else if (Number(sp.concept)) query.where('concept_id', Number(sp.concept))
  if (sp.level) query.where('level', sp.level)
  if (sp.type) query.where('type', sp.type)
  if (sp.q) query.whereILike('prompt', `%${sp.q.replace(/[%_]/g, '\\$&')}%`)
  const [courses, concepts, rows] = await Promise.all([
    db('courses').select('id', 'title', 'icon').orderBy('title'),
    db('concepts').select('id', 'course_id', 'title', 'slug').orderBy(['course_id', 'position']),
    query.orderBy('id', 'desc').limit(500),
  ])
  return (
    <Suspense>
      <QuestionBank
        courses={courses.map((c) => ({ id: Number(c.id), title: c.title, icon: c.icon }))}
        concepts={concepts.map((c) => ({ id: Number(c.id), course_id: Number(c.course_id), title: c.title, slug: c.slug }))}
        questions={rows.map(toQuestion)}
        total={rows.length}
      />
    </Suspense>
  )
}
