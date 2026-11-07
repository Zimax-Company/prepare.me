import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { getConcepts, getCourseBySlug, getEnrollment, getExamSettings } from '@/lib/learning'
import { db } from '@/lib/db'
import { LEVELS, levelsUpTo, type Level } from '@/lib/types'
import { EnrollPanel } from '@/components/EnrollPanel'
import { CourseCover, LevelBadge } from '@/components/ui'
import { Markdown } from '@/components/Markdown'

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getSessionUser()
  const course = await getCourseBySlug(slug, { includeDrafts: user?.role === 'admin' })
  if (!course) notFound()
  const [concepts, enrollment, exam, qCount] = await Promise.all([
    getConcepts(course.id),
    user ? getEnrollment(user.id, course.id) : null,
    getExamSettings(course.id),
    db('questions').where({ course_id: course.id }).count({ n: '*' }).first(),
  ])
  const counts = Object.fromEntries(LEVELS.map((l) => [l, concepts.filter((c) => levelsUpTo(l).includes(c.level)).length])) as Record<Level, number>
  const minutes = concepts.reduce((s, c) => s + c.est_minutes, 0)

  return (
    <main className="container page">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)', gap: 32 }}>
        <div className="stack-lg">
          <div>
            {!course.published && <span className="badge danger mb">Draft: only admins can see this</span>}
            <span className="badge mb">{course.category}</span>
            <h1 style={{ fontSize: '2.3rem' }}>{course.icon} {course.title}</h1>
            <p className="muted" style={{ fontSize: '1.1rem' }}>{course.tagline}</p>
            <div className="row wrap small muted" style={{ gap: 18 }}>
              <span>📚 {concepts.length} concepts</span><span>⏱ ~{minutes} min</span><span>❓ {Number(qCount?.n ?? 0)} questions</span><span>📝 {exam.duration_minutes}-min exam · pass {exam.pass_mark}%</span>
            </div>
          </div>
          {course.description && <div className="card flat"><Markdown text={course.description} /></div>}
          <div>
            <h2>What you&apos;ll learn</h2>
            <div className="stack" style={{ gap: 8 }}>
              {concepts.map((c, i) => (
                <div key={c.id} className="concept-item">
                  <div className="concept-num">{i + 1}</div>
                  <div className="grow"><div style={{ fontWeight: 600 }}>{c.title}</div><div className="small muted">{c.summary}</div></div>
                  <LevelBadge level={c.level} />
                  <span className="small muted hide-sm">{c.est_minutes} min</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <CourseCover icon={course.icon} color={course.color} height={130} />
            <EnrollPanel slug={course.slug} loggedIn={!!user} current={enrollment?.level ?? null} counts={counts} />
            {enrollment && <Link href={`/learn/${course.slug}`} className="btn block mt">Continue learning →</Link>}
          </div>
        </aside>
      </div>
      <style>{`@media (max-width: 860px) { main.container > .grid { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  )
}
