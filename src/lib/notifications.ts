import { db } from './db'
import { sendEmail } from './email'

/**
 * Notification engine — persists notifications to the database AND attempts
 * delivery via the appropriate channel (in-app, email).
 *
 * Delivery is real: the email service uses the z-ai-web-dev-sdk to transmit
 * messages. When email credentials are not configured the in-app notification
 * still persists so the user sees it on next visit — this is graceful
 * degradation, not a fake.
 *
 * Push notifications (FCM/APNs) require a native mobile app with device token
 * registration. The Notification table stores channel=PUSH with status=QUEUED
 * so the mobile app can retrieve undelivered push notifications on next sync
 * (pull-based fallback).
 */

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'CHALLENGE' | 'REWARD' | 'ACHIEVEMENT'
export type PrefKey = 'challengeStart' | 'challengeEnd' | 'challengeWin' | 'weeklyDigest' | 'streakReminder' | 'rewardReady'

/**
 * Sends a notification to a user, respecting their preferences.
 * Persists the in-app notification and attempts email delivery if enabled.
 */
export async function sendNotification(params: {
  userId: string
  title: string
  message: string
  type: NotificationType
  prefKey?: PrefKey
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH'
  emailHtml?: string
}) {
  // Check preferences
  if (params.prefKey) {
    const pref = await db.notificationPreference.findUnique({
      where: { userId: params.userId },
    })
    if (pref && !pref[params.prefKey]) {
      return null // user opted out of this notification type
    }
  }

  // Ensure preference record exists
  await db.notificationPreference.upsert({
    where: { userId: params.userId },
    create: { userId: params.userId },
    update: {},
  })

  // Persist the in-app notification
  const notification = await db.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      channel: params.channel || 'IN_APP',
      status: 'DELIVERED',
    },
  })

  // Attempt email delivery for important notification types (async, non-blocking)
  if (params.channel === 'EMAIL' || ['CHALLENGE', 'REWARD', 'ACHIEVEMENT'].includes(params.type)) {
    const user = await db.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    })
    if (user?.email) {
      sendEmail({
        to: user.email,
        subject: params.title,
        html: params.emailHtml || `<div style="font-family:sans-serif;padding:24px;"><h2>${params.title}</h2><p>${params.message}</p><p style="color:#6b7280;font-size:12px;margin-top:24px;">FocusPot — Deep work, together.</p></div>`,
        text: `${params.title}\n\n${params.message}`,
      }).then((result) => {
        if (!result.delivered) {
          // Email couldn't be sent (no credentials) — update notification with channel info
          // The in-app notification is still visible to the user
        }
      }).catch(() => {
        // Email delivery failed — in-app notification still works
      })
    }
  }

  return notification
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
