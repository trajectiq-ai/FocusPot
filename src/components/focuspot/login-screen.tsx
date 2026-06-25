'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Trophy, Shield, Flame, Timer, ArrowRight, Sparkles, Building2, User, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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

  const handleLogin = async (loginEmail: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: 'demo' }),
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
                    if (email) handleLogin(email)
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
