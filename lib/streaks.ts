// Daily goals and streaks, computed in each student's own time zone.
import { db } from './db'

export const GOAL_OPTIONS = {
  minutes: [5, 10, 20, 30, 45],
  lessons: [1, 2, 3],
} as const
export type GoalKind = keyof typeof GOAL_OPTIONS
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]

import { addDays, computeStreak, localDay, weekOf, type DayStatus } from './streak-math'
export { localDay, validTimezone } from './streak-math'

const dayStr = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

// ---- Goal status --------------------------------------------------------------------------

type UserGoalRow = { id: number; goal_kind: string; goal_value: number; timezone: string; created_at: Date }

async function progressToday(user: UserGoalRow, today: string) {
  const [usage, completions] = await Promise.all([
    db('daily_usage').where({ user_id: user.id, day: today }).sum({ v: 'seconds' }).first(),
    // Fetch a generous window, then keep only events on the student's local "today".
    db('activity_events').where({ user_id: user.id, type: 'complete_concept' }).where('created_at', '>=', new Date(Date.now() - 2 * 86_400_000)).select('created_at'),
  ])
  return {
    minutes: Math.floor(Number((usage as any)?.v ?? 0) / 60),
    lessons: completions.filter((e) => localDay(user.timezone, new Date(e.created_at)) === today).length,
  }
}

export type GoalStatus = Awaited<ReturnType<typeof goalStatus>>

/**
 * Today's progress and the streak. With record=true (used by endpoints that change progress),
 * a newly met goal is saved to goal_days and reported as `newlyMet` so the client can celebrate.
 */
export async function goalStatus(userId: number, { record = false } = {}) {
  const user = (await db('users').where({ id: userId }).first('id', 'goal_kind', 'goal_value', 'timezone', 'created_at')) as UserGoalRow | undefined
  if (!user) return null
  const kind = (user.goal_kind === 'lessons' ? 'lessons' : 'minutes') as GoalKind
  const target = Number(user.goal_value) || 10
  const today = localDay(user.timezone)
  const p = await progressToday(user, today)
  const progress = kind === 'minutes' ? p.minutes : p.lessons
  const metNow = progress >= target

  const rows = await db('goal_days').where({ user_id: userId }).where('day', '>=', addDays(today, -400)).select('day')
  const met = new Set(rows.map((r) => dayStr(r.day)))
  let newlyMet = false
  if (metNow && !met.has(today) && record) {
    await db('goal_days').insert({ user_id: userId, day: today }).onConflict(['user_id', 'day']).ignore()
    newlyMet = true
  }
  if (metNow) met.add(today)

  const earliestMet = [...met].sort()[0]
  const joined = localDay(user.timezone, new Date(user.created_at))
  const firstDay = earliestMet && earliestMet < joined ? earliestMet : joined
  const s = computeStreak(met, today, firstDay)
  const monday = weekOf(today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i)
    const status: DayStatus = d > today ? 'future' : met.has(d) ? 'met' : s.frozen.has(d) ? 'frozen' : d === today ? 'today' : d < firstDay ? 'before' : 'missed'
    return { day: d, status }
  })
  return {
    kind, target, progress, minutes: p.minutes, lessons: p.lessons,
    met: metNow, newlyMet, today, timezone: user.timezone,
    streak: s.current, longest: s.longest, freezeAvailable: s.freezeAvailable,
    milestone: newlyMet && MILESTONES.includes(s.current) ? s.current : null,
    week,
  }
}

/** Current streaks for many students at once (admin tables). */
export async function streaksFor(userIds: number[]) {
  if (!userIds.length) return new Map<number, { current: number; longest: number }>()
  const users = await db('users').whereIn('id', userIds).select('id', 'timezone', 'created_at')
  const rows = await db('goal_days').whereIn('user_id', userIds).select('user_id', 'day')
  const byUser = new Map<number, Set<string>>()
  for (const r of rows) {
    const s = byUser.get(Number(r.user_id)) ?? new Set<string>()
    s.add(dayStr(r.day))
    byUser.set(Number(r.user_id), s)
  }
  return new Map(users.map((u) => {
    const met = byUser.get(Number(u.id)) ?? new Set<string>()
    const today = localDay(u.timezone)
    const first = [...met].sort()[0] ?? today
    const s = computeStreak(met, today, first)
    return [Number(u.id), { current: s.current, longest: s.longest }]
  }))
}
