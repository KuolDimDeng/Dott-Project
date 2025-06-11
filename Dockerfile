# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8.10.0

# Copy package files
COPY frontend/pyfactor_next/package.json ./
COPY frontend/pyfactor_next/pnpm-lock.yaml ./
# Copy .npmrc if it exists
COPY frontend/pyfactor_next/.npmrc ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.10.0

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/pyfactor_next/ .

# Build the application with standalone output
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV BUILD_STANDALONE true

# Use the standard build command that enables standalone
RUN pnpm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install pnpm in production image too
RUN npm install -g pnpm@8.10.0

# Copy necessary files for standalone mode
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# Ensure proper permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use node to run the standalone server
CMD ["node", "server.js"]