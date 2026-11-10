import type { LearningStreak } from '#shared/types/learning'

function previousUtcDate(date: string) {
  const previous = new Date(`${date}T00:00:00.000Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0, 10)
}

export function recordDailyStreakActivity(streak: LearningStreak, today: string): LearningStreak {
  if (streak.lastActiveDate === today) return streak

  const currentStreak = streak.lastActiveDate === previousUtcDate(today) ? streak.currentStreak + 1 : 1
  return {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastActiveDate: today
  }
}

export function getVisibleDailyStreak(streak: LearningStreak, today: string): LearningStreak {
  const isActive = streak.lastActiveDate === today || streak.lastActiveDate === previousUtcDate(today)
  return { ...streak, currentStreak: isActive ? streak.currentStreak : 0 }
}
