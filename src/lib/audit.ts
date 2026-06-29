import { db } from './db'
import { cookies, headers } from 'next/headers'

/**
 * Audit log helper — records actions for compliance and traceability.
 * Called from API routes after mutations.
 */
export async function auditLog(params: {
  userId?: string
  action: string
  entityType: string
  entityId?: string
  companyId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}) {
  try {
    const h = await headers()
    const ip = params.ipAddress || h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || ''
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        companyId: params.companyId || null,
        metadata: JSON.stringify(params.metadata || {}),
        ipAddress: ip,
      },
    })
  } catch (e) {
    // Audit logging should never break the main operation
    console.error('Audit log failed:', e)
  }
}

/**
 * Records a login attempt (success or failure) for security monitoring.
 */
export async function recordLoginAttempt(params: {
  userId: string
  success: boolean
  failureReason?: string
}) {
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || ''
    const ua = h.get('user-agent') || ''
    await db.loginHistory.create({
      data: {
        userId: params.userId,
        ipAddress: ip,
        userAgent: ua,
        success: params.success,
        failureReason: params.failureReason || '',
      },
    })
  } catch (e) {
    console.error('Login history record failed:', e)
  }
}
