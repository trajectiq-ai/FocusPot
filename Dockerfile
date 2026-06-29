# FocusPot — Multi-stage production Dockerfile
# Compatible with AWS App Runner, ECS, and standard Docker deployments.

# ===== Stage 1: Dependencies =====
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lockb* ./
COPY prisma ./prisma

RUN bun install --frozen-lockfile

# ===== Stage 2: Build =====
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Swap to PostgreSQL if DATABASE_URL is set to a postgresql URL (for AWS RDS)
# Otherwise keep SQLite for local development
RUN if [[ "$DATABASE_URL" == postgresql://* ]]; then \
      sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma && \
      echo "Schema provider set to postgresql"; \
    else \
      echo "Keeping SQLite for local dev"; \
    fi

# Generate Prisma client
RUN bun run db:generate

# Build the Next.js standalone output
RUN bun run build

# ===== Stage 3: Production =====
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for database migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy the scheduler and scripts
COPY --from=builder /app/mini-services ./mini-services
COPY --from=builder /app/scripts ./scripts

# Create data and logs directories
RUN mkdir -p /app/data /app/logs && chown nextjs:nodejs /app/data /app/logs

USER nextjs

EXPOSE 3000

# Health check — AWS App Runner uses this
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the Next.js server
CMD ["bun", "server.js"]
