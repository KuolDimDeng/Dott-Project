# 🚀 Fast Build Instructions - 5-7 Minute Builds

## Current Situation
- Build time: 20 minutes
- Node modules: 1.5GB
- Major culprits: AWS SDK (250MB+), puppeteer (200MB+), duplicate libraries

## Step-by-Step Implementation

### 1. Clean Dependencies (Do this first!)
```bash
# Make the script executable
chmod +x scripts/fast-build-cleanup.sh

# Run the cleanup
./scripts/fast-build-cleanup.sh
```

This will:
- Remove AWS SDK completely (saves 250MB+)
- Remove puppeteer if unused (saves 200MB+)
- Remove duplicate chart/icon libraries
- Clean and dedupe packages

### 2. Test Locally
```bash
# Test the fast build locally
pnpm run build:render-fast
```

### 3. Deploy to Render

#### Option A: Update existing service
1. Go to Render Dashboard → dott-front
2. Update Environment Variables:
   - `NEXT_PRIVATE_STANDALONE` = `true`
   - `NEXT_TELEMETRY_DISABLED` = `1`
   - `NODE_OPTIONS` = `--max-old-space-size=4096`

3. Update Build Command:
   ```
   pnpm install --prod --frozen-lockfile && pnpm run build:render-fast
   ```

4. Update Dockerfile Path:
   ```
   ./Dockerfile.fast
   ```

#### Option B: Create new test service
1. Use `render.yaml.fast` to create a new service
2. Test the build time
3. If successful, update production service

### 4. Monitor Results

Expected improvements:
- **Dependencies**: 1.5GB → ~800MB (47% reduction)
- **Build time**: 20min → 5-7min (65-75% reduction)
- **Memory usage**: Lower and more stable

### 5. Additional Optimizations (if needed)

If still over 7 minutes:

1. **Enable Render Build Cache**:
   - Contact Render support to enable persistent build cache
   - This can save 2-3 minutes on subsequent builds

2. **Remove More Dependencies**:
   ```bash
   # Check usage of heavy deps
   pnpm why @fullcalendar/core
   pnpm why @emotion/react
   pnpm why react-leaflet
   ```

3. **Use CDN for Large Libraries**:
   - Move Stripe, Auth0 SDKs to CDN
   - Load them via script tags instead of bundling

### 6. Rollback Plan

If something breaks:
1. Revert to original Dockerfile
2. Run `pnpm install` to restore all dependencies
3. Use original build command

## Key Changes Made

1. **next.config.render-fast.js**:
   - Turbo mode enabled
   - Aggressive tree shaking
   - Disabled source maps
   - Minimal webpack config

2. **Dockerfile.fast**:
   - Better layer caching
   - Minimal final image
   - Production-only dependencies

3. **Build Script**:
   - Uses experimental turbo
   - Skips type checking
   - Skips linting

## Monitoring Build Performance

Watch for these in Render logs:
- "Creating an optimized production build..."
- "Compiled successfully"
- Total build time at the end

## Success Metrics
✅ Build completes in 5-7 minutes
✅ App loads and functions normally
✅ No missing dependencies errors
✅ Memory usage stays under 4GB