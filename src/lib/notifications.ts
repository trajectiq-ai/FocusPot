import { db } from './db'

/**
 * Notification helper that respects user preferences.
 * In production this would queue to a notification service (email/push);
 * here we persist to the Notification table with channel metadata.
 */

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'CHALLENGE' | 'REWARD' | 'ACHIEVEMENT'
export type PrefKey = 'challengeStart' | 'challengeEnd' | 'challengeWin' | 'weeklyDigest' | 'streakReminder' | 'rewardReady'

const TYPE_TO_PREF: Record<string, PrefKey> = {
  CHALLENGE_START: 'challengeStart',
  CHALLENGE_END: 'challengeEnd',
  CHALLENGE_WIN: 'challengeWin',
  WEEKLY_DIGEST: 'weeklyDigest',
  STREAK_REMINDER: 'streakReminder',
  REWARD_READY: 'rewardReady',
}

/**
 * Sends a notification to a user, respecting their preferences.
 * If the user has opted out of this notification type, it's skipped.
 */
export async function sendNotification(params: {
  userId: string
  title: string
  message: string
  type: NotificationType
  prefKey?: PrefKey
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH'
}) {
  // Check preferences
  if (params.prefKey) {
    const pref = await db.notificationPreference.findUnique({
      where: { userId: params.userId },
    })
    if (pref && !pref[params.prefKey]) {
      return null // user opted out
    }
  }

  // Ensure preference record exists
  await db.notificationPreference.upsert({
    where: { userId: params.userId },
    create: { userId: params.userId },
    update: {},
  })

  return db.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      channel: params.channel || 'IN_APP',
      status: 'DELIVERED',
    },
  })
}

/**
 * Sends a notification to multiple users (batch).
 */
export async function sendNotifications(users: string[], params: {
  title: string
  message: string
  type: NotificationType
  prefKey?: PrefKey
}) {
  const results: NonNullable<Awaited<ReturnType<typeof sendNotification>>>[] = []
  for (const userId of users) {
    const n = await sendNotification({ ...params, userId })
    if (n) results.push(n)
  }
  return results
}
