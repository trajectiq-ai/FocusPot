# FocusPot — Deploy to Vercel + Neon for FREE

**Total cost: $0/month** | **Time: 15 minutes**

This guide deploys FocusPot to production using free-tier services:
- **Vercel** — hosts the Next.js web app (free tier: generous limits)
- **Neon** — hosts the PostgreSQL database (free tier: 0.5 GB, always-on)
- **Gmail** — sends emails via SMTP (free, up to 100/day)
- **No Stripe needed** — you're giving it away for free

---

## Prerequisites

- A GitHub account (free)
- The FocusPot code pushed to a GitHub repository
- A Gmail account (for sending emails — optional but recommended)

---

## Step 1: Push FocusPot to GitHub

```bash
# In your FocusPot project directory
git init
git add .
git commit -m "FocusPot production-ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/focuspot.git
git push -u origin main
```

---

## Step 2: Create a Neon PostgreSQL Database (2 minutes)

1. Go to **[neon.tech](https://neon.tech)** and sign up with GitHub
2. Click **"Create Project"**
3. Name it `focuspot`
4. Select region closest to you (e.g., `US East`)
5. Click **"Create"**
6. On the dashboard, copy the **Connection String** — it looks like:
   ```
   postgresql://focuspot_owner:AbCdEf123456@ep-cool-name-123456.us-east-2.aws.neon.tech/focuspot?sslmode=require
   ```
7. **Save this** — you'll paste it into Vercel in the next step

---

## Step 3: Deploy to Vercel (5 minutes)

1. Go to **[vercel.com](https://vercel.com)** and sign up with GitHub
2. Click **"Add New Project"**
3. Import your `focuspot` repository
4. Vercel detects Next.js automatically — keep the default settings
5. **Before clicking Deploy**, expand **"Environment Variables"** and add these:

### Required Environment Variables

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://focuspot_owner:...` | Paste from Neon (Step 2) |
| `SESSION_SECRET` | (generate below) | Run this command: `openssl rand -hex 32` |

### Optional (but recommended) — Email

| Name | Value |
|------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-16-char-app-password` |
| `SMTP_FROM` | `FocusPot <your-email@gmail.com>` |

**To get a Gmail App Password:**
1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already)
3. Go to **App Passwords** → Generate one for "Mail"
4. Copy the 16-character password

### Optional — If you want to charge money later

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe Dashboard) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe Webhooks) |

6. Click **"Deploy"**
7. Wait 2-3 minutes for the build to complete
8. Your app is live at `https://focuspot-YOUR_USERNAME.vercel.app` 🎉

---

## Step 4: Verify Your Deployment

1. Visit your Vercel URL — you should see the FocusPot login page
2. Click **"Super Admin"** quick-login to explore the dashboard
3. Check the health endpoint: `https://your-url.vercel.app/api/health` — should show:
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": { "status": "ok" },
       "smtp": { "status": "configured" },
       "session": { "status": "configured" }
     }
   }
   ```

---

## Step 5: Seed the Database (optional — for demo data)

The Vercel build script automatically creates all database tables. To add demo data:

1. In your terminal, install the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. Link your project:
   ```bash
   cd focuspot
   vercel link
   ```

3. Run the seed script on the production database:
   ```bash
   vercel env pull .env.vercel
   # This pulls your Vercel env vars locally
   # Now temporarily switch your schema to postgresql and seed:
   ```

   **Or easier**: Use Neon's SQL Editor:
   1. Go to Neon Dashboard → your project → **SQL Editor**
   2. The tables are already created by the build script
   3. You can run SQL queries directly to add companies/users

---

## Step 6: Set Up the Scheduler (automatic challenge closure)

The scheduler runs as a background process that:
- Auto-activates challenges when their start date arrives
- Auto-closes challenges when their end date arrives
- Refreshes statistics every hour
- Resets stale streaks daily

### Option A: Use Vercel Cron (recommended, free)

1. Update `vercel.json` to add a cron job that calls your scheduler API:

```json
"crons": [
  {
    "path": "/api/scheduler/run",
    "schedule": "*/30 * * * *"
  }
]
```

2. Create `src/app/api/scheduler/run/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processDueJobs, adhocChecks } from '@/lib/scheduler-runner'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (not a random user)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  await processDueJobs()
  await adhocChecks()
  
  return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
}
```

3. Add `CRON_SECRET` to Vercel env vars: `openssl rand -hex 32`

### Option B: Keep the scheduler mini-service running on a VPS

If you have a VPS (DigitalOcean, Hetzner), run the scheduler there:
```bash
# On your VPS
git clone <your-repo> focuspot && cd focuspot
bun install
DATABASE_URL=your_neon_url bun mini-services/scheduler/index.ts
```

Use `pm2` or `systemd` to keep it running:
```bash
pm2 start "bun mini-services/scheduler/index.ts" --name focuspot-scheduler
pm2 save
pm2 startup
```

---

## Step 7: Add Your Custom Domain (optional, free)

1. Buy a domain (e.g., from Namecheap ~$10/year)
2. In Vercel Dashboard → your project → **Settings** → **Domains**
3. Add your domain (e.g., `focuspot.yourcompany.com`)
4. Vercel gives you DNS records to add to your domain registrar
5. HTTPS is automatic via Let's Encrypt

---

## Cost Summary

| Service | Free Tier | When You'd Pay |
|---------|-----------|----------------|
| **Vercel** | 100 GB bandwidth, 1000 builds/month | >100k requests/day |
| **Neon** | 0.5 GB storage, always-on | >0.5 GB data |
| **Gmail SMTP** | 100 emails/day | >500 emails/day |
| **GitHub** | Unlimited public repos | Private repos (still free) |

**You can run FocusPot for free until you have ~50+ companies and thousands of users.**

---

## Troubleshooting

### "Database connection failed"
- Check that `DATABASE_URL` is set in Vercel env vars
- Check that it starts with `postgresql://` (not `sqlite:`)
- Check Neon dashboard — the database should be "Active"

### "Build failed: Prisma generate error"
- The build script swaps SQLite→PostgreSQL automatically
- If it fails, check Vercel build logs for the exact error
- Make sure `DATABASE_URL` is set **before** the build runs

### "Emails not sending"
- Verify SMTP credentials with [Google's SMTP test](https://www.google.com/settings/security)
- Check Vercel logs: `vercel logs` or Dashboard → Functions → Logs
- Gmail limits: 100 emails/day per account

### "Rate limited"
- Auth endpoints: 10 attempts per 15 minutes per IP
- Wait 15 minutes or deploy a fresh instance

### "Scheduler not running"
- Vercel free tier doesn't support long-running processes
- Use Vercel Cron (Step 6 Option A) or a VPS (Step 6 Option B)

---

## Quick Reference

| URL | What |
|-----|------|
| `https://your-app.vercel.app` | Your live FocusPot |
| `https://your-app.vercel.app/api/status` | Health check |
| `https://your-app.vercel.app/api/health` | Deep health check |
| Neon Dashboard | Database management |
| Vercel Dashboard | Deployments, logs, env vars |

---

## What's Next?

Once deployed:
1. **Register your first company** — use the "Get Started" tab on the login page
2. **Share the join code** — employees use it to sign up via the mobile app
3. **Create a challenge** — set a prize, start date, end date
4. **Employees start focusing** — the leaderboard updates automatically
5. **Winners get emails** — gift card codes delivered via SMTP

You're live. 🎉
