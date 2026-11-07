'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GoalStatus } from '@/lib/streaks'
import { Confetti } from './Confetti'

/** Celebrates the moment today's goal is met, then refreshes server-rendered streak counters. */
export function GoalCelebration() {
  const [goal, setGoal] = useState<NonNullable<GoalStatus> | null>(null)
  const router = useRouter()

  useEffect(() => {
    const on = (e: Event) => {
      const g = (e as CustomEvent<NonNullable<GoalStatus>>).detail
      setGoal(g)
      router.refresh()
    }
    window.addEventListener('prepareme:goal-met', on)
    return () => window.removeEventListener('prepareme:goal-met', on)
  }, [router])

  useEffect(() => {
    if (!goal) return
    const t = setTimeout(() => setGoal(null), goal.milestone ? 7000 : 5000)
    return () => clearTimeout(t)
  }, [goal])

  if (!goal) return null
  const unit = goal.kind === 'minutes' ? 'minutes' : goal.target === 1 ? 'lesson' : 'lessons'
  return (
    <>
      <Confetti />
      <div className="goal-toast" role="status" onClick={() => setGoal(null)}>
        <div className="goal-flame" aria-hidden>🔥</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{goal.milestone ? `${goal.milestone}-day streak!` : 'Daily goal reached!'}</div>
          <div className="small">
            {goal.target} {unit} done today · <b>{goal.streak}</b>-day streak{goal.streak === goal.longest && goal.streak > 1 ? ' (your best yet!)' : ''}
          </div>
        </div>
      </div>
    </>
  )
}
