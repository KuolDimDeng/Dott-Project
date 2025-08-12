# Fix Staging Frontend Build Error

## Issue
The staging frontend build is failing because the Dockerfile path is incorrect.

## Solution

### Option 1: Update in Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on `dott-staging` service
3. Go to "Settings" tab
4. Scroll to "Build & Deploy" section
5. Update the following:
   - **Dockerfile Path**: `./Dockerfile.staging`
   - **Docker Build Context Directory**: `.` (repository root)
6. Click "Save Changes"
7. Trigger a manual deploy

### Option 2: Use Updated Dockerfile

The new `Dockerfile.staging` has been created with the correct paths:
- Builds from repository root
- Correctly references `frontend/pyfactor_next` directory
- Includes staging-specific environment variables

### Option 3: Alternative - Use Build Commands Instead of Docker

If Docker continues to fail, you can switch to using build commands:

1. In Render Dashboard, go to `dott-staging` service
2. Change from Docker to "Node" environment
3. Set:
   - **Root Directory**: `frontend/pyfactor_next`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

## Environment Variables to Verify

Make sure these are set in Render for staging:
```
NEXT_PUBLIC_API_URL=https://dott-api-staging.onrender.com
NEXT_PUBLIC_BASE_URL=https://staging.dottapps.com
NEXT_PUBLIC_BACKEND_URL=https://dott-api-staging.onrender.com
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SHOW_STAGING_BANNER=true
NODE_OPTIONS=--max-old-space-size=3584
```

## Build Command Alternative

If you switch to non-Docker build:
```bash
# Build command
pnpm install --frozen-lockfile && NODE_OPTIONS="--max-old-space-size=3584" pnpm build

# Start command  
NODE_ENV=production pnpm start
```