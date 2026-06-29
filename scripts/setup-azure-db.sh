#!/bin/bash
# FocusPot — Azure PostgreSQL + Resource Group Setup Script
# Run this on your local machine with Azure CLI installed.
# Creates a Resource Group + Azure Database for PostgreSQL Flexible Server.

set -e

# Configuration
LOCATION="${AZURE_LOCATION:-eastus}"
RESOURCE_GROUP="${RESOURCE_GROUP:-focuspot-rg}"
DB_SERVER="focuspot-db"
DB_NAME="focuspot"
DB_USER="focuspot_admin"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
DB_SKU="${DB_SKU:--B_Standard_B1ms}"  # Burstable B1ms (free-tier eligible, ~$13/mo)

echo "=== FocusPot Azure PostgreSQL Setup ==="
echo "Location: $LOCATION"
echo "Resource Group: $RESOURCE_GROUP"
echo "Server: $DB_SERVER"
echo "Database: $DB_NAME"
echo "SKU: $DB_SKU"
echo ""

# Check if Azure CLI is installed
if ! command -v az &>/dev/null; then
  echo "ERROR: Azure CLI not installed. Install from: https://aka.ms/azure-cli"
  exit 1
fi

# Check if logged in
if ! az account show &>/dev/null; then
  echo "Please login to Azure:"
  az login
fi

# Create resource group
echo "Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output table

# Create PostgreSQL Flexible Server
echo ""
echo "Creating Azure Database for PostgreSQL (this takes 3-5 minutes)..."
az postgres flexible-server create \
  --name "$DB_SERVER" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --admin-user "$DB_USER" \
  --admin-password "$DB_PASSWORD" \
  --sku-name "$DB_SKU" \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --yes \
  --output table

# Create the database
echo ""
echo "Creating database 'focuspot'..."
az postgres flexible-server db create \
  --server-name "$DB_SERVER" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --output table

# Allow Azure services to access the server (for Container Apps)
echo ""
echo "Configuring firewall (allowing Azure services)..."
az postgres flexible-server firewall-rule create \
  --name "AllowAzureServices" \
  --server-name "$DB_SERVER" \
  --resource-group "$RESOURCE_GROUP" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output table 2>/dev/null || true

# Get the server FQDN
SERVER_FQDN=$(az postgres flexible-server show \
  --name "$DB_SERVER" \
  --resource-group "$RESOURCE_GROUP" \
  --query "fullyQualifiedDomainName" \
  --output tsv)

echo ""
echo "============================================"
echo "✅ Azure PostgreSQL created!"
echo "============================================"
echo ""
echo "Server FQDN: $SERVER_FQDN"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "Your DATABASE_URL:"
echo "postgresql://$DB_USER:$DB_PASSWORD@$SERVER_FQDN:5432/$DB_NAME?schema=public"
echo ""
echo "⚠️  Save this password — it won't be shown again."
echo ""
echo "Next: Use this DATABASE_URL when deploying to Container Apps."
