import Link from 'next/link'
import { db } from '@/lib/db'
import { toCourse } from '@/lib/learning'
import { NewCourseButton } from '@/components/admin/NewCourseButton'
import { CourseCover, Empty } from '@/components/ui'

export const metadata = { title: 'Courses' }

export default async function AdminCourses({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const courses = (await db('courses').orderBy('title')).map(toCourse)
  const count = async (table: string) => new Map(((await db(table).groupBy('course_id').select('course_id').count({ n: '*' })) as any[]).map((r) => [Number(r.course_id), Number(r.n)]))
  const [concepts, questions, students] = await Promise.all([count('concepts'), count('questions'), count('enrollments')])
  return (
    <div className="stack-lg">
      <div className="row between"><h1 style={{ margin: 0 }}>Courses</h1><NewCourseButton autoOpen={(await searchParams).new === '1'} /></div>
      {!courses.length && <Empty title="No courses yet">Create your first course to get started.</Empty>}
      <div className="grid grid-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`} className="card hover">
            <CourseCover icon={c.icon} color={c.color} height={80} />
            <div className="row between"><div className="card-title">{c.title}</div><span className={`badge ${c.published ? 'success' : ''}`}>{c.published ? 'Live' : 'Draft'}</span></div>
            <div className="row small muted" style={{ gap: 12 }}><span>📚 {concepts.get(c.id) ?? 0}</span><span>❓ {questions.get(c.id) ?? 0}</span><span>👥 {students.get(c.id) ?? 0}</span></div>
          </Link>
        ))}
      </div>
    </div>
  )
}
