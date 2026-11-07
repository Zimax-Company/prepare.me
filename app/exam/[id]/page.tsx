import { redirect } from 'next/navigation'
import { requirePageUser } from '@/lib/auth'
import { attemptQuestions, getExamSettings, getOwnAttempt, toPublic } from '@/lib/learning'
import { db } from '@/lib/db'
import { ExamRunner } from '@/components/ExamRunner'
import { narrateQuestions } from '@/lib/narration'
import { UsageTracker } from '@/components/UsageTracker'

export const metadata = { title: 'Exam in progress' }

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser()
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id)) redirect('/dashboard')
  const attempt = await getOwnAttempt(id, user.id).catch(() => null)
  if (!attempt) redirect('/dashboard')
  if (attempt.submitted_at) redirect(`/results/${attempt.id}`)
  const [settings, course] = await Promise.all([getExamSettings(attempt.course_id), db('courses').where({ id: attempt.course_id }).first()])
  const questions = await narrateQuestions((await attemptQuestions(attempt, settings.shuffle_options)).map(toPublic))

  return (
    <>
    <UsageTracker courseId={attempt.course_id} />
    <ExamRunner
      attemptId={attempt.id}
      course={{ title: course.title, icon: course.icon, slug: course.slug }}
      level={attempt.level}
      questions={questions}
      initialAnswers={attempt.answers}
      expiresAt={attempt.expires_at.toISOString()}
      serverNow={new Date().toISOString()}
      durationMinutes={attempt.duration_minutes}
    />
    </>
  )
}
