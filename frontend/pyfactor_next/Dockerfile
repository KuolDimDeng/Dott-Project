# ========================================
# Stage 1: Base image with pnpm
# Cache bust: 2025-06-23-v2
# ========================================
FROM node:18-alpine AS base
# Install system dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally with specific version for consistency
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate

# ========================================
# Stage 2: Install dependencies
# ========================================
FROM base AS deps
WORKDIR /app

# Copy package files only (for better caching)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for building)
# Using cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ========================================
# Stage 3: Build the application
# ========================================
FROM base AS builder
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy all environment variables that start with NEXT_PUBLIC_ from build environment
# This allows Render to pass them without explicitly declaring each one
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_AUTH0_DOMAIN
ARG NEXT_PUBLIC_AUTH0_CLIENT_ID
ARG NEXT_PUBLIC_AUTH0_AUDIENCE
ARG NEXT_PUBLIC_CRISP_WEBSITE_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PLAID_ENV

# Run the optimized production build
# The build script will use the ARGs passed by Render
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    sh scripts/render-build.sh

# ========================================
# Stage 4: Production runner
# ========================================
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files for production
# Public assets
COPY --from=builder /app/public ./public

# Standalone build output (includes node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static files (JS, CSS, media)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port and hostname for Next.js standalone
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]