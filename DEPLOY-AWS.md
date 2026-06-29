# FocusPot — Deploy to AWS App Runner

**Cost**: ~$5-15/month | **Time**: 20 minutes | **Region**: us-east-1 (change as needed)

This guide deploys FocusPot to production using AWS App Runner + Amazon RDS PostgreSQL + Amazon SES.

---

## Architecture

```
Internet → AWS App Runner (Next.js app, auto-scaling)
                ↓
         Amazon RDS (PostgreSQL, encrypted, backed up)
                ↓
         Amazon SES (email delivery)

Amazon EventBridge → calls /api/scheduler/run every 30 minutes
```

---

## Prerequisites

1. **AWS Account** — [aws.amazon.com](https://aws.amazon.com) (free tier works)
2. **AWS CLI installed** — `pip install awscli` or [installer](https://aws.amazon.com/cli/)
3. **AWS CLI configured** — run `aws configure` with your access key + secret
4. **A registered domain** (optional but recommended for email)
5. **FocusPot code on GitHub** — already pushed to `github.com/trajectiq-ai/FocusPot`

---

## Step 1: Create RDS PostgreSQL Database (5 minutes)

### Option A: Using the setup script (recommended)

```bash
cd focuspot
export AWS_REGION=us-east-1
./scripts/setup-rds.sh
```

This creates a free-tier `db.t4g.micro` PostgreSQL instance with:
- 20 GB encrypted storage
- 7-day automated backups
- Private network access (secure)

**Save the output** — it contains your `DATABASE_URL`.

### Option B: Using AWS Console

1. Go to **AWS Console** → **RDS** → **Create database**
2. Select **PostgreSQL** → **Free tier** template
3. Settings:
   - DB instance identifier: `focuspot-db`
   - Master username: `focuspot`
   - Master password: (generate a strong password)
   - DB name: `focuspot`
4. Instance: `db.t4g.micro` (free tier)
5. Storage: 20 GB SSD
6. Connectivity: **Public access = No** (for security)
7. Backup: **7 days** retention
8. Click **Create database** (takes 5-10 minutes)

Once available, note the **endpoint** (e.g., `focuspot-db.xyz123.us-east-1.rds.amazonaws.com`).

Your `DATABASE_URL`:
```
postgresql://focuspot:YOUR_PASSWORD@focuspot-db.xyz123.us-east-1.rds.amazonaws.com:5432/focuspot?schema=public
```

---

## Step 2: Set Up Amazon SES for Email (3 minutes)

Amazon SES sends your transactional emails (welcome, password reset, challenge winner).

### 2a. Verify your email domain (or sender email)

1. Go to **AWS Console** → **SES** → **Verified identities**
2. Click **Create identity** → **Email address**
3. Enter `noreply@yourdomain.com`
4. Check that inbox and click the verification link

**For production**: Verify your entire domain (SPF/DKIM) to send from any address.

### 2b. Generate SMTP credentials

1. Go to **SES** → **SMTP settings** → **Create SMTP credentials**
2. This creates an IAM user with SMTP permissions
3. **Save the SMTP username and password** — you'll need them

### 2c. Request production access (important!)

By default, SES only sends to **verified email addresses** (sandbox mode).

1. Go to **SES** → **Account dashboard**
2. Click **Request production access**
3. Fill in the form (describe your use case: "B2B SaaS sending transactional emails to registered users")
4. AWS approves within 24 hours (usually faster)

**Until approved**: You can only send to emails you've verified. Fine for testing.

Your SMTP settings (us-east-1, adjust region if different):
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAXXXXXXXXXXXXXX (from step 2b)
SMTP_PASS=your-ses-smtp-password (from step 2b)
SMTP_FROM=FocusPot <noreply@yourdomain.com>
```

---

## Step 3: Deploy to AWS App Runner (10 minutes)

### 3a. Create the App Runner service

1. Go to **AWS Console** → **App Runner** → **Create service**
2. **Source**:
   - Repository type: **Source code repository**
   - Connect to GitHub → select `trajectiq-ai/FocusPot`
   - Branch: `main`
3. **Build**:
   - Runtime: **Docker**
   - Dockerfile: `Dockerfile` (auto-detected)
4. **Configure**:
   - Service name: `focuspot`
   - Port: `3000`
   - Environment variables (click "Add environment variable"):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://focuspot:...` (from Step 1) |
| `SESSION_SECRET` | Run `openssl rand -hex 32` |
| `SMTP_HOST` | `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your SES SMTP username |
| `SMTP_PASS` | Your SES SMTP password |
| `SMTP_FROM` | `FocusPot <noreply@yourdomain.com>` |
| `CRON_SECRET` | Run `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://focuspot.xxxxxx.us-east-1.awsapprunner.com` (fill after first deploy) |

**Optional** (for Stripe payments):
| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

5. **Security**:
   - Instance role: Create new (or use default — App Runner needs no special AWS permissions for this setup)
6. **Networking**:
   - Ingress: **Public** (anyone can access)
   - Egress: **Public** (can reach RDS via NAT Gateway — App Runner creates this automatically)
7. **Auto-scaling**:
   - Min: 1 instance
   - Max: 25 instances (auto-scales with traffic)
   - Concurrency: 100 requests per instance
8. **Health check**:
   - Path: `/api/status`
   - Interval: 30s
9. Click **Create & deploy**

### 3b. Wait for deployment

App Runner builds the Docker image and deploys. This takes **5-8 minutes**.

When done, you'll get a URL like:
```
https://focuspot.xxxxxx.us-east-1.awsapprunner.com
```

### 3c. Update the App URL

1. Go to App Runner → your service → **Configuration** → **Edit**
2. Update `NEXT_PUBLIC_APP_URL` to your actual App Runner URL
3. Save and redeploy (takes 2-3 minutes)

---

## Step 4: Run Database Migration (2 minutes)

The Dockerfile's build step generates the Prisma client but doesn't run the migration. You need to push the schema to RDS:

### Option A: Use the App Runner console (easiest)

1. Go to App Runner → your service → **Logs**
2. Click **Open shell** (or use AWS CLI to run a command)

Actually, App Runner doesn't have a shell. Use this instead:

### Option B: Run migration locally (recommended)

```bash
cd focuspot

# Temporarily set your RDS DATABASE_URL
export DATABASE_URL="postgresql://focuspot:YOUR_PASSWORD@focuspot-db.xyz123.us-east-1.rds.amazonaws.com:5432/focuspot?schema=public"

# Swap schema to PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Push schema to RDS
bun run db:generate
bun run db:push

# Swap back to SQLite for local dev
sed -i 's/provider = "postgresql"/provider = "sqlite"/g' prisma/schema.prisma

# Verify tables were created
echo "Tables created in RDS PostgreSQL."
```

### Option C: Seed demo data (optional)

```bash
# With DATABASE_URL still set to RDS
bun run prisma/seed.ts
```

---

## Step 5: Set Up the Scheduler (EventBridge) (3 minutes)

The scheduler auto-activates/closes challenges, refreshes stats, and resets streaks. Since App Runner is serverless, we use Amazon EventBridge to call the scheduler endpoint every 30 minutes.

### 5a. Create an EventBridge Scheduler schedule

1. Go to **AWS Console** → **EventBridge** → **Schedules** → **Create schedule**
2. **Schedule**:
   - Name: `focuspot-scheduler`
   - Occurrence: **Recurring**
   - Schedule: `rate(30 minutes)`
3. **Target**:
   - API destination: **Create new API destination**
     - Method: `GET`
     - Endpoint URL: `https://your-app-runner-url.awsapprunner.com/api/scheduler/run`
     - Connection: Create new → Auth type: **API Key** → Header name: `Authorization` → API key: `Bearer YOUR_CRON_SECRET`
4. **Retry policy**: Max 3 attempts, 30 second interval
5. Click **Create schedule**

### 5b. Verify the scheduler works

Wait 30 minutes, then check:
1. App Runner → **Logs** — you should see scheduler execution logs
2. Or run manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app-runner-url.awsapprunner.com/api/scheduler/run
   ```

Response should be:
```json
{"success": true, "timestamp": "2026-01-15T..."}
```

---

## Step 6: Configure Stripe Webhooks (if using Stripe)

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-app-runner-url.awsapprunner.com/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`)
5. Go to App Runner → Configuration → Edit environment variables
6. Update `STRIPE_WEBHOOK_SECRET` with the signing secret
7. Redeploy

---

## Step 7: Add a Custom Domain (optional, recommended)

### 7a. Route 53 (if your domain is on AWS)

1. Go to App Runner → your service → **Custom domains** → **Add custom domain**
2. Enter `focuspot.yourdomain.com`
3. App Runner provides CNAME records to add
4. HTTPS is automatic (AWS Certificate Manager)

### 7b. Other registrars

1. In App Runner → Custom domains → Add
2. Follow the DNS instructions to add a CNAME record
3. Wait for DNS propagation (5-30 minutes)

---

## Step 8: Set Up RDS Backups (automatic)

RDS automatically backs up your database daily (7-day retention by default).

**To restore from a backup:**
1. Go to RDS → **Automated backups** → **Snapshots**
2. Select a snapshot → **Restore snapshot**
3. Create a new RDS instance from the snapshot
4. Update `DATABASE_URL` in App Runner

**Manual snapshot:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier focuspot-db \
  --db-snapshot-identifier focuspot-manual-$(date +%Y%m%d)
```

---

## Verification Checklist

After deployment, verify:

- [ ] Visit `https://your-app-runner-url.awsapprunner.com` — login page loads
- [ ] `https://your-app-runner-url.awsapprunner.com/api/status` → `{"status":"ok"}`
- [ ] `https://your-app-runner-url.awsapprunner.com/api/health` → database OK, SMTP configured
- [ ] Login as Super Admin (sree@focuspot.io / demo) — if seeded
- [ ] Register a new company → creates company + admin in RDS
- [ ] Employee join code works → employee created in RDS
- [ ] Create a challenge → appears in admin dashboard
- [ ] App Runner auto-scales (check CloudWatch metrics)

---

## Cost Breakdown (us-east-1)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| **App Runner** | None (~$0.007/hour) | ~$5-15/month (1 instance) |
| **RDS PostgreSQL** (db.t4g.micro) | 750 hours/month × 12 months | ~$15/month after 12 months |
| **RDS Storage** (20 GB) | 20 GB/month × 12 months | ~$2/month after |
| **Amazon SES** | 62,000 emails/month (from EC2) | $0.10 per 1,000 emails |
| **EventBridge** | 14 million invocations/month | Free |
| **CloudWatch** | 10 metrics + 5 GB logs | ~$1-3/month |
| **Route 53** | — | $0.50/month per hosted zone |
| **Data Transfer** | 100 GB/month out | $0.09/GB after |

**First 12 months**: ~$5-10/month (App Runner is the only paid service)
**After 12 months**: ~$20-30/month (RDS free tier ends)

---

## Monitoring

### CloudWatch Logs
```bash
aws logs tail /aws/apprunner/focuspot --follow
```

### App Runner Console
- **Metrics**: Requests, latency, 4xx/5xx errors
- **Logs**: Application logs (real-time)
- **Health**: Instance health status

### Health Endpoints
- `GET /api/status` — liveness (is it running?)
- `HEAD /api/status` — readiness (is DB connected?)
- `GET /api/health` — deep check (DB, SMTP, Stripe, session)

### Set up CloudWatch Alarms
1. Go to CloudWatch → **Alarms** → **Create alarm**
2. Monitor: App Runner → `5XXError` > 10 for 5 minutes → SNS notification
3. Monitor: RDS → `CPUUtilization` > 80% → SNS notification
4. Monitor: RDS → `FreeStorageSpace` < 1 GB → SNS notification

---

## Troubleshooting

### "Database connection failed"
1. Check `DATABASE_URL` in App Runner env vars
2. Verify RDS security group allows inbound on port 5432 from App Runner's VPC
3. If RDS is private, App Runner needs a VPC connector:
   - App Runner → Configuration → Networking → **Custom VPC**
   - Select the VPC where RDS lives

### "App Runner can't reach RDS"
RDS is in a private subnet by default. Fix:
1. Go to App Runner → Configuration → **Networking**
2. Change from "Public" to **Custom VPC**
3. Select the same VPC as your RDS instance
4. Select private subnets + a security group that can access RDS port 5432

### "Emails not sending"
1. Check SES is out of sandbox: SES → Account dashboard
2. Verify SMTP credentials: `.env.aws` has correct SMTP_USER/SMTP_PASS
3. Test: `curl https://your-url/api/health` → smtp should be "configured"
4. Check CloudWatch logs for SMTP errors

### "Scheduler not running"
1. Check EventBridge schedule is ENABLED
2. Verify the API destination URL is correct
3. Verify `CRON_SECRET` matches in both EventBridge and App Runner env vars
4. Check EventBridge → Schedules → your schedule → **Retries** tab

### "Build failed on App Runner"
1. Check App Runner → Logs → **Build logs**
2. Common: missing environment variables at build time
3. The Dockerfile swaps to PostgreSQL only if `DATABASE_URL` is set at build time
4. Make sure `DATABASE_URL` is in the **build environment variables** too

### "Rate limited (429)"
- Auth endpoints: 10 attempts / 15 min / IP
- Wait 15 minutes or scale up App Runner instances (which gives new IPs)

---

## Updating FocusPot

### Push to GitHub → auto-deploy

1. App Runner → your service → **Settings** → **Source**
2. Enable **Automatic deployment** (if not already)
3. Push to `main` branch → App Runner auto-rebuilds

### Manual redeploy
```bash
aws apprunner start-deployment \
  --service-arn YOUR_SERVICE_ARN \
  --region us-east-1
```

---

## Scaling

### Vertical (bigger instances)
App Runner → Configuration → **CPU/Memory**:
- 1 vCPU / 2 GB (default — ~100 concurrent users)
- 2 vCPU / 4 GB (~500 concurrent users)

### Horizontal (more instances)
App Runner → Configuration → **Auto scaling**:
- Min: 2 instances (high availability)
- Max: 25 instances (scales automatically)

### RDS scaling
When you outgrow `db.t4g.micro`:
```bash
aws rds modify-db-instance \
  --db-instance-identifier focuspot-db \
  --db-instance-class db.t4g.small \
  --apply-immediately
```

---

## Next Steps

1. **Set up CloudWatch alarms** (see Monitoring section above)
2. **Configure Route 53** for your custom domain
3. **Request SES production access** (for sending to any email)
4. **Set up Stripe** if charging for subscriptions
5. **Add a CI/CD pipeline** (GitHub Actions → auto-deploy on push)

Your FocusPot app is now live on AWS! 🎉

Visit your App Runner URL to start using it.
