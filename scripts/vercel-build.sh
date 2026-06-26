#!/bin/bash
# FocusPot — Vercel Build Script
# Runs before the Next.js build on Vercel.
# Swaps the Prisma provider from SQLite to PostgreSQL (for production),
# generates the Prisma client, and pushes the schema to the database.

set -e

echo "=== FocusPot Vercel Build ==="

# Only swap to PostgreSQL if DATABASE_URL is set to a postgresql URL
if [[ "$DATABASE_URL" == postgresql://* ]]; then
  echo "PostgreSQL DATABASE_URL detected — switching schema provider..."
  
  # Swap provider from sqlite to postgresql
  sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
  
  echo "Schema provider set to: $(grep 'provider = ' prisma/schema.prisma | head -1)"
  
  # Generate Prisma client with PostgreSQL
  echo "Generating Prisma client..."
  bun run db:generate
  
  # Push schema to PostgreSQL database
  echo "Pushing schema to database..."
  bun run db:push --accept-data-loss 2>&1 || echo "db:push warning (may already be in sync)"
  
  echo "PostgreSQL setup complete."
else
  echo "No PostgreSQL DATABASE_URL — keeping SQLite for local dev."
  echo "DATABASE_URL: ${DATABASE_URL:0:20}..."
fi

echo "=== Build script complete ==="
