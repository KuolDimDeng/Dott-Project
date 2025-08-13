#!/bin/bash

# Fix Staging Frontend Errors
# This script fixes Auth0, Cloudflare, and React hydration issues

echo "========================================="
echo "Fixing Staging Frontend Configuration"
echo "========================================="
echo ""

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# 1. Fix CSP to allow Cloudflare Analytics without integrity check
echo "Step 1: Updating CSP configuration..."
cat > src/utils/staging-csp-patch.js << 'EOF'
// Staging-specific CSP adjustments
export function getStaging CSPAdjustments(csp) {
  // Remove integrity checks for Cloudflare Analytics in staging
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') {
    // Allow Cloudflare Analytics without hash validation
    csp = csp.replace(
      "'unsafe-inline'",
      "'unsafe-inline' 'unsafe-hashes'"
    );
  }
  return csp;
}
EOF

# 2. Create environment check component
echo "Step 2: Creating environment-aware components..."
cat > src/components/StagingBanner.js << 'EOF'
'use client';

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'staging') {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
      ⚠️ STAGING ENVIRONMENT - Test Data Only
    </div>
  );
}
EOF

# 3. Fix Auth0 configuration
echo "Step 3: Creating Auth0 staging configuration..."
cat > src/config/auth-staging.js << 'EOF'
// Staging-specific Auth0 configuration
export const stagingAuth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
  audience: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' 
    ? 'https://api-staging.dottapps.com'
    : process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  redirectUri: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'
    ? 'https://staging.dottapps.com/api/auth/callback'
    : typeof window !== 'undefined' ? window.location.origin + '/api/auth/callback' : '',
  scope: 'openid profile email'
};
EOF

# 4. Fix PostHog configuration
echo "Step 4: Fixing PostHog configuration..."
cat > src/providers/posthog-staging.js << 'EOF'
'use client';

import { useEffect } from 'react';

export function PostHogStagingProvider({ children }) {
  useEffect(() => {
    // Disable PostHog in staging if no key provided
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' && 
        !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.log('[PostHog] Disabled in staging environment');
      window.posthog = {
        capture: () => {},
        identify: () => {},
        reset: () => {},
        // Add other PostHog methods as no-ops
      };
    }
  }, []);

  return children;
}
EOF

# 5. Create .env.staging.local for testing
echo "Step 5: Creating staging environment file..."
cat > .env.staging.local << 'EOF'
# Staging Environment Variables
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SHOW_STAGING_BANNER=true

# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api-staging.dottapps.com

# API URLs
NEXT_PUBLIC_API_URL=https://dott-api-staging.onrender.com
NEXT_PUBLIC_BASE_URL=https://staging.dottapps.com
NEXT_PUBLIC_BACKEND_URL=https://dott-api-staging.onrender.com

# Disable analytics in staging
NEXT_PUBLIC_DISABLE_CLOUDFLARE_ANALYTICS=true
NEXT_PUBLIC_POSTHOG_KEY=
EOF

# 6. Fix React hydration issues
echo "Step 6: Creating hydration-safe wrapper..."
cat > src/components/HydrationSafeWrapper.js << 'EOF'
'use client';

import { useState, useEffect } from 'react';

export default function HydrationSafeWrapper({ children, fallback = null }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return fallback || <div className="min-h-screen" />;
  }

  return children;
}
EOF

echo ""
echo "========================================="
echo "✅ Fixes Applied!"
echo "========================================="
echo ""
echo "Now you need to:"
echo ""
echo "1. UPDATE AUTH0 DASHBOARD:"
echo "   - Add staging URLs to Allowed Callbacks, Logout URLs, and CORS"
echo "   - URLs to add:"
echo "     • https://staging.dottapps.com/api/auth/callback"
echo "     • https://staging.dottapps.com"
echo "     • https://dott-api-staging.onrender.com"
echo ""
echo "2. UPDATE RENDER ENVIRONMENT VARIABLES:"
echo "   - Go to dott-staging service in Render"
echo "   - Add all variables from .env.staging.local"
echo "   - Add AUTH0_SECRET (generate random 32 chars)"
echo "   - Add AUTH0_CLIENT_SECRET (from Auth0 dashboard)"
echo ""
echo "3. REDEPLOY:"
echo "   - Push changes to staging branch"
echo "   - Trigger manual deploy in Render"
echo ""
echo "4. CLOUDFLARE (Optional):"
echo "   - Consider setting staging.dottapps.com to DNS-only mode"
echo "   - This will disable Cloudflare's script injection"
echo ""
echo "Files created/modified:"
echo "  ✓ src/utils/staging-csp-patch.js"
echo "  ✓ src/components/StagingBanner.js"
echo "  ✓ src/config/auth-staging.js"
echo "  ✓ src/providers/posthog-staging.js"
echo "  ✓ src/components/HydrationSafeWrapper.js"
echo "  ✓ .env.staging.local"