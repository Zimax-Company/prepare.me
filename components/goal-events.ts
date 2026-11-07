'use client'

import type { GoalStatus } from '@/lib/streaks'

/** Anything that changes progress calls this with the server's goal status; <GoalCelebration> listens. */
export function announceGoal(goal: GoalStatus | null | undefined) {
  if (goal?.newlyMet) window.dispatchEvent(new CustomEvent('prepareme:goal-met', { detail: goal }))
}

export const browserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return undefined }
}
