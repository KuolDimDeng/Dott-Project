# Multi-stage build with advanced caching
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@8.10.0

# Dependencies stage with cache mount
FROM base AS deps
# Mount pnpm store as cache
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm config set store-dir /pnpm/store
# Copy only package files for better caching
COPY frontend/pyfactor_next/package.json frontend/pyfactor_next/pnpm-lock.yaml ./
COPY frontend/pyfactor_next/.npmrc* ./
# Install dependencies with cache
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline

# Build stage with optimizations
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source files
COPY frontend/pyfactor_next/ .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true
# Limit memory usage during build
ENV NODE_OPTIONS="--max-old-space-size=3072"

# Build arguments
ARG NEXT_PUBLIC_API_URL=https://api.dottapps.com
ARG NEXT_PUBLIC_BASE_URL=https://dottapps.com
ARG NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
ARG NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
ARG NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
ARG AUTH0_SECRET
ARG AUTH0_BASE_URL=https://dottapps.com
ARG AUTH0_ISSUER_BASE_URL=https://dev-cbyy63jovi6zrcos.us.auth0.com
ARG AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_AUDIENCE=https://api.dottapps.com
ARG AUTH0_SCOPE="openid profile email"
ARG NEXT_PUBLIC_CRISP_WEBSITE_ID

# Build with cache mount for Next.js cache
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    pnpm run build:render

# Production stage - minimal size
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files for standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]