/**
 * Utilities for safely handling searchParams in Next.js 15
 * Provides resilient functions to access query parameters without awaited errors
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { logger } from './logger';

/**
 * Custom hook that provides safe access to search params with fallbacks to Cognito attributes
 * @returns {Object} searchParams - The search params with additional helper methods
 */
export function useSafeSearchParams() {
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const [params, setParams] = useState({});
  
  useEffect(() => {
    // Initialize params object with values from URL
    const initParams = async () => {
      try {
        // Extract search params into a plain object
        const urlParams = {};
        if (searchParams) {
          searchParams.forEach((value, key) => {
            urlParams[key] = value;
          });
        }
        
        // Detect if we're dealing with tenant-specific parameters
        if (urlParams.tenantId || window.location.pathname.includes('/dashboard')) {
          try {
            // Try to get tenant ID from the URL path if not in search params
            if (!urlParams.tenantId) {
              const pathMatch = window.location.pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
              if (pathMatch && pathMatch[1]) {
                urlParams.tenantId = pathMatch[1];
                logger.debug('[SafeSearchParams] Found tenant ID in URL path:', pathMatch[1]);
              }
            }
            
            // If still no tenant ID, try to get it from Cognito
            if (!urlParams.tenantId) {
              try {
                const { fetchUserAttributes } = await import('@/config/amplifyUnified');
                const userAttributes = await fetchUserAttributes();
                const cognitoTenantId = userAttributes['custom:tenant_ID'] || userAttributes['custom:businessid'];
                
                if (cognitoTenantId) {
                  urlParams.tenantId = cognitoTenantId;
                  logger.debug('[SafeSearchParams] Using tenant ID from Cognito:', cognitoTenantId);
                }
              } catch (cognitoError) {
                logger.warn('[SafeSearchParams] Could not get tenant ID from Cognito:', cognitoError);
              }
            }
            
            // If we still don't have a tenant ID, try the fallback API
            if (!urlParams.tenantId) {
              try {
                const response = await fetch('/api/tenant/fallback');
                if (response.ok) {
                  const data = await response.json();
                  if (data.success && data.tenantId) {
                    urlParams.tenantId = data.tenantId;
                    logger.debug('[SafeSearchParams] Using tenant ID from fallback API:', data.tenantId);
                  }
                }
              } catch (apiError) {
                logger.warn('[SafeSearchParams] Error from fallback API:', apiError);
              }
            }
          } catch (tenantError) {
            logger.error('[SafeSearchParams] Error getting tenant ID:', tenantError);
          }
        }
        
        // Set the params and mark as ready
        setParams(urlParams);
        setIsReady(true);
      } catch (error) {
        logger.error('[SafeSearchParams] Error initializing params:', error);
        // Set as ready anyway to prevent blocking the UI
        setIsReady(true);
      }
    };
    
    initParams();
  }, [searchParams]);
  
  // Create a wrapper object with the same interface as useSearchParams
  // but with additional helper methods
  const safeParams = {
    // Original methods from useSearchParams
    get: (key) => {
      if (!isReady) return null;
      return params[key] || null;
    },
    getAll: (key) => {
      if (!isReady) return [];
      const value = params[key];
      return value ? [value] : [];
    },
    has: (key) => {
      if (!isReady) return false;
      return key in params;
    },
    forEach: (callback) => {
      if (!isReady) return;
      Object.entries(params).forEach(([key, value]) => callback(value, key));
    },
    
    // Additional methods
    isReady: () => isReady,
    getAsObject: () => {
      return { ...params };
    },
    getTenantId: () => {
      if (!isReady) return null;
      return params.tenantId || null;
    }
  };
  
  return safeParams;
}

/**
 * Safely extracts tenant ID from the request or search params
 * Falls back to Cognito attributes when needed
 * 
 * @param {Object} req - Next.js request object
 * @returns {Promise<string|null>} - The tenant ID or null
 */
export async function getServerSideTenantId(req) {
  try {
    // Check URL path for tenant ID first (most reliable)
    const pathname = req.nextUrl?.pathname || req.url;
    if (pathname) {
      const pathMatch = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
    }
    
    // Check query params
    const url = new URL(req.url, 'http://localhost');
    const tenantIdParam = url.searchParams.get('tenantId');
    if (tenantIdParam) {
      return tenantIdParam;
    }
    
    // If server-side rendering with auth, try to get from Cognito
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth/server');
      const user = await getCurrentUser();
      if (user) {
        const userAttributes = await fetchUserAttributes();
        const cognitoTenantId = userAttributes['custom:tenant_ID'] || userAttributes['custom:businessid'];
        if (cognitoTenantId) {
          return cognitoTenantId;
        }
      }
    } catch (cognitoError) {
      console.warn('[getServerSideTenantId] Could not get tenant ID from Cognito:', cognitoError);
    }
    
    return null;
  } catch (error) {
    console.error('[getServerSideTenantId] Error getting tenant ID:', error);
    return null;
  }
}

/**
 * Extract search params from a URL string
 * 
 * @param {string} url - URL string to parse
 * @returns {Object} Object with key-value pairs from search params
 */
export function getSearchParamsFromUrl(url) {
  try {
    if (!url) return {};
    
    const urlObj = new URL(url.startsWith('http') ? url : `http://example.com${url}`);
    const params = new URLSearchParams(urlObj.search);
    
    const result = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  } catch (error) {
    console.warn('Error parsing search params from URL:', error);
    return {};
  }
}

/**
 * Convert an object to URLSearchParams string
 * 
 * @param {Object} paramsObj - Object with key-value pairs
 * @returns {string} URL search params string
 */
export function objectToSearchParamsString(paramsObj) {
  try {
    if (!paramsObj || typeof paramsObj !== 'object') return '';
    
    const params = new URLSearchParams();
    
    Object.entries(paramsObj).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    return params.toString();
  } catch (error) {
    console.warn('Error converting object to search params string:', error);
    return '';
  }
} 