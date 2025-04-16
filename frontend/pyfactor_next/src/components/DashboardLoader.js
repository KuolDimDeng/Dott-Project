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
  const MAX_REDIRECT_ATTEMPTS = 5;
  
  // Add error recovery function
  const recoverFromError = () => {
    // Clear any potential network errors and retry loading
    if (typeof window !== 'undefined') {
      console.log('[DashboardLoader] Attempting to recover from network error');
      // Force a clean reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };
  
  // Helper function to refresh the auth session
  const refreshAuthSession = async () => {
    try {
      console.log('[DashboardLoader] Refreshing auth session');
      // Dynamically import to support SSR
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession({ forceRefresh: true });
      return !!session.tokens?.accessToken;
    } catch (error) {
      console.error('[DashboardLoader] Error refreshing auth session:', error);
      return false;
    }
  };

  // Helper function to set tenant ID in Cognito via API route if needed
  const setTenantAttribute = async (tenantId) => {
    try {
      console.log(`[DashboardLoader] Setting tenant ID in Cognito via API: ${tenantId}`);
      // Add retry logic for network errors
      let retryCount = 0;
      const maxRetries = 3;
      
      const tryFetch = async () => {
        try {
          const response = await fetch('/api/tenant/attribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId }),
            // Increase timeout
            timeout: 10000
          });
          
          if (!response.ok) {
            console.error('[DashboardLoader] Error setting tenant ID in Cognito via API');
          }
          return response;
        } catch (err) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[DashboardLoader] Retrying tenant ID set (${retryCount}/${maxRetries})`);
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
            return tryFetch();
          }
          throw err;
        }
      };
      
      await tryFetch();
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
    const refreshNeeded = getMetaContent('x-auth-refresh-needed') === 'true';
    
    // Check if the current path has auth parameters
    const hasAuthParam = pathname.includes('fromAuth=true') || 
                         pathname.includes('direct=true') || 
                         pathname.includes('retry=');
    
    // Get tenant ID from current path if it's already a tenant URL
    const tenantIdMatch = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
    const pathTenantId = tenantIdMatch ? tenantIdMatch[1] : null;
    
    // Debug info
    console.log('[DashboardLoader] Redirect info:', { 
      shouldRedirect, 
      redirectPath, 
      dashboardError,
      tenantIdMeta,
      pathTenantId,
      hasAuthParam,
      attempts: redirectAttempts,
      currentPath: pathname
    });
    
    // If we're already on a tenant URL with auth parameters, check auth instead of redirecting
    // This prevents redirect loops that can happen post-login
    if (pathTenantId && hasAuthParam && redirectAttempts > 0) {
      console.log('[DashboardLoader] Already on tenant URL with auth params, refreshing auth session');
      
      // Store the tenant ID in Cognito attributes
      setTenantAttribute(pathTenantId);
      
      // Refresh the auth session instead of redirecting
      refreshAuthSession().then(success => {
        if (success) {
          console.log('[DashboardLoader] Auth refreshed successfully, reloading without auth params');
          // Remove auth params from URL to show clean URL
          const cleanPath = pathname.split('?')[0];
          router.replace(cleanPath);
        } else {
          console.log('[DashboardLoader] Auth refresh failed, attempting recovery');
          recoverFromError();
        }
      });
      
      return;
    }
    
    // If we're at max redirect attempts, try to recover instead of giving up
    if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
      setStatus('Too many redirect attempts. Attempting to recover...');
      recoverFromError();
      return;
    }
    
    // If auth refresh is needed, do that first
    if (refreshNeeded) {
      console.log('[DashboardLoader] Auth refresh needed, attempting session refresh');
      refreshAuthSession().then(success => {
        if (success) {
          console.log('[DashboardLoader] Auth refreshed successfully');
          // Reload the current page to apply the refreshed token
          window.location.reload();
        } else {
          console.log('[DashboardLoader] Auth refresh failed, attempting recovery');
          recoverFromError();
        }
      });
      return;
    }
    
    // Handle tenant ID in meta tag for /dashboard path
    if (tenantIdMeta && pathname === '/dashboard') {
      console.log(`[DashboardLoader] Found tenant ID in meta, redirecting directly to tenant URL`);
      setStatus(`Redirecting to tenant dashboard...`);
      
      // Store the tenant ID in Cognito attributes
      setTenantAttribute(tenantIdMeta);
      
      // Navigate to the tenant-specific dashboard with retry parameters
      router.push(`/${tenantIdMeta}/dashboard?direct=true&fromAuth=true&retry=${redirectAttempts}`);
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
        setStatus(`Redirecting to tenant dashboard (${redirectAttempts + 1}/${MAX_REDIRECT_ATTEMPTS})...`);
        
        // Navigate directly, with tenant ID stored in Cognito
        router.push(`${finalPath}${finalPath.includes('?') ? '&' : '?'}retry=${redirectAttempts}`);
        return;
      }
      
      // Handle regular redirects
      if (redirectPath !== pathname) {
        setStatus(`Redirecting to ${redirectPath}...`);
        console.log(`[DashboardLoader] Redirecting to: ${redirectPath}`);
        
        setRedirectAttempts(prev => prev + 1);
        router.push(`${redirectPath}${redirectPath.includes('?') ? '&' : '?'}retry=${redirectAttempts}`);
      }
    }
    
    // Handle dashboard errors
    if (dashboardError) {
      const errorMessage = getMetaContent('x-error-message') || 'Unknown error';
      setStatus(`Error: ${errorMessage}. Attempting to recover...`);
      // Wait a moment, then try to recover
      setTimeout(recoverFromError, 3000);
    }
  }, [router, redirectAttempts, pathname, MAX_REDIRECT_ATTEMPTS]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="space-y-4 flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-primary-main border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-semibold text-gray-800">{status}</h2>
        {redirectAttempts > 0 && (
          <div className="text-sm text-gray-600">
            Redirect attempt: {redirectAttempts}/{MAX_REDIRECT_ATTEMPTS}
          </div>
        )}
        {redirectAttempts >= 3 && (
          <button
            onClick={recoverFromError}
            className="mt-4 px-4 py-2 bg-primary-main text-white rounded hover:bg-primary-dark"
          >
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
} 