import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { requirePageUser } from './auth'
import { getConceptProgress, getConcepts, getCourseBySlug, getEnrollment, getSections } from './learning'
import { levelsUpTo } from './types'

/** Everything a /learn page needs; redirects to the course page if the student isn't enrolled. */
export const loadLearn = cache(async (slug: string) => {
  const user = await requirePageUser()
  const course = await getCourseBySlug(slug, { includeDrafts: user.role === 'admin' })
  if (!course) notFound()
  const enrollment = await getEnrollment(user.id, course.id)
  if (!enrollment) redirect(`/courses/${slug}`)
  const [all, sections] = await Promise.all([getConcepts(course.id), getSections(course.id)])
  const allowed = levelsUpTo(enrollment.level)
  const visible = all.filter((c) => allowed.includes(c.level))
  const locked = all.filter((c) => !allowed.includes(c.level))
  const progress = await getConceptProgress(user.id, visible.map((c) => c.id))
  const done = visible.filter((c) => progress.get(c.id)?.completed_at).length
  const percent = visible.length ? Math.round((done / visible.length) * 100) : 0
  const next = visible.find((c) => !progress.get(c.id)?.completed_at) ?? visible[0]
  return { user, course, enrollment, sections, all, visible, locked, progress, done, percent, next }
})
