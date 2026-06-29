# FocusPot — Deploy to Azure Container Apps

**Cost**: ~$10-20/month | **Time**: 25 minutes | **Region**: East US (change as needed)

This guide deploys FocusPot to production using Azure Container Apps + Azure Database for PostgreSQL + Azure Logic Apps (scheduler) + SendGrid (email).

---

## Architecture

```
Internet → Azure Container Apps (Next.js, auto-scaling, HTTPS)
                ↓
         Azure Database for PostgreSQL (managed, encrypted, backed up)
                ↓
         SendGrid / Azure Communication Services (email delivery)

Azure Logic App → calls /api/scheduler/run every 30 minutes
```

---

## Prerequisites

1. **Azure Account** — [azure.microsoft.com](https://azure.microsoft.com) (free tier: $200 credit + 12 months free services)
2. **Azure CLI installed** — `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash` or [installer](https://aka.ms/azure-cli)
3. **Azure CLI logged in** — run `az login`
4. **FocusPot code on GitHub** — already at `github.com/trajectiq-ai/FocusPot`
5. **SendGrid account** (free, 100 emails/day) — for email delivery
6. **Docker installed locally** (for building the image)

---

## Step 1: Create Azure PostgreSQL Database (5 minutes)

### Option A: Using the setup script (recommended)

```bash
cd focuspot
./scripts/setup-azure-db.sh
```

This creates:
- Resource Group `focuspot-rg`
- Azure Database for PostgreSQL Flexible Server (`focuspot-db`)
- Database `focuspot`
- Firewall rule to allow Azure services access
- 32 GB storage, Burstable B1ms SKU

**Save the output** — it contains your `DATABASE_URL`.

### Option B: Using Azure Portal

1. Go to **Azure Portal** → **Create resource** → **Azure Database for PostgreSQL**
2. Select **Flexible Server**
3. Settings:
   - Resource group: Create `focuspot-rg`
   - Server name: `focuspot-db`
   - Region: East US
   - PostgreSQL version: 16
   - Workload type: Development
   - Compute + storage: Burstable B1ms, 32 GB
   - Admin username: `focuspot_admin`
   - Password: (generate strong password)
4. Networking:
   - Connectivity method: **Public access (allowed IP addresses)**
   - Firewall: Allow access from Azure services = **Yes**
5. Click **Review + Create** → wait 3-5 minutes

Your `DATABASE_URL`:
```
postgresql://focuspot_admin:YOUR_PASSWORD@focuspot-db.postgres.database.azure.com:5432/focuspot?schema=public
```

---

## Step 2: Set Up SendGrid for Email (3 minutes)

Azure doesn't have a built-in free email service for transactional emails. **SendGrid** is the Azure-recommended provider and gives 100 free emails/day.

### 2a. Create SendGrid account

1. Go to [sendgrid.com](https://sendgrid.com) → Sign up (free)
2. Verify your sender email: Settings → Sender Authentication → Verify a Single Sender
3. Create an API key: Settings → API Keys → Create API Key → **Restricted Access** → Mail Send
4. **Save the API key** (starts with `SG.`)

Your SMTP settings:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
SMTP_FROM=FocusPot <noreply@yourdomain.com>
```

### 2b. Alternative: Azure Communication Services

If you prefer Azure-native email:
1. Create an **Azure Communication Services** resource
2. Connect an email domain (Azure adds a custom domain)
3. Use ACS SMTP relay with the same `SMTP_HOST`/`SMTP_PORT` pattern
4. ACS gives 3,600 free emails/month (more than SendGrid's free tier)

---

## Step 3: Build and Push Docker Image to Azure Container Registry (5 minutes)

### 3a. Create Azure Container Registry

```bash
# Set variables
RESOURCE_GROUP="focuspot-rg"
ACR_NAME="focuspotacr$(openssl rand -hex 3)"  # must be globally unique, alphanumeric only

# Create registry
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true

echo "ACR Name: $ACR_NAME"
echo "Login server: $ACR_NAME.azurecr.io"
```

### 3b. Login to the registry

```bash
az acr login --name "$ACR_NAME"
```

### 3c. Build and push the Docker image

```bash
# Set your DATABASE_URL so the Dockerfile swaps to PostgreSQL
export DATABASE_URL="postgresql://focuspot_admin:YOUR_PASSWORD@focuspot-db.postgres.database.azure.com:5432/focuspot?schema=public"

# Build the image
docker build -t "$ACR_NAME.azurecr.io/focuspot:latest" .

# Push to Azure Container Registry
docker push "$ACR_NAME.azurecr.io/focuspot:latest"
```

---

## Step 4: Deploy to Azure Container Apps (5 minutes)

### Option A: Using the Bicep template (recommended — Infrastructure as Code)

```bash
# Generate secrets
SESSION_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)

# Deploy using Bicep
az deployment group create \
  --resource-group focuspot-rg \
  --template-file azure-container-apps.bicep \
  --parameters \
    databaseUrl="postgresql://focuspot_admin:YOUR_PASSWORD@focuspot-db.postgres.database.azure.com:5432/focuspot?schema=public" \
    sessionSecret="$SESSION_SECRET" \
    smtpHost="smtp.sendgrid.net" \
    smtpPort="587" \
    smtpUser="apikey" \
    smtpPass="SG.your_sendgrid_key" \
    smtpFrom="FocusPot <noreply@yourdomain.com>" \
    cronSecret="$CRON_SECRET" \
    appUrl="https://focuspot.yourdomain.com"
```

This creates:
- Container Apps Managed Environment
- Log Analytics workspace (monitoring)
- Container App with auto-scaling (1-10 replicas)
- HTTPS endpoint (automatic)
- Health checks at `/api/status`

### Option B: Using Azure Portal

1. Go to **Azure Portal** → **Container Apps** → **Create**
2. **Basics**:
   - Resource group: `focuspot-rg`
   - Container app name: `focuspot`
   - Region: East US
   - Environment: Create new → `focuspot-env`
3. **Container**:
   - Image source: **Azure Container Registry**
   - Registry: your ACR
   - Image: `focuspot:latest`
   - CPU: 1.0, Memory: 2.0 Gi
   - Environment variables (add all):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `apikey` |
| `SMTP_PASS` | Your SendGrid API key |
| `SMTP_FROM` | `FocusPot <noreply@yourdomain.com>` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://focuspot.yourdomain.com` (fill after first deploy) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` |

4. **Ingress**:
   - Enabled: Yes
   - Type: HTTP
   - Target port: 3000
   - External: Yes (public access)
5. **Scale**:
   - Min replicas: 1
   - Max replicas: 10
   - HTTP scaling: 100 concurrent requests
6. Click **Review + Create** → wait 2-3 minutes

### 3c. Get your app URL

```bash
# Get the Container App URL
az containerapp show \
  --name focuspot \
  --resource-group focuspot-rg \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
```

URL will be like: `https://focuspot.env-xxx.eastus.azurecontainerapps.io`

### 3d. Update the App URL env var

```bash
APP_URL=$(az containerapp show --name focuspot --resource-group focuspot-rg --query "properties.configuration.ingress.fqdn" --output tsv)

az containerapp update \
  --name focuspot \
  --resource-group focuspot-rg \
  --set-env-vars NEXT_PUBLIC_APP_URL="https://$APP_URL"
```

---

## Step 5: Run Database Migration (2 minutes)

Push the Prisma schema to your Azure PostgreSQL:

```bash
cd focuspot

# Set your Azure DB connection string
export DATABASE_URL="postgresql://focuspot_admin:YOUR_PASSWORD@focuspot-db.postgres.database.azure.com:5432/focuspot?schema=public"

# Swap schema to PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Generate Prisma client
bun run db:generate

# Push schema to Azure PostgreSQL (creates all 24 tables)
bun run db:push

# Optional: seed demo data
bun run prisma/seed.ts

# Swap back to SQLite for local dev
sed -i 's/provider = "postgresql"/provider = "sqlite"/g' prisma/schema.prisma

echo "✅ Database migration complete!"
```

---

## Step 6: Set Up the Scheduler — Azure Logic App (3 minutes)

The scheduler auto-activates/closes challenges, refreshes stats, and resets streaks. Since Container Apps are serverless, we use an Azure Logic App to call the scheduler endpoint every 30 minutes.

### 6a. Deploy the Logic App

```bash
# Get your Container App URL
APP_URL="https://$(az containerapp show --name focuspot --resource-group focuspot-rg --query 'properties.configuration.ingress.fqdn' --output tsv)"

# Your CRON_SECRET (same one you set in Container App env vars)
CRON_SECRET="your_cron_secret_here"

# Deploy the Logic App
az deployment group create \
  --resource-group focuspot-rg \
  --template-file azure-logic-app-scheduler.json \
  --parameters \
    appUrl="$APP_URL" \
    cronSecret="$CRON_SECRET"
```

### 6b. Verify the scheduler works

Wait 30 minutes, then check:
1. Azure Portal → Logic Apps → `focuspot-scheduler` → **Runs history**
2. You should see successful runs every 30 minutes

Or test manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-container-app-url/api/scheduler/run
```

Response:
```json
{"success": true, "timestamp": "2026-01-15T..."}
```

---

## Step 7: Configure Stripe Webhooks (if using Stripe)

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-container-app-url/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`)
5. Update the Container App:
   ```bash
   az containerapp update \
     --name focuspot \
     --resource-group focuspot-rg \
     --set-env-vars STRIPE_WEBHOOK_SECRET="whsec_your_signing_secret"
   ```

---

## Step 8: Add a Custom Domain (optional, recommended)

### 8a. Using Azure DNS

```bash
# Create DNS zone
az network dns zone create \
  --resource-group focuspot-rg \
  --name yourdomain.com

# Add CNAME record
az network dns record-set cname create \
  --resource-group focuspot-rg \
  --zone-name yourdomain.com \
  --name focuspot \
  --ttl 3600

az network dns record-set cname set-record \
  --resource-group focuspot-rg \
  --zone-name yourdomain.com \
  --record-set-name focuspot \
  --cname your-container-app-fqdn
```

### 8b. Bind custom domain to Container App

```bash
az containerapp hostname add \
  --name focuspot \
  --resource-group focuspot-rg \
  --hostname focuspot.yourdomain.com

# Add managed certificate (free HTTPS)
az containerapp hostname bind \
  --name focuspot \
  --resource-group focuspot-rg \
  --hostname focuspot.yourdomain.com \
  --environment focuspot-env \
  --validation-method CNAME
```

---

## Step 9: Set Up Database Backups

Azure PostgreSQL Flexible Server has automatic backups (7-35 day retention, default 7).

**Configure backup retention:**
```bash
az postgres flexible-server update \
  --name focuspot-db \
  --resource-group focuspot-rg \
  --backup-retention 14  # 14 days
```

**Create a manual backup (point-in-time restore):**
```bash
# Azure automatically supports point-in-time restore to any moment in the retention period
az postgres flexible-server restore \
  --name focuspot-db-restored \
  --source-server focuspot-db \
  --resource-group focuspot-rg \
  --restore-time "2026-01-15T10:00:00Z"
```

---

## Verification Checklist

After deployment, verify:

- [ ] Visit `https://your-container-app-url` — login page loads
- [ ] `https://your-container-app-url/api/status` → `{"status":"ok"}`
- [ ] `https://your-container-app-url/api/health` → database OK, SMTP configured
- [ ] Register a new company → creates in Azure PostgreSQL
- [ ] Employee join code works
- [ ] Create a challenge → appears in admin dashboard
- [ ] Logic App runs every 30 minutes (check Runs history)
- [ ] SendGrid sends emails (check SendGrid dashboard)

---

## Cost Breakdown (East US)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| **Container Apps** | 180,000 vCPU-seconds + 360,000 GiB-seconds/month (free) | ~$5-15/month |
| **Azure PostgreSQL** (B1ms) | $200 Azure credit (first 30 days) | ~$13/month |
| **Azure Container Registry** (Basic) | — | ~$5/month |
| **Log Analytics** | 5 GB/month free | ~$2/GB after |
| **Azure Logic App** | 4,000 executions/month free | $0.000025/execution |
| **SendGrid** | 100 emails/day free | $19.95/month for 50k |
| **Azure DNS** | — | $0.50/zone/month |
| **Managed Certificate** | Free | Free |

**First 30 days**: ~$0 (using $200 free Azure credit)
**Steady state**: ~$25-35/month

---

## Monitoring

### Azure Monitor / Log Analytics

```bash
# View Container App logs
az monitor log-analytics query \
  --workspace "focuspot-logs" \
  --resource-group focuspot-rg \
  --query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'focuspot' | limit 50"
```

### Azure Portal

- **Container Apps** → your app → **Metrics**: Requests, latency, CPU, memory
- **Container Apps** → your app → **Log stream**: Real-time application logs
- **Container Apps** → your app → **Revisions**: Deployment history
- **PostgreSQL** → your server → **Metrics**: Connections, CPU, storage
- **Logic App** → your app → **Runs history**: Scheduler execution history

### Health Endpoints

- `GET /api/status` — liveness (is it running?)
- `HEAD /api/status` — readiness (is DB connected?)
- `GET /api/health` — deep check (DB, SMTP, Stripe, session)

### Set up Alerts

1. Go to **Azure Portal** → **Monitor** → **Alerts** → **New alert rule**
2. Monitor: Container Apps → `5xx` errors > 10 in 5 minutes
3. Monitor: PostgreSQL → `cpu_percent` > 80%
4. Monitor: PostgreSQL → `storage_used` > 90%
5. Action group: Email notification

---

## Troubleshooting

### "Database connection failed"
1. Check `DATABASE_URL` in Container App env vars
2. Verify the PostgreSQL firewall allows Azure services:
   ```bash
   az postgres flexible-server firewall-rule list \
     --name focuspot-db \
     --resource-group focuspot-rg
   ```
3. If no "AllowAzureServices" rule:
   ```bash
   az postgres flexible-server firewall-rule create \
     --name "AllowAzureServices" \
     --server-name focuspot-db \
     --resource-group focuspot-rg \
     --start-ip-address 0.0.0.0 \
     --end-ip-address 0.0.0.0
   ```

### "Container won't start"
1. Check Container App logs:
   ```bash
   az containerapp logs show --name focuspot --resource-group focuspot-rg --follow
   ```
2. Common: missing or incorrect environment variables
3. Check the image was pushed to ACR correctly

### "Emails not sending"
1. Verify SendGrid API key is correct
2. Verify sender email is verified in SendGrid
3. Check Container App logs for SMTP errors
4. Test health endpoint: `curl https://your-url/api/health`

### "Scheduler not running"
1. Azure Portal → Logic Apps → `focuspot-scheduler` → **Runs history**
2. Verify the Logic App is **Enabled**
3. Verify `CRON_SECRET` matches between Logic App and Container App
4. Check if the Container App URL is correct in the Logic App HTTP action

### "Build failed (Docker)"
1. Run `docker build` locally to test
2. Ensure `DATABASE_URL` is set as a build-time environment variable (the Dockerfile swaps SQLite→PostgreSQL when it's present)
3. Check Docker has enough disk space

---

## Updating FocusPot

### Build and push a new image

```bash
# Pull latest code
git pull origin main

# Build new image
docker build -t "$ACR_NAME.azurecr.io/focuspot:latest" .

# Push
docker push "$ACR_NAME.azurecr.io/focuspot:latest"

# Restart the Container App to use the new image
az containerapp revision activate \
  --name focuspot \
  --resource-group focuspot-rg \
  # Or trigger a new revision:
az containerapp update \
  --name focuspot \
  --resource-group focuspot-rg
```

### Auto-deploy with GitHub Actions

The `.github/workflows/deploy-azure.yml` workflow auto-deploys on push to main. To enable:

1. Add these GitHub secrets (Settings → Secrets):
   - `AZURE_CREDENTIALS` — from `az ad sp create-for-rbac --sdk-auth`
   - `ACR_NAME` — your Container Registry name
2. Push to `main` → GitHub Actions builds + pushes the image + restarts the Container App

---

## Scaling

### Vertical (bigger instances)

Update the Container App via Bicep or CLI:
```bash
az containerapp update \
  --name focuspot \
  --resource-group focuspot-rg \
  --cpu 2.0 --memory 4.0Gi
```

### Horizontal (more replicas)

```bash
az containerapp update \
  --name focuspot \
  --resource-group focuspot-rg \
  --min-replicas 2 --max-replicas 20
```

### PostgreSQL scaling

```bash
az postgres flexible-server update \
  --name focuspot-db \
  --resource-group focuspot-rg \
  --sku-name Standard_D2s_v3  # General Purpose 2 vCPU
```

---

## Next Steps

1. **Set up Azure alerts** (see Monitoring section)
2. **Configure custom domain** (Step 8)
3. **Enable GitHub Actions CI/CD** for auto-deploy
4. **Set up Stripe** if charging for subscriptions
5. **Request SendGrid domain verification** for higher email volume

Your FocusPot app is now live on Azure! 🎉
