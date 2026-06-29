// FocusPot — Azure Container Apps Infrastructure (Bicep)
// Deploys: Container App + Managed Environment + Container Registry
// Prerequisites: Azure CLI, an existing Resource Group, and an existing Azure Database for PostgreSQL
//
// Deploy with:
//   az deployment group create \
//     --resource-group focuspot-rg \
//     --template-file azure-container-apps.bicep \
//     --parameters \
//       databaseUrl='postgresql://focuspot:PASSWORD@focuspot-db.postgres.database.azure.com:5432/focuspot' \
//       sessionSecret='YOUR_64_CHAR_HEX_SECRET' \
//       smtpHost='smtp.sendgrid.net' smtpUser='apikey' smtpPass='YOUR_SENDGRID_KEY' \
//       cronSecret='YOUR_64_CHAR_HEX_SECRET' \
//       appUrl='https://focuspot.yourdomain.com'

@description('Name of the Container App')
param containerAppName string = 'focuspot'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Azure Container Registry name (must be globally unique, alphanumeric only)')
param acrName string = 'focuspotacr${uniqueString(resourceGroup().id)}'

@description('Database connection string (PostgreSQL)')
@secure()
param databaseUrl string

@description('Session signing secret (openssl rand -hex 32)')
@secure()
param sessionSecret string

@description('SMTP host for email delivery')
param smtpHost string = ''

@description('SMTP port')
param smtpPort string = '587'

@description('SMTP username')
param smtpUser string = ''

@description('SMTP password')
@secure()
param smtpPass string = ''

@description('From email address')
param smtpFrom string = 'FocusPot <noreply@focuspot.io>'

@description('Stripe secret key')
@secure()
param stripeSecretKey string = ''

@description('Stripe webhook secret')
@secure()
param stripeWebhookSecret string = ''

@description('Cron scheduler secret (openssl rand -hex 32)')
@secure()
param cronSecret string = ''

@description('Public app URL')
param appUrl string = ''

// ============================================================
// Container Registry
// ============================================================
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// ============================================================
// Managed Environment (Container Apps Environment)
// ============================================================
resource env 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${containerAppName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Log Analytics for monitoring
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${containerAppName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================================
// Container App
// ============================================================
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.name
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'session-secret'
          value: sessionSecret
        }
        {
          name: 'smtp-host'
          value: smtpHost
        }
        {
          name: 'smtp-port'
          value: smtpPort
        }
        {
          name: 'smtp-user'
          value: smtpUser
        }
        {
          name: 'smtp-pass'
          value: smtpPass
        }
        {
          name: 'smtp-from'
          value: smtpFrom
        }
        {
          name: 'stripe-secret-key'
          value: stripeSecretKey
        }
        {
          name: 'stripe-webhook-secret'
          value: stripeWebhookSecret
        }
        {
          name: 'cron-secret'
          value: cronSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: '${acr.properties.loginServer}/focuspot:latest'
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'HOSTNAME', value: '0.0.0.0' }
            { name: 'NEXT_TELEMETRY_DISABLED', value: '1' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'SESSION_SECRET', secretRef: 'session-secret' }
            { name: 'SMTP_HOST', secretRef: 'smtp-host' }
            { name: 'SMTP_PORT', secretRef: 'smtp-port' }
            { name: 'SMTP_USER', secretRef: 'smtp-user' }
            { name: 'SMTP_PASS', secretRef: 'smtp-pass' }
            { name: 'SMTP_FROM', secretRef: 'smtp-from' }
            { name: 'STRIPE_SECRET_KEY', secretRef: 'stripe-secret-key' }
            { name: 'STRIPE_WEBHOOK_SECRET', secretRef: 'stripe-webhook-secret' }
            { name: 'CRON_SECRET', secretRef: 'cron-secret' }
            { name: 'NEXT_PUBLIC_APP_URL', value: appUrl }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/status'
                port: 3000
              }
              period: 30
              timeout: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            custom: {
              type: 'http'
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// Output the app URL
output appUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output acrLoginServer string = acr.properties.loginServer
output logAnalyticsWorkspace string = logAnalytics.name
