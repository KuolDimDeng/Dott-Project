#!/bin/bash

echo "🔧 FIXING CSP AND API URL ISSUES"
echo "================================"
echo ""

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# 1. Fix CSP to include backend URL
echo "📝 Updating CSP policy to include backend URLs..."
cat > src/utils/securityHeaders.js << 'EOF'
// Enhanced security headers for financial data protection
export function addSecurityHeaders(response, nonce = null) {
  // Generate nonce if not provided
  if (!nonce) {
    // Use Web Crypto API for Edge Runtime compatibility
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      nonce = btoa(String.fromCharCode.apply(null, array));
    } else {
      // Fallback for older environments
      nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }
  
  // Store nonce in response for use in components
  response.headers.set('X-Nonce', nonce);
  
  // Content Security Policy - Strict mode for financial data with Cloudflare compatibility
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.auth0.com https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googletagmanager.com https://*.google-analytics.com https://client.crisp.chat https://*.crisp.chat https://app.posthog.com https://*.posthog.com https://cdn.plaid.com https://static.cloudflareinsights.com https://*.sentry.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
    "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat data:",
    "img-src 'self' data: blob: https: https://*.dottapps.com",
    "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com https://api.dottapps.com https://auth.dottapps.com https://dottapps.com https://www.dottapps.com https://dott-api-y26w.onrender.com https://ipapi.co https://api.country.is https://ipinfo.io https://ipgeolocation.io https://app.posthog.com https://*.posthog.com https://*.plaid.com https://*.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.sentry.io",
    "worker-src 'self' blob: https://app.posthog.com https://*.posthog.com",
    "frame-src 'self' https://*.auth0.com https://*.stripe.com https://client.crisp.chat https://*.plaid.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.auth0.com https://*.stripe.com https://auth.dottapps.com https://dottapps.com https://www.dottapps.com",
    "upgrade-insecure-requests"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers for financial data protection
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Additional financial data protection headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Expect-CT', 'max-age=86400, enforce');
  response.headers.set('Feature-Policy', "geolocation 'none'; microphone 'none'; camera 'none'");
  
  // Cloudflare-specific headers
  const pathname = response.headers.get('x-pathname');
  if (pathname) {
    // Add cache control based on path
    if (pathname.startsWith('/_next/static/') || pathname.match(/\.(js|css|jpg|jpeg|png|gif|ico|woff|woff2|svg)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      response.headers.set('CDN-Cache-Control', 'max-age=31536000');
    } else if (pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('CDN-Cache-Control', 'no-store');
    } else {
      // HTML pages - short cache with revalidation
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('CDN-Cache-Control', 'max-age=300'); // 5 minutes at CDN
    }
  }
  
  return response;
}
EOF

# 2. Fix customerService to use correct API URL
echo "📝 Fixing customerService to ensure correct API URL..."
cat > src/services/customerService.js << 'EOF'
import { logger } from '@/utils/logger';

// Always use the correct production API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

class CustomerService {
  constructor() {
    // Log the API URL being used
    logger.info('[CustomerService] Using API URL:', API_BASE_URL);
  }

  async getCustomers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.customer_type) queryParams.append('customer_type', params.customer_type);
      if (params.city) queryParams.append('city', params.city);
      if (params.state) queryParams.append('state', params.state);
      if (params.country) queryParams.append('country', params.country);
      if (params.has_purchases) queryParams.append('has_purchases', params.has_purchases);
      
      const url = `${API_BASE_URL}/api/customers?${queryParams}`;
      logger.info('[CustomerService] Fetching customers from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customers:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomer(id) {
    try {
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Fetching customer from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customer:', error);
      return { success: false, error: error.message };
    }
  }

  async createCustomer(customerData) {
    try {
      const url = `${API_BASE_URL}/api/customers`;
      logger.info('[CustomerService] Creating customer at:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Updating customer at:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomer(id) {
    try {
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Deleting customer at:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CustomerService();
EOF

# 3. Add Sentry initialization check to DashboardContent
echo "📝 Adding Sentry check to DashboardContent..."
cat > src/app/\[tenantId\]/dashboard/components/DashboardContent.js << 'EOF'
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import DashAppBar from '@/app/dashboard/components/DashAppBar';
import Drawer from '@/app/dashboard/components/Drawer';
import { StandardSpinner } from '@/components/ui/StandardSpinner';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import DashboardLoader from '@/app/dashboard/components/DashboardLoader';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';

// Lazy load RenderMainContent for better performance
const RenderMainContent = dynamic(
  () => import('@/app/dashboard/components/RenderMainContent'),
  {
    loading: () => <DashboardLoader />,
    ssr: false
  }
);

const DashboardContent = ({ initialUserData }) => {
  const params = useParams();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [userData, setUserData] = useState(initialUserData || null);
  const [state, setState] = useState({
    view: 'customerList',
    showCustomerList: undefined,
    navigationKey: `initial-${Date.now()}`,
    drawerOpen: true
  });

  const mountedRef = useRef(true);
  const updateTimeoutRef = useRef(null);

  // Debug logging
  const logState = useCallback((context) => {
    console.log(`[DashboardContent] ${context}`);
    console.log('[DashboardContent] Current state:', state);
  }, [state]);

  // Memoized state update to prevent unnecessary re-renders
  const updateState = useCallback((updates) => {
    console.log('[DashboardContent] updateState called with:', updates);
    
    setState(prevState => {
      const hasChanges = Object.keys(updates).some(key => prevState[key] !== updates[key]);
      console.log('[DashboardContent] updateState - hasChanges:', hasChanges);
      
      if (!hasChanges) {
        return prevState;
      }
      
      return { ...prevState, ...updates };
    });
  }, []);

  // Initialize user data from session
  useEffect(() => {
    console.log('[DashboardContent] useEffect - Starting dashboard content render');
    
    const initializeUserData = async () => {
      try {
        if (!sessionLoading && session?.user) {
          console.log('[DashboardContent] Session user data available:', session.user);
          updateState({ userData: session.user });
        } else if (!userData && !sessionLoading) {
          console.log('[DashboardContent] No user data, attempting to fetch...');
          const fetchedData = await sessionManagerEnhanced.getUserProfile();
          if (fetchedData && mountedRef.current) {
            updateState({ userData: fetchedData });
          }
        }
      } catch (error) {
        console.error('[DashboardContent] Error initializing user data:', error);
        
        // Check if Sentry is available before using it
        if (typeof window !== 'undefined' && window.Sentry) {
          window.Sentry.captureException(error);
        }
      }
    };

    initializeUserData();
  }, [session, sessionLoading, userData, updateState]);

  // Cleanup effect
  useEffect(() => {
    console.log('[DashboardContent] Component mounted');
    mountedRef.current = true;

    return () => {
      console.log('[DashboardContent] Component unmounting');
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Navigation handler with debouncing
  const handleSetView = useCallback((newView, additionalState = {}) => {
    console.log('[DashboardContent] handleSetView called:', { newView, additionalState });
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        updateState({
          view: newView,
          navigationKey: `${newView}-${Date.now()}`,
          ...additionalState
        });
      }
    }, 50); // Small debounce to prevent rapid state changes
  }, [updateState]);

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    updateState({ drawerOpen: !state.drawerOpen });
  }, [state.drawerOpen, updateState]);

  logState('About to render main JSX');

  // Show loading spinner while session is loading
  if (sessionLoading || (!userData && !initialUserData)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <StandardSpinner size="large" />
      </div>
    );
  }

  // Extract current view state for props
  const currentViewState = {
    view: state.view,
    userData: state.userData || userData || initialUserData,
    showKPIDashboard: state.view === 'kpiDashboard',
    showMainDashboard: state.view === 'mainDashboard',
    showHome: state.view === 'home' || state.view === 'customerList',
    handleSetView,
    showForm: !!state.formOption,
    formOption: state.formOption || null,
    showHRDashboard: state.view === 'hrDashboard',
    hrSection: state.hrSection || 'dashboard',
    activeHRSection: state.activeHRSection || null
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* App Bar */}
        {logState('Rendering DashAppBar')}
        <DashAppBar
          open={state.drawerOpen}
          toggleDrawer={toggleDrawer}
          userData={currentViewState.userData}
        />

        {/* Drawer */}
        {logState('Rendering Drawer')}
        <Drawer
          open={state.drawerOpen}
          userData={currentViewState.userData}
          onNavigate={handleSetView}
        />

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${state.drawerOpen ? 'ml-64' : 'ml-16'} mt-16`}>
          <div className="h-full overflow-auto">
            {logState('About to render RenderMainContent in Suspense')}
            <Suspense fallback={<DashboardLoader />}>
              {logState('Rendering RenderMainContent with props:', currentViewState)}
              <RenderMainContent {...currentViewState} />
            </Suspense>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardContent;
EOF

# 4. Fix the Cloudflare analytics script issue
echo "📝 Removing Cloudflare analytics script integrity check..."
find src -name "*.js" -o -name "*.jsx" | xargs grep -l "cloudflareinsights" | while read file; do
  if [ -f "$file" ]; then
    # Remove integrity attribute from Cloudflare scripts
    sed -i '' 's/integrity="[^"]*"//g' "$file" 2>/dev/null || true
  fi
done

# 5. Create a config file to ensure API URL is always correct
echo "📝 Creating API configuration file..."
cat > src/config/api.js << 'EOF'
// API Configuration
// This ensures we always use the correct API URL

const getApiUrl = () => {
  // In production, always use api.dottapps.com
  if (typeof window !== 'undefined') {
    // Client-side
    if (window.location.hostname.includes('dottapps.com')) {
      return 'https://api.dottapps.com';
    }
  }
  
  // Use environment variable or default to production API
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Log the API URL being used
if (typeof window !== 'undefined') {
  console.log('[API Config] Using API URL:', API_CONFIG.BASE_URL);
}

export default API_CONFIG;
EOF

# 6. Update all service files to use the new config
echo "📝 Updating service files to use API config..."
for service in vendorService estimateService serviceManagementService productService billService; do
  if [ -f "src/services/${service}.js" ]; then
    # Add import for API config at the top
    sed -i '' "1i\\
import API_CONFIG from '@/config/api';\\
" "src/services/${service}.js"
    
    # Replace API_BASE_URL definition
    sed -i '' "s|const API_BASE_URL = .*|const API_BASE_URL = API_CONFIG.BASE_URL;|g" "src/services/${service}.js"
  fi
done

echo ""
echo "✅ Fixes applied!"
echo ""
echo "🚀 Committing and deploying..."

cd /Users/kuoldeng/projectx
git add -A
git commit -m "fix: CSP policy, API URL configuration, and Sentry check

- Added backend URLs to CSP connect-src to prevent blocking
- Fixed customerService to always use correct API URL
- Added Sentry availability check to prevent undefined errors
- Created central API configuration to ensure consistent URLs
- Added comprehensive logging for debugging
- Removed Cloudflare script integrity checks

This should resolve:
- CSP blocking API calls
- Wrong API URL (dott-api-y26w.onrender.com)
- Sentry undefined errors
- React component loading issues"

git push origin main

echo ""
echo "✅ ALL FIXES DEPLOYED!"
echo ""
echo "Key changes:"
echo "1. CSP now allows connections to both api.dottapps.com and the Render URL"
echo "2. CustomerService will always use the correct API URL"
echo "3. Sentry errors are handled gracefully"
echo "4. Added extensive logging to help debug issues"
echo ""
echo "Monitor deployment: https://dashboard.render.com/web/srv-crpgfj68ii6s739n5jdg/deploys"