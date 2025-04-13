'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Dashboard Loader Component
 * 
 * This component handles client-side redirects based on meta tags
 * and ensures the proper tenant ID is included in the URL.
 * 
 * Note: The message prop is accepted for backward compatibility but is not displayed in the UI.
 */
export default function DashboardLoader({ message = 'Loading your dashboard...' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [status, setStatus] = useState(message);
  
  // Helper function to set tenant ID in Cognito via API route if needed
  const setTenantAttribute = async (tenantId) => {
    try {
      console.log(`[DashboardLoader] Setting tenant ID in Cognito via API: ${tenantId}`);
      const response = await fetch('/api/tenant/attribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      
      if (!response.ok) {
        console.error('[DashboardLoader] Error setting tenant ID in Cognito via API');
      }
    } catch (err) {
      console.error('[DashboardLoader] Failed to set tenant ID in Cognito:', err);
    }
  };
  
  // Handle redirections from meta tags
  useEffect(() => {
    // Safely get meta tag content
    const getMetaContent = (name) => {
      const meta = document.querySelector(`meta[http-equiv="${name}"]`);
      return meta ? meta.content : null;
    };

    // Get all redirect-related meta tags
    const shouldRedirect = getMetaContent('x-should-redirect') === 'true';
    const redirectPath = getMetaContent('x-redirect-path');
    const dashboardError = getMetaContent('x-dashboard-error') === 'true';
    const tenantIdMeta = getMetaContent('x-tenant-id');
    
    // Debug info
    console.log('[DashboardLoader] Redirect info:', { 
      shouldRedirect, 
      redirectPath, 
      dashboardError,
      tenantIdMeta,
      attempts: redirectAttempts,
      currentPath: pathname
    });
    
    // If we're at max redirect attempts, don't try further
    if (redirectAttempts >= 3) {
      setStatus('Too many redirect attempts. Please try refreshing the page.');
      return;
    }
    
    // Handle tenant ID in meta tag for /dashboard path
    if (tenantIdMeta && pathname === '/dashboard') {
      console.log(`[DashboardLoader] Found tenant ID in meta, redirecting directly to tenant URL`);
      setStatus(`Redirecting to tenant dashboard...`);
      
      // Store the tenant ID in Cognito attributes
      setTenantAttribute(tenantIdMeta);
      
      // Navigate to the tenant-specific dashboard
      router.push(`/${tenantIdMeta}/dashboard?direct=true&fromSignIn=true`);
      return;
    }
    
    // Check if we should perform a redirect
    if (shouldRedirect && redirectPath) {
      // Check if we're already at the target path to avoid redirect loops
      if (redirectPath.split('?')[0] === pathname) {
        console.log('[DashboardLoader] Already at target path, not redirecting');
        return;
      }
      
      // Extract tenant ID from redirect path
      let tenantId = null;
      const tenantMatch = redirectPath.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
      
      if (tenantMatch && tenantMatch[1]) {
        tenantId = tenantMatch[1];
        
        // Store the tenant ID in Cognito attributes
        setTenantAttribute(tenantId);
      }
      
      // If we have a tenant ID but it's not in the path, modify the path
      if (tenantId && !tenantMatch && redirectPath.startsWith('/dashboard')) {
        const finalPath = `/${tenantId}${redirectPath}`;
        
        // Avoid redirect loops
        if (finalPath === pathname) {
          console.log('[DashboardLoader] Detected redirect loop, not redirecting');
          return;
        }
        
        // Update redirect counter and status
        setRedirectAttempts(prev => prev + 1);
        setStatus(`Redirecting to tenant dashboard (${redirectAttempts + 1}/3)...`);
        
        // Navigate directly, with tenant ID stored in Cognito
        router.push(finalPath);
        return;
      }
      
      // Handle regular redirects
      if (redirectPath !== pathname) {
        setStatus(`Redirecting to ${redirectPath}...`);
        console.log(`[DashboardLoader] Redirecting to: ${redirectPath}`);
        
        setRedirectAttempts(prev => prev + 1);
        router.push(redirectPath);
      }
    }
    
    // Handle dashboard errors
    if (dashboardError) {
      const errorMessage = getMetaContent('x-error-message') || 'Unknown error';
      setStatus(`Error: ${errorMessage}`);
    }
  }, [router, redirectAttempts, message, pathname]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        
        {redirectAttempts >= 3 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.href = '/dashboard?fromSignIn=true&reset=true'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reset Navigation
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 