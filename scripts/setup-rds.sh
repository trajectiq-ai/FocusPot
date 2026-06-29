#!/bin/bash
# FocusPot — RDS PostgreSQL Setup Script
# Run this on your local machine with AWS CLI configured.
# Creates an RDS PostgreSQL instance for FocusPot.

set -e

# Configuration — change these to match your setup
REGION="${AWS_REGION:-us-east-1}"
DB_INSTANCE_ID="focuspot-db"
DB_NAME="focuspot"
DB_USER="focuspot"
DB_PASSWORD="${RDS_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
DB_INSTANCE_CLASS="db.t4g.micro"  # Free tier eligible (750 hrs/month for 12 months)
DB_ALLOCATED_STORAGE=20            # 20 GB (free tier)
VPC_SECURITY_GROUP="${VPC_SECURITY_GROUP:-}"
SUBNET_GROUP="${SUBNET_GROUP:-}"

echo "=== FocusPot RDS PostgreSQL Setup ==="
echo "Region: $REGION"
echo "Instance ID: $DB_INSTANCE_ID"
echo "Database: $DB_NAME"
echo "Instance class: $DB_INSTANCE_CLASS (free tier eligible)"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
  echo "ERROR: AWS CLI not configured. Run 'aws configure' first."
  exit 1
fi

# Create security group for RDS if not provided
if [ -z "$VPC_SECURITY_GROUP" ]; then
  echo "Creating security group for RDS..."
  VPC_SECURITY_GROUP=$(aws ec2 create-security-group \
    --group-name "focuspot-rds-sg" \
    --description "FocusPot RDS PostgreSQL security group" \
    --query 'GroupId' --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --group-names "focuspot-rds-sg" \
    --query 'SecurityGroups[0].GroupId' --output text)

  # Allow PostgreSQL access from anywhere (tighten this in production!)
  aws ec2 authorize-security-group-ingress \
    --group-id "$VPC_SECURITY_GROUP" \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 2>/dev/null || true

  echo "Security group created: $VPC_SECURITY_GROUP"
fi

# Create subnet group if not provided
if [ -z "$SUBNET_GROUP" ]; then
  echo "Creating DB subnet group..."
  # Get default VPC subnets
  SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=default-for-az,Values=true" \
    --query 'Subnets[*].SubnetId' --output text | tr '\t' ',' | sed 's/,$//')

  if [ -n "$SUBNETS" ]; then
    aws rds create-db-subnet-group \
      --db-subnet-group-name "focuspot-subnet-group" \
      --db-subnet-group-description "FocusPot DB subnet group" \
      --subnet-ids $SUBNETS 2>/dev/null || true
    SUBNET_GROUP="focuspot-subnet-group"
  fi
fi

# Create RDS instance
echo ""
echo "Creating RDS PostgreSQL instance (this takes 5-10 minutes)..."
aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class "$DB_INSTANCE_CLASS" \
  --engine postgres \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage "$DB_ALLOCATED_STORAGE" \
  --db-name "$DB_NAME" \
  --vpc-security-group-ids "$VPC_SECURITY_GROUP" \
  --db-subnet-group-name "$SUBNET_GROUP" \
  --backup-retention-period 7 \
  --storage-encrypted \
  --no-publicly-accessible \
  --region "$REGION"

echo ""
echo "Waiting for RDS instance to become available..."
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION"

# Get the endpoint
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region "$REGION")

echo ""
echo "============================================"
echo "✅ RDS PostgreSQL instance created!"
echo "============================================"
echo ""
echo "Database endpoint: $ENDPOINT"
echo "Database name: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "Your DATABASE_URL for App Runner:"
echo "postgresql://$DB_USER:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME?schema=public"
echo ""
echo "⚠️  Save this password — it won't be shown again."
echo ""
echo "Next: Add this DATABASE_URL to your App Runner environment variables."
