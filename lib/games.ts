// Answer Runner: server-authoritative game logic. The browser never receives correct answers
// until it has committed to one, and the server computes every point.
import { db, json } from './db'
import { conflict, badRequest, forbidden, notFound } from './http'
import { shuffle } from './grading'
import { getEnrollment, toQuestion } from './learning'
import { logEvent } from './activity'
import { levelsUpTo, type Option, type Question } from './types'

export const RUNNER = {
  lives: 3,
  batch: 60, // questions served per run (recycled if a run goes longer)
  minPool: 8,
  minAnswerGapMs: 1000, // faster than any human can read a gate: treat as a bot
  maxPrompt: 260,
  maxOption: 90,
}

export type RunnerQuestion = { id: number; type: Question['type']; prompt: string; options: Option[] }
type Answer = { q: number; o: string | null; c: boolean; ms: number }

/** Questions that fit the game: single-choice or true/false, short enough to read on a moving gate. */
export function fitsRunner(q: Question) {
  if (q.type !== 'single' && q.type !== 'true_false') return false
  if (q.options.length < 2 || q.options.length > 4) return false
  if (q.prompt.length > RUNNER.maxPrompt) return false
  return q.options.every((o) => o.text.length <= RUNNER.maxOption)
}

export async function runnerPool(courseId: number, userId: number, sectionId?: number | null) {
  const enrollment = await getEnrollment(userId, courseId)
  if (!enrollment) throw forbidden('Enrol in the course to play with its questions')
  const q = db('questions as q').leftJoin('concepts as k', 'k.id', 'q.concept_id').where('q.course_id', courseId)
    .whereIn('q.level', levelsUpTo(enrollment.level)).select('q.*')
  if (sectionId) q.where('k.section_id', sectionId)
  return (await q).map(toQuestion).filter(fitsRunner)
}

export async function startRunner(userId: number, courseId: number, sectionId?: number | null) {
  const pool = await runnerPool(courseId, userId, sectionId)
  if (pool.length < RUNNER.minPool) throw badRequest(`Not enough game-friendly questions here yet (${pool.length}). Try the whole course.`)
  const chosen = shuffle(pool).slice(0, RUNNER.batch)
  const [id] = await db('game_sessions').insert({
    user_id: userId, course_id: courseId, section_id: sectionId ?? null, game: 'runner',
    question_ids: JSON.stringify(chosen.map((q) => q.id)), answers: JSON.stringify([]), lives: RUNNER.lives,
  })
  const questions: RunnerQuestion[] = chosen.map((q) => ({
    id: q.id, type: q.type, prompt: q.prompt,
    options: q.type === 'true_false' ? q.options : shuffle(q.options),
  }))
  return { sessionId: Number(id), lives: RUNNER.lives, questions }
}

async function ownSession(sessionId: number, userId: number) {
  const s = await db('game_sessions').where({ id: sessionId, game: 'runner' }).first()
  if (!s || Number(s.user_id) !== userId) throw notFound('Game')
  return s
}

const multiplierFor = (streakBefore: number) => Math.min(5, 1 + Math.floor(streakBefore / 3))

export async function answerRunner(userId: number, sessionId: number, questionId: number, optionId: string | null) {
  const s = await ownSession(sessionId, userId)
  if (s.ended_at) throw conflict('This run is over')
  const ids = json<number[]>(s.question_ids, [])
  const answers = json<Answer[]>(s.answers, [])
  const expected = ids[answers.length % ids.length]
  if (questionId !== expected) throw badRequest('Unexpected question')

  const now = Date.now()
  const since = now - new Date(s.last_answer_at ?? s.started_at).getTime()
  if (answers.length > 0 && since < RUNNER.minAnswerGapMs) throw conflict('Too fast')

  const q = toQuestion(await db('questions').where({ id: questionId }).first())
  const correct = optionId !== null && q.answer.length === 1 && q.answer[0] === optionId
  const streakBefore = Number(s.streak)
  let gained = 0
  let streak = 0
  let lives = Number(s.lives)
  if (correct) {
    // Reading time ≈ time since the last answer, minus ~1.2s of feedback animation (3.5s countdown before the first).
    const reading = Math.max(0, since / 1000 - (answers.length ? 1.2 : 3.5))
    const speedBonus = Math.max(0, Math.min(60, Math.round(60 - 6 * reading)))
    gained = 100 * multiplierFor(streakBefore) + speedBonus
    streak = streakBefore + 1
  } else {
    lives -= 1
  }
  const over = lives <= 0
  answers.push({ q: questionId, o: optionId, c: correct, ms: Math.round(since) })
  const update = {
    answers: JSON.stringify(answers),
    answered: answers.length,
    correct: Number(s.correct) + (correct ? 1 : 0),
    score: Number(s.score) + gained,
    streak,
    max_streak: Math.max(Number(s.max_streak), streak),
    lives,
    last_answer_at: new Date(now),
    ...(over ? { ended_at: new Date(now) } : {}),
  }
  await db('game_sessions').where({ id: sessionId }).whereNull('ended_at').update(update)
  // Game answers count as practice for analytics (tagged with their source).
  await logEvent(userId, 'practice_answer', { courseId: Number(s.course_id), conceptId: q.concept_id, meta: { questionId, correct, source: 'runner' } })
  if (over) await logEvent(userId, 'game_end', { courseId: Number(s.course_id), meta: { game: 'runner', sessionId, score: update.score } })
  return {
    correct,
    correctOptionId: q.answer[0] ?? null,
    gained,
    score: update.score,
    streak,
    multiplier: multiplierFor(streak),
    lives,
    over,
  }
}

export async function endRunner(userId: number, sessionId: number) {
  let s = await ownSession(sessionId, userId)
  if (!s.ended_at) {
    await db('game_sessions').where({ id: sessionId }).whereNull('ended_at').update({ ended_at: new Date() })
    await logEvent(userId, 'game_end', { courseId: Number(s.course_id), meta: { game: 'runner', sessionId, score: Number(s.score), quit: true } })
    s = await ownSession(sessionId, userId)
  }
  const answers = json<Answer[]>(s.answers, [])
  const missedIds = [...new Set(answers.filter((a) => !a.c).map((a) => a.q))]
  const missedQs = missedIds.length ? (await db('questions').whereIn('id', missedIds)).map(toQuestion) : []
  const byId = new Map(missedQs.map((q) => [q.id, q]))
  const missed = answers.filter((a) => !a.c).map((a) => {
    const q = byId.get(a.q)!
    const text = (id: string | null) => (id === null ? null : q.options.find((o) => o.id === id)?.text ?? id)
    return { prompt: q.prompt, given: text(a.o), correct: text(q.answer[0] ?? null), explanation: q.explanation }
  })
  const previousBest = await db('game_sessions').where({ user_id: userId, course_id: s.course_id, game: 'runner' }).whereNotNull('ended_at').whereNot('id', sessionId).max({ v: 'score' }).first()
  const prev = Number((previousBest as any)?.v ?? 0)
  return {
    score: Number(s.score), answered: Number(s.answered), correct: Number(s.correct), maxStreak: Number(s.max_streak),
    accuracy: Number(s.answered) ? Math.round((Number(s.correct) / Number(s.answered)) * 100) : 0,
    previousBest: prev, isBest: Number(s.score) > prev && Number(s.score) > 0,
    durationSec: Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000),
    missed,
    leaderboard: await leaderboard(Number(s.course_id), 'week'),
  }
}

export type LeaderRow = { userId: number; name: string; score: number }

/** Best score per student (admins excluded). Names shown as "First L." for privacy. */
export async function leaderboard(courseId: number, period: 'week' | 'all', limit = 10): Promise<LeaderRow[]> {
  const q = db('game_sessions as g').join('users as u', 'u.id', 'g.user_id').where({ 'g.course_id': courseId, 'g.game': 'runner', 'u.role': 'student' })
    .whereNotNull('g.ended_at').groupBy('g.user_id', 'u.name').select('g.user_id', 'u.name').max({ best: 'g.score' }).orderBy('best', 'desc').limit(limit)
  if (period === 'week') {
    const d = new Date()
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)))
    q.where('g.started_at', '>=', monday)
  }
  const rows = (await q) as any[]
  return rows.filter((r) => Number(r.best) > 0).map((r) => {
    const [first, ...rest] = String(r.name).trim().split(/\s+/)
    return { userId: Number(r.user_id), name: rest.length ? `${first} ${rest.at(-1)![0]}.` : first, score: Number(r.best) }
  })
}

export async function personalBest(userId: number, courseId: number) {
  const r = await db('game_sessions').where({ user_id: userId, course_id: courseId, game: 'runner' }).whereNotNull('ended_at').max({ v: 'score' }).count({ n: '*' }).first()
  return { best: Number((r as any)?.v ?? 0), plays: Number((r as any)?.n ?? 0) }
}
