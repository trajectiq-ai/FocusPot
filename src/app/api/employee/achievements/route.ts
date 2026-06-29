import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type EnrichedAchievement = {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  threshold: number
  metric: string
  color: string
  unlocked: boolean
  unlockedAt: string | null
  progress: number
  currentValue: number
}

// GET /api/employee/achievements
// Returns all achievements + which ones the user has unlocked (with unlockedAt).
// Grouped by category. Auth: EMPLOYEE.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      totalSessions: true,
      totalFocusHours: true,
      streak: true,
      bestStreak: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [achievements, unlocked] = await Promise.all([
    db.achievement.findMany({ orderBy: [{ category: 'asc' }, { threshold: 'asc' }] }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, unlockedAt: true },
    }),
  ])

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))

  const grouped: Record<string, EnrichedAchievement[]> = {}
  const all: EnrichedAchievement[] = []

  for (const a of achievements) {
    const currentValue = ((user as Record<string, unknown>)[a.metric] as number) || 0
    const unlockedAt = unlockedMap.get(a.id) || null
    const item: EnrichedAchievement = {
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      threshold: a.threshold,
      metric: a.metric,
      color: a.color,
      unlocked: !!unlockedAt,
      unlockedAt: unlockedAt ? (unlockedAt as Date).toISOString() : null,
      progress: a.threshold > 0 ? Math.min(100, Math.round((currentValue / a.threshold) * 100)) : 0,
      currentValue: Math.round(currentValue * 10) / 10,
    }
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(item)
    all.push(item)
  }

  const totalUnlocked = unlocked.length
  const totalAchievements = achievements.length

  return NextResponse.json({
    summary: {
      total: totalAchievements,
      unlocked: totalUnlocked,
      progress: totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0,
    },
    byCategory: grouped,
    achievements: all,
  })
}
