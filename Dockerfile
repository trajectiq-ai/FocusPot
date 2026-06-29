# FocusPot — Multi-stage production Dockerfile
# Builds a minimal standalone Next.js server with the scheduler

# ===== Stage 1: Dependencies =====
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package manifests
COPY package.json bun.lockb* ./
COPY prisma ./prisma

# Install dependencies
RUN bun install --frozen-lockfile

# ===== Stage 2: Build =====
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js standalone output
RUN bun run build

# ===== Stage 3: Production =====
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

# Copy the scheduler mini-service
COPY --from=builder /app/mini-services ./mini-services

# Copy the backup script
COPY --from=builder /app/scripts ./scripts

# Create data directory for SQLite (if used) and logs
RUN mkdir -p /app/data /app/logs && chown nextjs:nodejs /app/data /app/logs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the Next.js server
CMD ["bun", "server.js"]
