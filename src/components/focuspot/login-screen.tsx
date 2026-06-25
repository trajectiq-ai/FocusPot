'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Trophy,
  Shield,
  Flame,
  Timer,
  ArrowRight,
  Sparkles,
  Building2,
  User,
  Crown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { getColor } from '@/lib/colors'

type DemoAccount = {
  id: string
  email: string
  name: string
  role: string
  avatarColor: string
  company?: { name: string }
  team?: { name: string }
}

type PlanKey = 'STARTER' | 'GROWTH'

const PLANS: {
  key: PlanKey
  name: string
  price: number
  seats: number
  tagline: string
  features: string[]
}[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 99,
    seats: 50,
    tagline: 'For small teams getting started',
    features: ['Up to 50 employees', 'Weekly team challenges', 'Privacy Shield analytics', 'Email support'],
  },
  {
    key: 'GROWTH',
    name: 'Growth',
    price: 199,
    seats: 200,
    tagline: 'For growing organizations',
    features: ['Up to 200 employees', 'Everything in Starter', 'Unlimited teams', 'Priority support'],
  },
]

export function LoginScreen() {
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('demo')
  const [loading, setLoading] = useState(false)
  const [demos, setDemos] = useState<{
    superAdmin: DemoAccount | null
    companyAdmin: DemoAccount | null
    employee: DemoAccount | null
  }>({ superAdmin: null, companyAdmin: null, employee: null })

  useEffect(() => {
    fetch('/api/quick-login')
      .then((r) => r.json())
      .then(setDemos)
      .catch(() => {})
  }, [])

  const handleLogin = async (loginEmail: string, loginPassword = 'demo') => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setUser(data)
      toast.success(`Welcome back, ${data.name.split(' ')[0]}!`)
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const roleCards: {
    account: DemoAccount | null
    icon: typeof Crown
    label: string
    desc: string
    color: string
  }[] = [
    {
      account: demos.superAdmin,
      icon: Crown,
      label: 'Super Admin',
      desc: 'Platform owner. See all companies, revenue & subscriptions.',
      color: 'violet',
    },
    {
      account: demos.companyAdmin,
      icon: Building2,
      label: 'Company Admin',
      desc: 'HR Manager. Set challenges, manage teams, view anonymous analytics.',
      color: 'amber',
    },
    {
      account: demos.employee,
      icon: User,
      label: 'Employee',
      desc: 'Track deep work, climb leaderboards, keep your streak alive.',
      color: 'emerald',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-sm">
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">FocusPot</span>
              <span className="hidden sm:inline ml-2 text-xs text-muted-foreground">Team Deep Work Competitions</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">B2B SaaS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>$99–$199/mo</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: pitch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Fight digital burnout as a team
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Turn <span className="brand-text">Deep Work</span> into a
              <br className="hidden sm:block" /> team competition.
            </h1>
            <p className="text-lg text-muted-foreground mb-7 max-w-md">
              Companies set a weekly focus challenge with a prize. Employees track
              distraction-free hours. The winning team takes the pot.
            </p>
            <div className="space-y-3 mb-8">
              {[
                { icon: Timer, text: 'Anti-cheat timer that pauses the moment you leave the app' },
                { icon: Shield, text: 'Privacy Shield: admins see only anonymous team data, never individuals' },
                { icon: Flame, text: 'Streaks & gamification keep employees coming back daily' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: login card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="border-border/60 shadow-xl shadow-primary/5">
              <CardContent className="p-6 sm:p-8">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-6">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Get Started</TabsTrigger>
                  </TabsList>

                  {/* SIGN IN TAB (existing behavior) */}
                  <TabsContent value="signin" className="mt-0 outline-none">
                    <h2 className="text-xl font-semibold mb-1">Sign in to FocusPot</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Pick a role below to explore the demo instantly.
                    </p>

                    {/* Quick login role cards */}
                    <div className="space-y-2.5 mb-6">
                      {roleCards.map((rc) => {
                        const c = getColor(rc.color)
                        return (
                          <button
                            key={rc.label}
                            onClick={() => rc.account && handleLogin(rc.account.email)}
                            disabled={!rc.account || loading}
                            className="w-full text-left group disabled:opacity-50"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-all">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center shrink-0`}>
                                <rc.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{rc.label}</span>
                                  {rc.account && (
                                    <span className="text-xs text-muted-foreground truncate">· {rc.account.name}</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{rc.desc}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/60" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-3 text-xs text-muted-foreground">or sign in with email</span>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (email) handleLogin(email, password)
                      }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs">Work email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || !email}>
                        {loading ? 'Signing in…' : 'Sign in'}
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Demo mode — any seeded account works with password <code className="font-mono bg-muted px-1 py-0.5 rounded">demo</code>
                    </p>
                  </TabsContent>

                  {/* GET STARTED TAB */}
                  <TabsContent value="register" className="mt-0 outline-none">
                    <GetStartedForm loading={loading} setLoading={setLoading} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span>FocusPot — Deep work, together.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Privacy-first</span>
            <span>·</span>
            <span>Anti-cheat timer</span>
            <span>·</span>
            <span>Stripe billing</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------- Get Started (Register) ------------------------- */

function GetStartedForm({
  loading,
  setLoading,
}: {
  loading: boolean
  setLoading: (b: boolean) => void
}) {
  const { setUser } = useAuthStore()
  const [mode, setMode] = useState<'hr' | 'employee'>('hr')

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Get started with FocusPot</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Join the platform in under a minute.
      </p>

      {/* Segmented control: HR vs Employee */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60 mb-6">
        <button
          type="button"
          onClick={() => setMode('hr')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'hr'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          I&apos;m an HR Manager
        </button>
        <button
          type="button"
          onClick={() => setMode('employee')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'employee'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          I&apos;m an Employee
        </button>
      </div>

      {mode === 'hr' ? (
        <CompanyRegistrationForm loading={loading} setLoading={setLoading} setUser={setUser} />
      ) : (
        <EmployeeJoinForm loading={loading} setLoading={setLoading} setUser={setUser} />
      )}
    </div>
  )
}

/* ------------------------- Company Registration ------------------------- */

function CompanyRegistrationForm({
  loading,
  setLoading,
  setUser,
}: {
  loading: boolean
  setLoading: (b: boolean) => void
  setUser: (u: any) => void
}) {
  const [companyName, setCompanyName] = useState('')
  const [domain, setDomain] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<PlanKey>('STARTER')

  const validate = (): string | null => {
    if (companyName.trim().length < 2) return 'Company name must be at least 2 characters'
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())) return 'Enter a valid domain like acme.com'
    if (adminName.trim().length < 2) return 'Your name must be at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) return 'Enter a valid work email'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          domain: domain.trim().toLowerCase(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          password,
          plan,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      setUser(data)
      toast.success(
        `Company created! Your join code is ${data.company?.joinCode ?? '—'} — share it with your team.`,
        { duration: 6000 }
      )
    } catch (e: any) {
      toast.error(e.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="company-name" className="text-xs">Company name</Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-domain" className="text-xs">Company domain</Label>
          <Input
            id="company-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="acme.com"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-name" className="text-xs">Your name</Label>
          <Input
            id="admin-name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Jordan Smith"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-email" className="text-xs">Work email</Label>
          <Input
            id="admin-email"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="jordan@acme.com"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-password" className="text-xs">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          autoComplete="new-password"
        />
      </div>

      {/* Plan selector */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs">Choose your plan</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((p) => {
            const active = plan === p.key
            const c = getColor(p.key === 'GROWTH' ? 'violet' : 'emerald')
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlan(p.key)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <span className="font-semibold text-sm">{p.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold tracking-tight">${p.price}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">Up to {p.seats} employees</p>
                <ul className="space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                      <Check className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? 'Creating workspace…' : `Create company — $${PLANS.find((p) => p.key === plan)!.price}/mo`}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        You&apos;ll be logged in as the company admin. Cancel anytime.
      </p>
    </form>
  )
}

/* ------------------------- Employee Join ------------------------- */

function EmployeeJoinForm({
  loading,
  setLoading,
  setUser,
}: {
  loading: boolean
  setLoading: (b: boolean) => void
  setUser: (u: any) => void
}) {
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const validate = (): string | null => {
    if (joinCode.trim().length < 4) return 'Enter your company join code'
    if (name.trim().length < 2) return 'Your name must be at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid work email'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')

      setUser(data)
      toast.success('Welcome to FocusPot!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="join-code" className="text-xs">Join code</Label>
        <Input
          id="join-code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="NORTHWIND-7K2M"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono uppercase tracking-wide"
        />
        <p className="text-[11px] text-muted-foreground">
          Ask your HR manager for your company&apos;s join code.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emp-name" className="text-xs">Your name</Label>
        <Input
          id="emp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Chen"
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emp-email" className="text-xs">Work email</Label>
        <Input
          id="emp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@yourcompany.com"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emp-password" className="text-xs">Password</Label>
        <Input
          id="emp-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? 'Joining…' : 'Join my team'}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        You&apos;ll be added to your company&apos;s default team.
      </p>
    </form>
  )
}
