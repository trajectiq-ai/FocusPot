import { db } from '../src/lib/db'
import { hashPassword, generateJoinCode } from '../src/lib/password'

async function main() {
  // Clean existing data (all tables)
  await db.passwordResetToken.deleteMany()
  await db.emailVerifyToken.deleteMany()
  await db.userAchievement.deleteMany()
  await db.achievement.deleteMany()
  await db.notificationPreference.deleteMany()
  await db.platformAnnouncement.deleteMany()
  await db.featureFlag.deleteMany()
  await db.scheduledJob.deleteMany()
  await db.notification.deleteMany()
  await db.invitation.deleteMany()
  await db.loginHistory.deleteMany()
  await db.auditLog.deleteMany()
  await db.companyStatistics.deleteMany()
  await db.teamStatistics.deleteMany()
  await db.employeeStatistics.deleteMany()
  await db.challengeReward.deleteMany()
  await db.rewardRedemption.deleteMany()
  await db.reward.deleteMany()
  await db.companySettings.deleteMany()
  await db.focusSession.deleteMany()
  await db.challenge.deleteMany()
  await db.user.deleteMany()
  await db.team.deleteMany()
  await db.company.deleteMany()

  console.log('Seeding FocusPot database...')

  const DEMO_HASH = hashPassword('demo')

  // ===== SUPER ADMIN =====
  const superAdmin = await db.user.create({
    data: {
      email: 'sree@focuspot.io',
      name: 'Sree (Super Admin)',
      password: DEMO_HASH,
      role: 'SUPER_ADMIN',
      avatarColor: 'violet',
    },
  })

  // ===== COMPANIES =====
  const companies = await Promise.all([
    db.company.create({
      data: {
        name: 'Northwind Labs',
        domain: 'northwindlabs.com',
        joinCode: 'NORTHWIND-7K2M',
        plan: 'GROWTH',
        seats: 200,
        subscriptionStatus: 'ACTIVE',
        monthlyRevenue: 199,
      },
    }),
    db.company.create({
      data: {
        name: 'Acme Corp',
        domain: 'acme.com',
        joinCode: 'ACMECORP-3F9P',
        plan: 'STARTER',
        seats: 50,
        subscriptionStatus: 'ACTIVE',
        monthlyRevenue: 99,
      },
    }),
    db.company.create({
      data: {
        name: 'Brightside Studio',
        domain: 'brightside.studio',
        joinCode: 'BRIGHT-5H8X',
        plan: 'STARTER',
        seats: 50,
        subscriptionStatus: 'PAST_DUE',
        monthlyRevenue: 99,
      },
    }),
    db.company.create({
      data: {
        name: 'Quantum Forge',
        domain: 'quantumforge.io',
        joinCode: 'QUANTUM-2D4T',
        plan: 'GROWTH',
        seats: 200,
        subscriptionStatus: 'ACTIVE',
        monthlyRevenue: 199,
      },
    }),
    db.company.create({
      data: {
        name: 'Pixel & Co',
        domain: 'pixelandco.design',
        joinCode: 'PIXELCO-9R1W',
        plan: 'STARTER',
        seats: 50,
        subscriptionStatus: 'CANCELED',
        monthlyRevenue: 0,
      },
    }),
  ])

  const [northwind, acme, brightside, quantum, pixel] = companies

  // ===== TEAMS =====
  const teamColors = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']
  const teamDefs = [
    // Northwind
    { name: 'Marketing', company: northwind, color: 'emerald' },
    { name: 'Sales', company: northwind, color: 'amber' },
    { name: 'Engineering', company: northwind, color: 'sky' },
    { name: 'Design', company: northwind, color: 'rose' },
    // Acme
    { name: 'Product', company: acme, color: 'violet' },
    { name: 'Customer Success', company: acme, color: 'orange' },
    { name: 'Engineering', company: acme, color: 'emerald' },
    // Brightside
    { name: 'Creative', company: brightside, color: 'rose' },
    { name: 'Operations', company: brightside, color: 'amber' },
    // Quantum
    { name: 'R&D', company: quantum, color: 'sky' },
    { name: 'Backend', company: quantum, color: 'emerald' },
    { name: 'Frontend', company: quantum, color: 'violet' },
  ]

  const teams = await Promise.all(
    teamDefs.map((t) =>
      db.team.create({ data: { name: t.name, color: t.color, companyId: t.company.id } })
    )
  )

  // ===== COMPANY ADMINS =====
  const companyAdmins = await Promise.all([
    db.user.create({
      data: {
        email: 'hr@northwindlabs.com',
        name: 'Dana Whitfield',
        password: DEMO_HASH,
        title: 'Head of People',
        role: 'COMPANY_ADMIN',
        companyId: northwind.id,
        avatarColor: 'amber',
      },
    }),
    db.user.create({
      data: {
        email: 'ops@acme.com',
        name: 'Marcus Lee',
        password: DEMO_HASH,
        title: 'Operations Manager',
        role: 'COMPANY_ADMIN',
        companyId: acme.id,
        avatarColor: 'sky',
      },
    }),
    db.user.create({
      data: {
        email: 'hr@brightside.studio',
        name: 'Priya Nair',
        password: DEMO_HASH,
        title: 'Studio Manager',
        role: 'COMPANY_ADMIN',
        companyId: brightside.id,
        avatarColor: 'rose',
      },
    }),
  ])

  // ===== EMPLOYEES =====
  // Northwind employees (4 teams)
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Drew', 'Sage', 'River', 'Sky', 'Phoenix', 'Rowan', 'Ari', 'Blake', 'Charlie', 'Ellis', 'Finley', 'Hayden']
  const lastNames = ['Chen', 'Patel', 'Garcia', 'Kim', 'Nguyen', 'Silva', 'Khan', 'Rossi', 'Müller', 'Costa', 'Reed', 'Walsh', 'Frost', 'Stone', 'Hart', 'Pine', 'Vale', 'Brooks']
  const colorPool = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']

  let nameIdx = 0
  const employeeDefs: { teamId: string; companyId: string }[] = []
  // Assign 5-8 employees per team for Northwind (active company)
  const northwindTeams = teams.filter((t) => t.companyId === northwind.id)
  northwindTeams.forEach((team, idx) => {
    const count = 5 + (idx % 3)
    for (let i = 0; i < count; i++) {
      employeeDefs.push({ teamId: team.id, companyId: northwind.id })
    }
  })
  // Acme employees
  const acmeTeams = teams.filter((t) => t.companyId === acme.id)
  acmeTeams.forEach((team, idx) => {
    const count = 4 + (idx % 2)
    for (let i = 0; i < count; i++) {
      employeeDefs.push({ teamId: team.id, companyId: acme.id })
    }
  })
  // Brightside employees
  const brightsideTeams = teams.filter((t) => t.companyId === brightside.id)
  brightsideTeams.forEach((team) => {
    for (let i = 0; i < 4; i++) {
      employeeDefs.push({ teamId: team.id, companyId: brightside.id })
    }
  })
  // Quantum employees
  const quantumTeams = teams.filter((t) => t.companyId === quantum.id)
  quantumTeams.forEach((team, idx) => {
    const count = 4 + (idx % 2)
    for (let i = 0; i < count; i++) {
      employeeDefs.push({ teamId: team.id, companyId: quantum.id })
    }
  })

  const employees = await Promise.all(
    employeeDefs.map((def, i) => {
      const fn = firstNames[(nameIdx + i) % firstNames.length]
      const ln = lastNames[(nameIdx + i * 3) % lastNames.length]
      const t = teams.find((t) => t.id === def.teamId)!
      return db.user.create({
        data: {
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${t.companyId === northwind.id ? 'northwindlabs' : t.companyId === acme.id ? 'acme' : t.companyId === brightside.id ? 'brightside.studio' : 'quantumforge'}.com`,
          name: `${fn} ${ln}`,
          password: DEMO_HASH,
          title: ['Designer', 'Engineer', 'Strategist', 'Analyst', 'Lead'][i % 5],
          role: 'EMPLOYEE',
          companyId: def.companyId,
          teamId: def.teamId,
          avatarColor: colorPool[i % colorPool.length],
        },
      })
    })
  )

  console.log(`Created ${employees.length} employees`)

  // ===== ACTIVE CHALLENGES =====
  // Northwind active challenge (Mon-Fri current week)
  const now = new Date()
  const monday = new Date(now)
  const day = monday.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(monday.getDate() + diff)
  monday.setHours(9, 0, 0, 0)

  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)
  friday.setHours(17, 0, 0, 0)

  const northwindChallenge = await db.challenge.create({
    data: {
      name: 'Q4 Focus Sprint',
      description: 'Stay deep, stay sharp. The team with the most focus hours wins a team lunch!',
      companyId: northwind.id,
      startDate: monday,
      endDate: friday,
      prize: 'Team Lunch Gift Card',
      giftCardValue: 100,
      giftCardCode: '',
      status: 'ACTIVE',
      scoringModel: 'TOTAL_HOURS',
      scope: 'COMPANY',
    },
  })

  // Acme active challenge
  const acmeMonday = new Date(monday)
  const acmeChallenge = await db.challenge.create({
    data: {
      name: 'Shipping Week Deep Work',
      description: 'Crush the release. Fewest distractions wins.',
      companyId: acme.id,
      startDate: acmeMonday,
      endDate: friday,
      prize: 'Coffee Gift Card',
      giftCardValue: 100,
      giftCardCode: '',
      status: 'ACTIVE',
      scoringModel: 'AVG_PER_MEMBER',
      scope: 'COMPANY',
    },
  })

  // A completed past challenge for Northwind (last week, with a winner)
  const lastMonday = new Date(monday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const lastFriday = new Date(friday)
  lastFriday.setDate(lastFriday.getDate() - 7)
  const marketingTeam = northwindTeams[0]
  const pastChallenge = await db.challenge.create({
    data: {
      name: 'Q4 Kickoff Focus',
      description: 'Get the quarter started right.',
      companyId: northwind.id,
      startDate: lastMonday,
      endDate: lastFriday,
      prize: 'Team Lunch Gift Card',
      giftCardValue: 100,
      giftCardCode: 'GIFT-NORTH-XXXX-2024',
      status: 'COMPLETED',
      scoringModel: 'TOTAL_HOURS',
      scope: 'COMPANY',
      winnerTeamId: marketingTeam.id,
    },
  })

  // ===== FOCUS SESSIONS (for leaderboard data) =====
  // Generate sessions for the active challenge period for Northwind & Acme employees
  const seedRandom = (seed: number) => {
    let s = seed
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }

  const sessionsData: any[] = []
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const twoDaysAgo = new Date(now)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

  let seedCounter = 1
  for (const emp of employees) {
    if (emp.companyId !== northwind.id && emp.companyId !== acme.id) continue
    const rng = seedRandom(seedCounter++)
    const sessionCount = Math.floor(rng() * 6) + 2 // 2-7 sessions
    let totalHours = 0
    let totalPoints = 0
    let streakDates = new Set<string>()

    for (let s = 0; s < sessionCount; s++) {
      const daysAgo = Math.floor(rng() * 4)
      const sessionDate = new Date(now)
      sessionDate.setDate(sessionDate.getDate() - daysAgo)
      sessionDate.setHours(9 + Math.floor(rng() * 8), Math.floor(rng() * 60), 0, 0)

      const duration = rng() > 0.3 ? 60 : 30 // mostly 60 min
      const points = duration === 60 ? 10 : 5
      const challengeId =
        emp.companyId === northwind.id
          ? daysAgo < 5
            ? northwindChallenge.id
            : pastChallenge.id
          : acmeChallenge.id

      sessionsData.push({
        userId: emp.id,
        teamId: emp.teamId!,
        companyId: emp.companyId!,
        challengeId,
        startTime: sessionDate,
        durationMinutes: duration,
        points,
        completed: true,
      })
      totalHours += duration / 60
      totalPoints += points
      streakDates.add(sessionDate.toISOString().split('T')[0])
    }

    // Update employee stats
    const streakCount = streakDates.has(todayStr) && streakDates.has(yesterdayStr) ? streakDates.size : streakDates.has(todayStr) ? 1 : 0
    await db.user.update({
      where: { id: emp.id },
      data: {
        totalFocusHours: Math.round(totalHours * 10) / 10,
        totalPoints,
        totalSessions: sessionCount,
        streak: streakCount,
        bestStreak: Math.max(streakCount, Math.floor(rng() * 5) + 2),
        lastFocusDate: streakDates.has(todayStr) ? todayStr : streakDates.has(yesterdayStr) ? yesterdayStr : twoDaysAgoStr,
      },
    })
  }

  // Bulk insert sessions
  await db.focusSession.createMany({ data: sessionsData })
  console.log(`Created ${sessionsData.length} focus sessions`)

  // ===== NOTIFICATIONS =====
  const northwindEmployees = employees.filter((e) => e.companyId === northwind.id)
  await db.notification.createMany({
    data: [
      ...northwindEmployees.map((e) => ({
        userId: e.id,
        title: 'Weekly Focus Challenge is Live!',
        message: 'The Q4 Focus Sprint has started. Tap Start to begin tracking your deep work hours.',
        type: 'CHALLENGE',
      })),
      {
        userId: companyAdmins[0].id,
        title: 'Challenge Created',
        message: 'Q4 Focus Sprint is now active. Employees have been notified.',
        type: 'SUCCESS',
      },
      {
        userId: superAdmin.id,
        title: 'New Subscription',
        message: 'Quantum Forge upgraded to the Growth plan ($199/mo).',
        type: 'SUCCESS',
      },
      {
        userId: superAdmin.id,
        title: 'Payment Failed',
        message: 'Brightside Studio payment is past due. Account may be locked soon.',
        type: 'WARNING',
      },
    ],
  })

  console.log('Seed complete!')
  console.log('---')
  console.log('Super Admin:    sree@focuspot.io / demo')
  console.log('Northwind Admin: hr@northwindlabs.com / demo')
  console.log('Employee:       any @northwindlabs.com email / demo')
  console.log('---')
  console.log(`Companies: ${companies.length}, Teams: ${teams.length}, Employees: ${employees.length}`)

  // ===== ACHIEVEMENTS =====
  const achievementDefs = [
    { key: 'first_focus', name: 'First Steps', description: 'Complete your first focus session', icon: '🌱', category: 'FOCUS', metric: 'totalSessions', threshold: 1, color: 'emerald' },
    { key: 'sessions_10', name: 'Getting Started', description: 'Complete 10 focus sessions', icon: '⚡', category: 'FOCUS', metric: 'totalSessions', threshold: 10, color: 'amber' },
    { key: 'sessions_50', name: 'Focus Pro', description: 'Complete 50 focus sessions', icon: '🎯', category: 'FOCUS', metric: 'totalSessions', threshold: 50, color: 'sky' },
    { key: 'sessions_100', name: 'Centurion', description: 'Complete 100 focus sessions', icon: '💯', category: 'FOCUS', metric: 'totalSessions', threshold: 100, color: 'violet' },
    { key: 'hours_10', name: 'Deep Diver', description: 'Accumulate 10 total focus hours', icon: '🏊', category: 'FOCUS', metric: 'totalFocusHours', threshold: 10, color: 'sky' },
    { key: 'hours_50', name: 'Marathon Worker', description: 'Accumulate 50 total focus hours', icon: '🏃', category: 'FOCUS', metric: 'totalFocusHours', threshold: 50, color: 'amber' },
    { key: 'hours_100', name: 'Century Club', description: 'Accumulate 100 total focus hours', icon: '🏆', category: 'MILESTONE', metric: 'totalFocusHours', threshold: 100, color: 'violet' },
    { key: 'streak_3', name: 'On Fire', description: 'Maintain a 3-day streak', icon: '🔥', category: 'STREAK', metric: 'streak', threshold: 3, color: 'orange' },
    { key: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '⚡', category: 'STREAK', metric: 'streak', threshold: 7, color: 'amber' },
    { key: 'streak_30', name: 'Unstoppable', description: 'Maintain a 30-day streak', icon: '💎', category: 'STREAK', metric: 'streak', threshold: 30, color: 'violet' },
    { key: 'best_streak_7', name: 'Consistency King', description: 'Achieve a best streak of 7 days', icon: '👑', category: 'STREAK', metric: 'bestStreak', threshold: 7, color: 'rose' },
    { key: 'best_streak_30', name: 'Iron Will', description: 'Achieve a best streak of 30 days', icon: '🛡️', category: 'STREAK', metric: 'bestStreak', threshold: 30, color: 'sky' },
  ]
  await db.achievement.createMany({ data: achievementDefs })
  console.log(`Created ${achievementDefs.length} achievements`)

  // ===== COMPANY SETTINGS =====
  await db.companySettings.createMany({
    data: companies.map((c) => ({
      companyId: c.id,
      timezone: 'America/Chicago',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      workingDays: '1,2,3,4,5',
      primaryColor: 'emerald',
      logoText: c.name,
    })),
  })

  // ===== REWARDS =====
  const rewardDefs = [
    { name: '$100 Team Lunch Gift Card', description: 'Amazon gift card for a team lunch', type: 'GIFT_CARD', value: 10000, provider: 'amazon', inventory: -1, imageColor: 'emerald', companyId: northwind.id },
    { name: '$50 Coffee Gift Card', description: 'Starbucks gift card', type: 'GIFT_CARD', value: 5000, provider: 'starbucks', inventory: -1, imageColor: 'amber', companyId: northwind.id },
    { name: 'FocusPot Champion Mug', description: 'Branded ceramic mug for challenge winners', type: 'MERCH', value: 1500, provider: 'custom', inventory: 50, imageColor: 'sky', companyId: northwind.id },
    { name: 'Extra PTO Day', description: 'One extra paid day off', type: 'EXPERIENCE', value: 0, provider: 'internal', inventory: -1, imageColor: 'violet', companyId: northwind.id },
    { name: '$25 Bookstore Gift Card', description: 'For the knowledge seekers', type: 'GIFT_CARD', value: 2500, provider: 'amazon', inventory: -1, imageColor: 'rose', companyId: acme.id },
  ]
  const rewards = await Promise.all(rewardDefs.map((r) => db.reward.create({ data: r })))

  // Link rewards to challenges
  await db.challengeReward.create({
    data: { challengeId: northwindChallenge.id, rewardId: rewards[0].id, tier: 'WINNER', position: 1 },
  })
  await db.challengeReward.create({
    data: { challengeId: northwindChallenge.id, rewardId: rewards[2].id, tier: 'RUNNER_UP', position: 2 },
  })
  await db.challengeReward.create({
    data: { challengeId: pastChallenge.id, rewardId: rewards[0].id, tier: 'WINNER', position: 1 },
  })

  // ===== FEATURE FLAGS =====
  await db.featureFlag.createMany({
    data: [
      { key: 'rewards_system', name: 'Rewards System', description: 'Enable the rewards catalog and redemption workflow', enabled: true },
      { key: 'achievements', name: 'Achievements', description: 'Enable gamification achievements', enabled: true },
      { key: 'csv_import', name: 'CSV Import', description: 'Enable bulk employee import via CSV', enabled: true },
      { key: 'analytics_dashboard', name: 'Analytics Dashboard', description: 'Enable the analytics tab with persisted statistics', enabled: true },
      { key: 'recurring_challenges', name: 'Recurring Challenges', description: 'Enable weekly recurring challenge auto-creation', enabled: false },
      { key: 'maintenance_mode_global', name: 'Global Maintenance Mode', description: 'Put the entire platform in maintenance mode', enabled: false },
    ],
  })

  // ===== PLATFORM ANNOUNCEMENTS =====
  await db.platformAnnouncement.create({
    data: {
      title: 'Welcome to FocusPot Enterprise',
      message: 'New features: Rewards catalog, achievements, analytics, CSV import, and more!',
      type: 'INFO',
      active: true,
      dismissible: true,
    },
  })

  // ===== SCHEDULED JOBS =====
  // Schedule challenge closure for the active challenges
  await db.scheduledJob.createMany({
    data: [
      { type: 'CHALLENGE_CLOSE', entityId: northwindChallenge.id, scheduledFor: friday, status: 'PENDING' },
      { type: 'CHALLENGE_CLOSE', entityId: acmeChallenge.id, scheduledFor: friday, status: 'PENDING' },
      { type: 'STATS_REFRESH', entityId: 'all', scheduledFor: new Date(Date.now() + 60 * 60 * 1000), status: 'PENDING' },
      { type: 'STREAK_RESET', entityId: 'all', scheduledFor: new Date(new Date().setHours(23, 59, 0, 0)), status: 'PENDING' },
    ],
  })

  // ===== AWARD EXISTING ACHIEVEMENTS (based on seeded stats) =====
  const allAchievements = await db.achievement.findMany()
  const achMap = new Map(allAchievements.map((a) => [a.key, a]))
  for (const emp of employees) {
    const fullEmp = await db.user.findUnique({ where: { id: emp.id }, select: { totalSessions: true, totalFocusHours: true, streak: true, bestStreak: true } })
    if (!fullEmp) continue
    for (const ach of allAchievements) {
      const value = (fullEmp as any)[ach.metric] || 0
      if (value >= ach.threshold) {
        await db.userAchievement.create({ data: { userId: emp.id, achievementId: ach.id } }).catch(() => {})
      }
    }
  }
  console.log('Awarded achievements to eligible employees')

  // ===== NOTIFICATION PREFERENCES (defaults for all users) =====
  await db.notificationPreference.createMany({
    data: [...employees, ...companyAdmins, superAdmin].map((u) => ({ userId: u.id })),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
