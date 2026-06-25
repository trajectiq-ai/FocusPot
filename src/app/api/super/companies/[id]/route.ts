import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH /api/super/companies/[id]
// Simulates a Stripe webhook updating subscription status & plan.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { subscriptionStatus, plan } = await req.json()

  const company = await db.company.findUnique({ where: { id } })
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const newPlan = plan || company.plan
  const newRevenue = newPlan === 'GROWTH' ? 199 : newPlan === 'STARTER' ? 99 : 0

  const updated = await db.company.update({
    where: { id },
    data: {
      subscriptionStatus: subscriptionStatus || company.subscriptionStatus,
      plan: newPlan,
      monthlyRevenue: subscriptionStatus === 'CANCELED' ? 0 : newRevenue,
      seats: newPlan === 'GROWTH' ? 200 : 50,
    },
  })

  return NextResponse.json({ company: updated })
}
