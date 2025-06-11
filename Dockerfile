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

# Copy production env file for build
COPY frontend/pyfactor_next/.env.production ./.env.production

# Build the application with standalone output
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV BUILD_STANDALONE true

# Set build-time environment variables for Auth0
# These are required for the build to succeed
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

# Convert ARGs to ENVs for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID
ENV NEXT_PUBLIC_AUTH0_AUDIENCE=$NEXT_PUBLIC_AUTH0_AUDIENCE
ENV AUTH0_SECRET=$AUTH0_SECRET
ENV AUTH0_BASE_URL=$AUTH0_BASE_URL
ENV AUTH0_ISSUER_BASE_URL=$AUTH0_ISSUER_BASE_URL
ENV AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID
ENV AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET
ENV AUTH0_AUDIENCE=$AUTH0_AUDIENCE
ENV AUTH0_SCOPE=$AUTH0_SCOPE
ENV NEXT_PUBLIC_CRISP_WEBSITE_ID=$NEXT_PUBLIC_CRISP_WEBSITE_ID

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