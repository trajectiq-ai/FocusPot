import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  scope: z.enum(['GLOBAL', 'COMPANY']).optional(),
  companyId: z.string().nullable().optional(),
})

// PATCH /api/super/feature-flags/[id]
// Toggle/update a feature flag. Auth: SUPER_ADMIN.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const flag = await db.featureFlag.findUnique({ where: { id } })
  if (!flag) {
    return errorResponse('Feature flag not found', 404)
  }

  const updateData: any = { ...parsed.data }
  // Coerce scope/companyId relationship
  if (parsed.data.scope === 'GLOBAL') {
    updateData.companyId = null
  } else if (parsed.data.scope === 'COMPANY') {
    const companyId = parsed.data.companyId ?? flag.companyId
    if (!companyId) {
      return errorResponse('companyId is required when scope is COMPANY', 400)
    }
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return errorResponse('Selected company does not exist', 400)
    }
    updateData.companyId = companyId
  } else if (parsed.data.companyId !== undefined && parsed.data.companyId !== null) {
    // companyId provided without scope change — imply COMPANY scope
    updateData.scope = 'COMPANY'
  }

  const updated = await db.featureFlag.update({ where: { id }, data: updateData })

  await auditLog({
    userId: session.id,
    action: 'FEATURE_FLAG_UPDATED',
    entityType: 'FeatureFlag',
    entityId: id,
    metadata: {
      key: flag.key,
      fields: Object.keys(parsed.data),
      previousEnabled: flag.enabled,
      newEnabled: updated.enabled,
    },
  })

  return NextResponse.json({ flag: updated })
}

// DELETE /api/super/feature-flags/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const flag = await db.featureFlag.findUnique({ where: { id } })
  if (!flag) {
    return errorResponse('Feature flag not found', 404)
  }

  await db.featureFlag.delete({ where: { id } })

  await auditLog({
    userId: session.id,
    action: 'FEATURE_FLAG_DELETED',
    entityType: 'FeatureFlag',
    entityId: id,
    metadata: { key: flag.key, scope: flag.scope },
  })

  return NextResponse.json({ success: true })
}
