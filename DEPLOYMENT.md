# FocusPot — Production Deployment Guide

This guide covers deploying FocusPot to production using Docker Compose.

## Prerequisites

- A Linux server with:
  - Docker installed (`curl -fsSL https://get.docker.com | sh`)
  - Docker Compose installed (included with Docker)
  - A registered domain name with DNS pointing to your server
- SMTP credentials (Gmail App Password, SendGrid, AWS SES, or Mailgun)
- Stripe account (for payment processing)

## Quick Start (5 minutes)

### 1. Clone the repository
```bash
git clone <your-repo-url> focuspot
cd focuspot
```

### 2. Configure environment variables
```bash
cp .env.example .env
nano .env  # Fill in all the values
```

**Critical values to set:**
- `DATABASE_URL` — will be auto-set by Docker Compose, just set `POSTGRES_PASSWORD`
- `SESSION_SECRET` — generate with `openssl rand -hex 32`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — your SMTP credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard
- `NEXT_PUBLIC_APP_URL` — your domain (e.g. `https://focuspot.yourcompany.com`)

### 3. Configure your domain
Edit `Caddyfile` and replace `focuspot.example.com` with your actual domain:
```
nano Caddyfile
# Replace "focuspot.example.com" with "yourdomain.com"
```

### 4. Deploy
```bash
docker compose up -d --build
```

This starts:
- **PostgreSQL** database (with persistent volume)
- **Next.js** web app (port 3000, behind Caddy)
- **Scheduler** mini-service (background jobs)
- **Caddy** reverse proxy (automatic HTTPS via Let's Encrypt)
- **Backup** service (daily PostgreSQL dumps, 30-day retention)

### 5. Run database migration
```bash
docker compose exec web bun prisma db push
```

### 6. Seed demo data (optional — for testing only)
```bash
docker compose exec web bun prisma/seed.ts
```

### 7. Verify deployment
- Visit `https://yourdomain.com` — you should see the FocusPot login page
- The `/api/status` endpoint should return `{"status":"ok"}`
- HTTPS is automatically provisioned by Caddy

## Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)
5. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`
6. Restart: `docker compose restart web`

## Backup Strategy

Backups run automatically every 24 hours via the `backup` Docker service:
- Stored in `./backups/` directory
- Format: `focuspot_YYYYMMDD_HHMMSS.sql.gz`
- Retained for 30 days

**Manual backup:**
```bash
docker compose exec db pg_dump -U focuspot focuspot | gzip > backups/manual_$(date +%Y%m%d).sql.gz
```

**Restore from backup:**
```bash
gunzip -c backups/focuspot_20250101_120000.sql.gz | docker compose exec -T db psql -U focuspot focuspot
```

## Monitoring

### Health checks
- Application: `GET /api/status` → `{"status":"ok"}`
- Docker: `docker compose ps` shows service health

### Logs
```bash
# All services
docker compose logs -f

# Just the web app
docker compose logs -f web

# Just the scheduler
docker compose logs -f scheduler

# Access logs (via Caddy)
docker compose exec caddy cat /data/access.log
```

### Database monitoring
```bash
# Connect to PostgreSQL
docker compose exec db psql -U focuspot focuspot

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('focuspot'));

# Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Updating FocusPot

```bash
git pull origin main
docker compose up -d --build
docker compose exec web bun prisma db push  # Apply schema changes
```

## Scaling

### Vertical (bigger server)
Edit `docker-compose.yml` and add resource limits:
```yaml
web:
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '2'
```

### Horizontal (multiple instances)
For high availability, deploy multiple web instances behind a load balancer:
1. Use a managed PostgreSQL (AWS RDS, DigitalOcean Managed DB)
2. Deploy web containers to multiple servers
3. Use a managed load balancer (AWS ALB, Cloudflare)
4. Replace the in-memory rate limiter with Redis-backed rate limiting

## Security Checklist

- [ ] `SESSION_SECRET` is set to a random 64-char hex string
- [ ] `POSTGRES_PASSWORD` is a strong password
- [ ] SMTP credentials use App Passwords or API keys (not plain passwords)
- [ ] Stripe keys are `sk_live_` (production), not `sk_test_`
- [ ] HTTPS is active (Caddy auto-provisions Let's Encrypt certificates)
- [ ] Firewall allows only ports 80, 443, and 22 (SSH)
- [ ] Backups are running and tested (check `./backups/`)
- [ ] Stripe webhook signature verification is active
- [ ] Rate limiting is enabled on auth endpoints

## Troubleshooting

### "Database connection failed"
```bash
docker compose exec db pg_isready -U focuspot
docker compose logs db
```

### "Emails not sending"
```bash
docker compose logs web | grep -i "smtp\|email"
```
Verify SMTP credentials with:
```bash
docker compose exec web bun -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
t.verify().then(() => console.log('SMTP OK')).catch(e => console.error('SMTP FAIL:', e.message));
"
```

### "Stripe webhook returns 503"
This means `STRIPE_WEBHOOK_SECRET` is not set. Add it to `.env` and restart.

### "Rate limit triggered"
Auth endpoints allow 10 attempts per 15 minutes per IP. Wait 15 minutes or restart the web container to clear the in-memory store.

## Support

For issues, check:
1. Docker logs: `docker compose logs -f [service]`
2. Application health: `curl https://yourdomain.com/api/status`
3. Database connectivity: `docker compose exec db pg_isready`
