# Render Build Optimization Guide

## Quick Wins for Faster Builds

### 1. Update package.json build script

Replace the current `build:production` script with this optimized version:

```json
"build:production": "NODE_ENV=production NEXT_PUBLIC_API_URL=https://api.dottapps.com BACKEND_API_URL=https://api.dottapps.com USE_DATABASE=true MOCK_DATA_DISABLED=true PROD_MODE=true NODE_OPTIONS=\"--max-old-space-size=3072\" next build",
"build:render": "NODE_ENV=production NODE_OPTIONS=\"--max-old-space-size=3072\" next build -c next.config.render-optimized.js"
```

### 2. Add .renderignore file

Create a `.renderignore` file to exclude unnecessary files from deployment:

```
# Development files
*.log
*.md
.git
.github
.vscode
.idea
*.test.js
*.spec.js
__tests__
__mocks__
coverage
.eslintcache

# Source files not needed in production
src/**/*.stories.js
src/**/*.test.js
scripts/backups

# Large development dependencies
node_modules/puppeteer
node_modules/puppeteer-core
node_modules/@babel
node_modules/@typescript-eslint
node_modules/eslint*
```

### 3. Optimize Dependencies

Move these to devDependencies (they're not used in production):
- puppeteer
- @babel/* packages
- eslint-related packages

Remove unused dependencies:
- aws-sdk (if not using AWS services)
- serverless-http (not needed for Render)

### 4. Use Render's Build Cache

Add to your `render.yaml`:

```yaml
services:
  - type: web
    name: pyfactor-frontend
    env: node
    buildCommand: pnpm install --frozen-lockfile && pnpm run build:render
    startCommand: pnpm run start:render
    envVars:
      - key: NODE_ENV
        value: production
      - key: SKIP_ENV_CHECK
        value: true
    # Enable build caching
    buildFilter:
      paths:
        - package.json
        - pnpm-lock.yaml
        - next.config.render-optimized.js
        - src/**
        - public/**
```

### 5. Create a Minimal Docker Build (Alternative)

If builds are still slow, consider using Docker:

```dockerfile
# Dockerfile.render
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@8.10.0
RUN pnpm install --frozen-lockfile --prefer-offline

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Skip linting and type checking for faster builds
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_CHECK 1

RUN npm install -g pnpm@8.10.0
RUN pnpm run build:render

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

## Expected Improvements

1. **Build Time Reduction**: 30-50% faster builds
   - Removed cache clearing: -2 minutes
   - Reduced memory allocation: -1 minute
   - Disabled console logging: -30 seconds
   - Optimized webpack config: -2 minutes

2. **Bundle Size Reduction**: ~20% smaller
   - Better code splitting
   - Removed unused dependencies
   - Module concatenation

3. **Memory Usage**: 50% less during build
   - From 8GB to 3GB allocation
   - Disabled worker threads
   - Limited CPU usage

## Monitoring Build Performance

Add this script to track build times:

```javascript
// scripts/build-timer.js
const start = Date.now();
process.on('exit', () => {
  const duration = Date.now() - start;
  console.log(`Build completed in ${Math.round(duration / 1000)}s`);
});
```

## Next Steps

1. Test the optimized configuration locally
2. Deploy to a test Render service
3. Compare build times
4. Fine-tune based on results

The most impactful changes are:
- Using the optimized config file
- Removing cache clearing
- Reducing memory allocation
- Enabling SWC minification