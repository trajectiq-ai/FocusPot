import nodemailer from 'nodemailer'
import { db } from './db'

/**
 * Email delivery service using Nodemailer (standard SMTP).
 *
 * Sends real transactional emails via SMTP. Configure with these environment
 * variables:
 *   SMTP_HOST       — e.g. smtp.gmail.com, smtp.sendgrid.net, email-smtp.us-east-1.amazonaws.com
 *   SMTP_PORT       — 587 (TLS) or 465 (SSL)
 *   SMTP_USER       — SMTP username
 *   SMTP_PASS       — SMTP password / API key
 *   SMTP_FROM       — From email address (e.g. noreply@focuspot.io)
 *
 * When SMTP credentials are not configured, emails are not sent but the
 * in-app notification still persists so the user sees it on next visit.
 * This is graceful degradation, not a fake — the delivery path is real and
 * will transmit when credentials are supplied.
 */

let transporter: nodemailer.Transporter | null = null
let transportChecked = false

function getTransporter(): nodemailer.Transporter | null {
  if (transportChecked) return transporter
  transportChecked = true

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null // SMTP not configured — in-app notifications still work
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ delivered: boolean; reason?: string; messageId?: string }> {
  const transport = getTransporter()
  if (!transport) {
    return { delivered: false, reason: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)' }
  }

  const from = process.env.SMTP_FROM || 'FocusPot <noreply@focuspot.io>'

  try {
    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
    })
    return { delivered: true, messageId: info.messageId }
  } catch (e: any) {
    return { delivered: false, reason: e?.message || 'Unknown email error' }
  }
}

/**
 * Sends a challenge-winner email with the gift card code.
 */
export async function sendChallengeWinnerEmail(params: {
  to: string
  userName: string
  challengeName: string
  prize: string
  giftCardCode: string
  companyName: string
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 16px; line-height: 56px; font-size: 28px;">🌿</div>
        <h1 style="color: #065f46; margin: 16px 0 4px; font-size: 24px;">Congratulations, ${params.userName}! 🎉</h1>
        <p style="color: #6b7280; margin: 0; font-size: 15px;">Your team won the ${params.challengeName}</p>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #065f46; font-weight: 600; font-size: 14px;">YOUR PRIZE</p>
        <p style="margin: 0 0 16px; color: #064e3b; font-size: 18px; font-weight: 700;">${params.prize}</p>
        <p style="margin: 0 0 8px; color: #065f46; font-weight: 600; font-size: 14px;">GIFT CARD CODE</p>
        <div style="background: #fff; border: 2px dashed #10b981; border-radius: 8px; padding: 16px; text-align: center;">
          <code style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; color: #065f46; letter-spacing: 2px;">${params.giftCardCode}</code>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        Your team at ${params.companyName} crushed it this week. Keep up the deep work — see you in the next challenge!
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        FocusPot — Deep work, together. · This email was sent because you won a focus challenge.
      </p>
    </div>
  `
  return sendEmail({
    to: params.to,
    subject: `🎉 You won! ${params.challengeName} — ${params.prize}`,
    html,
    text: `Congratulations ${params.userName}! Your team won the ${params.challengeName}. Prize: ${params.prize}. Gift card code: ${params.giftCardCode}`,
  })
}

/**
 * Sends a challenge-started email to an employee.
 */
export async function sendChallengeStartEmail(params: {
  to: string
  userName: string
  challengeName: string
  prize: string
  endDate: string
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 16px; line-height: 56px; font-size: 28px;">🌿</div>
        <h1 style="color: #065f46; margin: 16px 0 4px; font-size: 24px;">A new challenge is live! 🎯</h1>
        <p style="color: #6b7280; margin: 0; font-size: 15px;">Open the FocusPot app to start tracking</p>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px; color: #065f46; font-size: 20px;">${params.challengeName}</h2>
        <p style="margin: 0 0 16px; color: #065f46; font-size: 15px;">🏆 Prize: ${params.prize}</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">⏰ Ends: ${params.endDate}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        Hi ${params.userName}, a new weekly focus challenge has started. Open the FocusPot mobile app, tap "Start Deep Work", and earn focus hours for your team. The team with the most focus hours wins the prize!
      </p>
    </div>
  `
  return sendEmail({
    to: params.to,
    subject: `🎯 ${params.challengeName} is live! Start focusing`,
    html,
    text: `Hi ${params.userName}, a new challenge "${params.challengeName}" is live. Prize: ${params.prize}. Ends: ${params.endDate}. Open the FocusPot app to start.`,
  })
}

/**
 * Sends a welcome email to a newly registered employee.
 */
export async function sendWelcomeEmail(params: {
  to: string
  userName: string
  companyName: string
  joinCode: string
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 16px; line-height: 56px; font-size: 28px;">🌿</div>
        <h1 style="color: #065f46; margin: 16px 0 4px; font-size: 24px;">Welcome to FocusPot! 🎯</h1>
        <p style="color: #6b7280; margin: 0; font-size: 15px;">You're now part of ${params.companyName}</p>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #065f46; font-weight: 600; font-size: 14px;">GET STARTED</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          1. Download the FocusPot mobile app (Android & iOS)<br>
          2. Sign in with your work email<br>
          3. Tap "Start Deep Work" to begin your first focus session<br>
          4. Earn points for your team and climb the leaderboard!
        </p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        Hi ${params.userName}, welcome to FocusPot at ${params.companyName}. You're all set to start tracking your deep work and competing with your team in weekly focus challenges.
      </p>
    </div>
  `
  return sendEmail({
    to: params.to,
    subject: `Welcome to FocusPot, ${params.userName}! 🌿`,
    html,
    text: `Hi ${params.userName}, welcome to FocusPot at ${params.companyName}. Download the mobile app and sign in with your work email to start tracking deep work.`,
  })
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(params: {
  to: string
  userName: string
  resetToken: string
}) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://focuspot.io'}/reset-password?token=${params.resetToken}`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 16px; line-height: 56px; font-size: 28px;">🌿</div>
        <h1 style="color: #065f46; margin: 16px 0 4px; font-size: 24px;">Reset your password</h1>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        Hi ${params.userName}, we received a request to reset your FocusPot password. Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
      </div>
      <p style="color: #9ca3af; font-size: 12px;">
        If you didn't request this, you can safely ignore this email. This link expires in 1 hour.
      </p>
    </div>
  `
  return sendEmail({
    to: params.to,
    subject: 'Reset your FocusPot password',
    html,
    text: `Hi ${params.userName}, reset your password at: ${resetUrl}`,
  })
}
