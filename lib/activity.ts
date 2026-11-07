// Records usage. Logging must never break a request, so failures are swallowed and logged.
import { db } from './db'
import { localDay } from './streak-math'

export type ActivityType = 'login' | 'register' | 'enroll' | 'view_concept' | 'complete_concept' | 'practice_answer' | 'exam_start' | 'exam_submit' | 'game_end'

export async function logEvent(userId: number, type: ActivityType, opts: { courseId?: number | null; conceptId?: number | null; meta?: Record<string, unknown> } = {}) {
  try {
    await db('activity_events').insert({
      user_id: userId,
      course_id: opts.courseId ?? null,
      concept_id: opts.conceptId ?? null,
      type,
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
    })
  } catch (err) {
    console.error('activity log failed', err)
  }
}

/** Adds active learning time (capped per call by the caller) to today's bucket, in the student's time zone. */
export async function addUsage(userId: number, courseId: number, seconds: number, timezone = 'UTC') {
  const day = localDay(timezone)
  await db('daily_usage')
    .insert({ user_id: userId, course_id: courseId, day, seconds })
    .onConflict(['user_id', 'course_id', 'day'])
    .merge({ seconds: db.raw('seconds + ?', [seconds]) })
}
