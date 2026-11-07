import Link from 'next/link'
import type { CatalogCourse } from '@/lib/learning'
import { CourseCover, ProgressBar } from './ui'

export function CourseCard({ course: c }: { course: CatalogCourse }) {
  return (
    <Link href={c.enrolled ? `/learn/${c.slug}` : `/courses/${c.slug}`} className="card hover" style={{ display: 'flex', flexDirection: 'column' }}>
      <CourseCover icon={c.icon} color={c.color} />
      <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>{c.category}</span>
      <div className="card-title">{c.title}</div>
      <p className="muted small grow">{c.tagline}</p>
      {c.enrolled ? (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row between small"><span className="muted">Progress</span><b>{c.progress}%</b></div>
          <ProgressBar value={c.progress} thin />
        </div>
      ) : (
        <div className="row small muted" style={{ gap: 14 }}>
          <span>📚 {c.concept_count} concepts</span><span>❓ {c.question_count} questions</span><span className="hide-sm">👥 {c.student_count}</span>
        </div>
      )}
    </Link>
  )
}
