import { defineEventHandler } from 'nuxt/server'
import { getMyLearningStreak } from '#server/services/learning-tools-service'
import { requireSession } from '#server/utils/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  return getMyLearningStreak(session.user.id)
})
