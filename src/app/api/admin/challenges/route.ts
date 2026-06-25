import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/admin/challenges
// Create a new weekly challenge. Notifies all employees.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, description, startDate, endDate, prize, giftCardValue, giftCardCode } = await req.json()

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { name: true } } },
  })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  // End any existing active challenge for this company
  await db.challenge.updateMany({
    where: { companyId: admin.companyId, status: 'ACTIVE' },
    data: { status: 'COMPLETED' },
  })

  const challenge = await db.challenge.create({
    data: {
      name,
      description: description || '',
      companyId: admin.companyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      prize,
      giftCardValue: giftCardValue || 0,
      giftCardCode: giftCardCode || '',
      status: 'ACTIVE',
    },
  })

  // Notify all employees in the company
  const employees = await db.user.findMany({
    where: { companyId: admin.companyId, role: 'EMPLOYEE' },
    select: { id: true },
  })
  await db.notification.createMany({
    data: employees.map((e) => ({
      userId: e.id,
      title: 'Weekly Focus Challenge is Live!',
      message: `The "${name}" challenge has started. Open the app to start tracking your deep work hours. Prize: ${prize}.`,
      type: 'CHALLENGE',
    })),
  })

  // Notify the admin
  await db.notification.create({
    data: {
      userId: session.id,
      title: 'Challenge Created',
      message: `"${name}" is now active. ${employees.length} employees have been notified.`,
      type: 'SUCCESS',
    },
  })

  return NextResponse.json({ challenge })
}

// GET /api/admin/challenges - list all challenges for the company
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true },
  })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const challenges = await db.challenge.findMany({
    where: { companyId: admin.companyId },
    orderBy: { startDate: 'desc' },
    include: { winnerTeam: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json({ challenges })
}
