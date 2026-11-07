import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, json } from '@/lib/db'
import { getExamSettings, toCourse } from '@/lib/learning'
import { CourseForm } from '@/components/admin/CourseForm'
import { ConceptManager } from '@/components/admin/ConceptManager'
import { ExamSettingsForm } from '@/components/admin/ExamSettingsForm'
import { DeleteCourse } from '@/components/admin/DeleteCourse'

const TABS = [['concepts', 'Concepts'], ['details', 'Details'], ['exam', 'Exam settings']] as const

export default async function AdminCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const id = Number((await params).id)
  const tab = (await searchParams).tab ?? 'concepts'
  const row = Number.isSafeInteger(id) ? await db('courses').where({ id }).first() : null
  if (!row) notFound()
  const course = toCourse(row)
  const [concepts, qCounts, settings, pool] = await Promise.all([
    db('concepts').where({ course_id: id }).orderBy([{ column: 'position' }, { column: 'id' }]),
    db('questions').where({ course_id: id }).groupBy('concept_id').select('concept_id').count({ n: '*' }) as Promise<any[]>,
    getExamSettings(id),
    db('questions').where({ course_id: id, in_exam: true }).count({ n: '*' }).first(),
  ])
  const qc = new Map(qCounts.map((r) => [Number(r.concept_id), Number(r.n)]))

  return (
    <div className="stack-lg">
      <div className="row between wrap">
        <div>
          <Link href="/admin/courses" className="small muted">← Courses</Link>
          <h1 style={{ margin: '4px 0 0' }}>{course.icon} {course.title} <span className={`badge ${course.published ? 'success' : ''}`} style={{ verticalAlign: 'middle' }}>{course.published ? 'Published' : 'Draft'}</span></h1>
        </div>
        <div className="row">
          <Link className="btn" href={`/admin/questions?course=${id}`}>❓ Question bank</Link>
          <Link className="btn" href={`/courses/${course.slug}`} target="_blank">Preview ↗</Link>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([k, label]) => <Link key={k} href={`?tab=${k}`} className={tab === k ? 'active' : ''}>{label}</Link>)}
      </div>
      {tab === 'concepts' && (
        <ConceptManager
          courseId={id}
          concepts={concepts.map((c) => ({ id: Number(c.id), title: c.title, slug: c.slug, level: c.level, est_minutes: Number(c.est_minutes), blocks: json<unknown[]>(c.blocks, []).length, questions: qc.get(Number(c.id)) ?? 0 }))}
        />
      )}
      {tab === 'details' && (
        <div className="stack-lg">
          <div className="card"><CourseForm course={course} /></div>
          <div className="card flat row between wrap" style={{ borderColor: 'var(--danger)' }}>
            <div><div style={{ fontWeight: 700 }}>Danger zone</div><div className="small muted">Deletes the course and all of its data.</div></div>
            <DeleteCourse id={id} title={course.title} />
          </div>
        </div>
      )}
      {tab === 'exam' && <div className="card"><ExamSettingsForm settings={settings} pool={Number(pool?.n ?? 0)} /></div>}
    </div>
  )
}
