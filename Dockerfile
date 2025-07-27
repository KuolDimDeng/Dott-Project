# Multi-stage build with advanced caching
FROM node:18-alpine AS base
# Add cache bust to force fresh builds when needed
ARG CACHEBUST=1
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@8.10.0

# Dependencies stage with cache mount
FROM base AS deps
# Configure pnpm store directory
RUN pnpm config set store-dir /pnpm/store
# Copy only package files for better caching
COPY frontend/pyfactor_next/package.json frontend/pyfactor_next/pnpm-lock.yaml ./
# Install dependencies
RUN pnpm install --frozen-lockfile

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
# Use 3.5GB for build (leaving 0.5GB for system)
ENV NODE_OPTIONS="--max-old-space-size=3584"

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
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

# Convert ARGs to ENVs for Next.js build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID
ENV NEXT_PUBLIC_AUTH0_AUDIENCE=$NEXT_PUBLIC_AUTH0_AUDIENCE
ENV NEXT_PUBLIC_CRISP_WEBSITE_ID=$NEXT_PUBLIC_CRISP_WEBSITE_ID
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Build with cache mount and memory optimizations
# Split build into stages to reduce memory pressure
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    --mount=type=cache,id=webpack,target=/app/node_modules/.cache \
    rm -rf .next/cache/webpack && \
    NODE_OPTIONS="--max-old-space-size=3584" \
    NEXT_TELEMETRY_DISABLED=1 \
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