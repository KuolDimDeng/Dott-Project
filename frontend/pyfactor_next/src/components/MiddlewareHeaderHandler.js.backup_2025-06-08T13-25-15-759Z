'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/clientLogger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';

/**
 * Middleware Header Handler Component
 * 
 * This component handles redirection based on meta tags set by middleware.
 */
export default function MiddlewareHeaderHandler() {
  const router = useRouter();
  
  useEffect(() => {
    const captureAndHandleAuthRedirection = async () => {
      // Check for auth response in URL
      const url = new URL(window.location);
      const isAuthResponse = url.pathname === '/dashboard' && 
                           (url.searchParams.get('fromAuth') === 'true' || 
                            url.searchParams.get('fromSignIn') === 'true');
      
      // If this is an auth response, try to get tenant ID and redirect
      if (isAuthResponse) {
        logger.info('[MiddlewareHeaderHandler] Detected auth response, checking for tenant ID');
        
        try {
          // Check if we have a tenant ID in Cognito
          const tenantId = await getTenantIdFromCognito();
          
          // If we already have a tenant ID in Cognito, redirect to tenant URL
          if (tenantId) {
            logger.info(`[MiddlewareHeaderHandler] Found tenant ID after auth: ${tenantId}`);
            
            // Get all current URL parameters
            const params = {};
            url.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            
            // Add direct=true to prevent loops
            params.direct = 'true';
            
            // Build query string
            const queryString = Object.entries(params)
              .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
              .join('&');
            
            // Redirect to tenant-specific dashboard with direct=true
            const tenantUrl = `/${tenantId}/dashboard${queryString ? `?${queryString}` : ''}`;
            logger.info(`[MiddlewareHeaderHandler] Redirecting to tenant URL after auth: ${tenantUrl}`);
            
            // Perform the redirect after a short delay
            setTimeout(() => {
              window.location.href = tenantUrl;
            }, 100);
            
            return;
          }
        } catch (error) {
          logger.error('[MiddlewareHeaderHandler] Error checking tenant ID from Cognito:', error);
        }
      }
      
      // Process meta tags if not handling auth redirection
      const metaTags = document.querySelectorAll('meta[http-equiv^="x-"]');
      
      // Process meta tags
      const headers = {};
      metaTags.forEach(meta => {
        const key = meta.getAttribute('http-equiv');
        const value = meta.getAttribute('content');
        headers[key] = value;
        logger.info(`[MiddlewareHeaderHandler] Found meta tag: ${key} = ${value}`);
      });
      
      // Handle redirect reset
      if (headers['x-reset-navigation'] === 'true') {
        logger.info('[MiddlewareHeaderHandler] Resetting navigation state');
        
        // Clear localStorage redirect markers
        localStorage.removeItem('lastRedirect');
        localStorage.removeItem('redirectAttempts');
        
        try {
          // Try to get the tenant ID from Cognito
          const tenantId = await getTenantIdFromCognito();
          
          // Delay slightly to ensure state is cleared
          setTimeout(() => {
            if (tenantId) {
              // If we have a tenant ID, redirect to tenant-specific dashboard
              window.location.href = `/${tenantId}/dashboard?direct=true&fromSignIn=true`;
            } else {
              window.location.href = '/dashboard?fromSignIn=true';
            }
          }, 500);
        } catch (error) {
          logger.error('[MiddlewareHeaderHandler] Error getting tenant ID during reset:', error);
          window.location.href = '/dashboard?fromSignIn=true';
        }
        
        return;
      }
      
      // Handle redirection to tenant-specific dashboard
      const shouldRedirect = headers['x-should-redirect'] === 'true';
      const redirectPath = headers['x-redirect-path'];
      
      // If tenant ID is in meta tag, store it in Cognito
      if (headers['x-tenant-id']) {
        const tenantId = headers['x-tenant-id'];
        if (tenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
          logger.info(`[MiddlewareHeaderHandler] Storing tenant ID in Cognito: ${tenantId}`);
          try {
            await updateTenantIdInCognito(tenantId);
          } catch (error) {
            logger.error('[MiddlewareHeaderHandler] Error storing tenant ID in Cognito:', error);
          }
        }
      }
      
      // Don't redirect if we're at the same path
      if (shouldRedirect && redirectPath && window.location.pathname !== redirectPath.split('?')[0]) {
        logger.info(`[MiddlewareHeaderHandler] Should redirect to: ${redirectPath}`);
        
        try {
          // Try to get tenant ID from Cognito
          const tenantId = await getTenantIdFromCognito();
          
          // Check if redirectPath includes tenant ID
          const pathHasTenant = redirectPath.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
          
          if (tenantId && !pathHasTenant && redirectPath.startsWith('/dashboard')) {
            // If we have a tenant ID but it's not in the path, add it
            const finalPath = `/${tenantId}/dashboard?direct=true&fromSignIn=true`;
            logger.info(`[MiddlewareHeaderHandler] Adding tenant ID to path: ${finalPath}`);
            window.location.href = finalPath;
            return;
          }
          
          // Track the current redirect path to detect loops
          const lastRedirect = localStorage.getItem('lastRedirect');
          let redirectAttempts = parseInt(localStorage.getItem('redirectAttempts') || '0');
          
          // Check for redirect loops
          if (lastRedirect === redirectPath) {
            redirectAttempts++;
            localStorage.setItem('redirectAttempts', redirectAttempts.toString());
            
            // If we detect a loop, break it
            if (redirectAttempts >= 2) {
              logger.warn('[MiddlewareHeaderHandler] Detected redirect loop, breaking cycle');
              
              // Clear redirect attempts
              localStorage.removeItem('lastRedirect');
              localStorage.removeItem('redirectAttempts');
              
              // Extract tenant ID to force direct navigation
              const tenantMatch = redirectPath.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
              if (tenantMatch && tenantMatch[1]) {
                const tenantId = tenantMatch[1];
                window.location.href = `/${tenantId}/dashboard?direct=true&fromSignIn=true`;
              } else if (tenantId) {
                // Use the tenant ID from Cognito if available
                window.location.href = `/${tenantId}/dashboard?direct=true&fromSignIn=true`;
              } else {
                // If no tenant ID, go to dashboard with fromSignIn=true
                window.location.href = '/dashboard?fromSignIn=true&reset=true';
              }
              
              return;
            }
          } else {
            // New redirect path, reset attempts
            redirectAttempts = 1;
            localStorage.setItem('redirectAttempts', '1');
          }
          
          // Store the current redirect path
          localStorage.setItem('lastRedirect', redirectPath);
          
          // Perform the redirect
          if (redirectPath) {
            window.location.href = redirectPath;
          }
        } catch (error) {
          logger.error('[MiddlewareHeaderHandler] Error during redirection:', error);
          // In case of error, still try to redirect
          if (redirectPath) {
            window.location.href = redirectPath;
          }
        }
      }
    };
    
    captureAndHandleAuthRedirection();
  }, [router]);
  
  // This component doesn't render anything
  return null;
} 