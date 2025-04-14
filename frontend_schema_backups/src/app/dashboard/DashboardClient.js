'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import DashboardWrapper from './DashboardWrapper';
import { useRouter, useSearchParams } from 'next/navigation';
import { COOKIE_NAMES, ONBOARDING_STATUS } from '@/constants/onboarding';
import { fetchAuthSession, fetchUserAttributes } from '@aws-amplify/auth';
import dynamic from 'next/dynamic';
import React from 'react';
import DashboardLoader from '@/components/DashboardLoader';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { Auth } from 'aws-amplify';

// Dynamically import DatabaseAdmin component to avoid loading it until needed
const DatabaseAdmin = dynamic(() => import('@/components/DatabaseAdmin'), {
  loading: () => <div>Loading database tools...</div>,
  ssr: false
});

// Helper function to check if user has entered onboarding data
function checkForUserOnboardingData() {
  try {
    // Check localStorage for business info
    const businessInfo = localStorage.getItem('businessInfo');
    if (businessInfo) {
      try {
        const parsedInfo = JSON.parse(businessInfo);
        if (parsedInfo.businessName || parsedInfo.businessType) {
          return true;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    
    // Check for business name in localStorage directly
    const businessName = localStorage.getItem('businessName');
    if (businessName) return true;
    
    // Check cookies for business info
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'businessName' && value) {
        return true;
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Helper to get business name from user data
function getUserBusinessName() {
  try {
    // Try Cognito attributes first (source of truth)
    const userAttrs = Auth.currentUserPoolUser()?.attributes;
    if (userAttrs && userAttrs['custom:businessname']) {
      return userAttrs['custom:businessname'];
    }
    
    // Try AppCache next
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      const cachedName = window.__APP_CACHE.user_pref_custom_businessname;
      if (cachedName) return cachedName;
    }
    
    // Legacy fallbacks (for migration only)
    if (typeof localStorage !== 'undefined') {
      try {
        // Try businessInfo object
        const storedInfo = localStorage.getItem('businessInfo');
        if (storedInfo) {
          const parsedInfo = JSON.parse(storedInfo);
          if (parsedInfo.businessName) return parsedInfo.businessName;
        }
        
        // Try direct key
        const directName = localStorage.getItem('businessName');
        if (directName) return directName;
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  } catch (e) {
    // Ignore any errors in this helper
  }
  return null;
}

// Helper to get business type from user data
function getUserBusinessType() {
  try {
    // Try to get from localStorage businessInfo
    const businessInfo = localStorage.getItem('businessInfo');
    if (businessInfo) {
      try {
        const parsedInfo = JSON.parse(businessInfo);
        if (parsedInfo.businessType) return parsedInfo.businessType;
      } catch (e) {
        // Invalid JSON, continue to other methods
      }
    }
    
    // Try localStorage direct key
    return localStorage.getItem('businessType');
  } catch (e) {
    return null;
  }
}

// Client data synchronization component
export function ClientDataSync() {
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    // Function to sync tenant IDs and other client data
    const syncClientData = async () => {
      try {
        // Get tenant ID from localStorage or cookies
        const tenantId = localStorage.getItem('tenantId') || 
                        document.cookie.split(';').find(c => c.trim().startsWith('tenantId='))?.split('=')[1] ||
                        document.cookie.split(';').find(c => c.trim().startsWith('businessid='))?.split('=')[1];
        
        // Check if tenant ID is valid
        if (tenantId) {
          logger.info('[ClientDataSync] Synchronizing tenant ID:', tenantId);
          
          // Make sure tenant ID is consistent in all storage locations
          localStorage.setItem('tenantId', tenantId);
          document.cookie = `tenantId=${tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
          document.cookie = `businessid=${tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        }
        
        // Sync tenant IDs to prevent corruption
        syncTenantIDs();
        
        // Mark sync as complete
        setSyncComplete(true);
      } catch (error) {
        logger.error('[ClientDataSync] Error syncing client data:', error);
        // Continue despite errors
        setSyncComplete(true);
      }
    };
    
    // Run sync on component mount
    syncClientData();
  }, []);
  
  // This component doesn't render anything visible
  return null;
}

// Sync tenant IDs in client to prevent corruption
const syncTenantIDs = () => {
  try {
    // Get tenant IDs from different sources
    const tenantIdCookie = document.cookie.split('; ')
      .find(row => row.startsWith('tenantId='))
      ?.split('=')[1];
    
    const businessIdCookie = document.cookie.split('; ')
      .find(row => row.startsWith('businessid='))
      ?.split('=')[1];
    
    const localStorageTenantId = localStorage.getItem('tenantId');
    
    console.log('[ClientDataSync] Checking tenant IDs:', {
      tenantIdCookie,
      businessIdCookie,
      localStorageTenantId
    });
    
    // Check if any tenant ID is invalid (corrupted)
    if (tenantIdCookie && !isValidUUID(tenantIdCookie)) {
      console.warn('[ClientDataSync] Detected corrupted tenantId cookie:', tenantIdCookie);
      
      // Try to use a valid ID from another source
      const validId = isValidUUID(localStorageTenantId) 
        ? localStorageTenantId 
        : (isValidUUID(businessIdCookie) ? businessIdCookie : null);
      
      if (validId) {
        console.log('[ClientDataSync] Using valid tenant ID to replace corrupted cookie:', validId);
        document.cookie = `tenantId=${validId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        document.cookie = `businessid=${validId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      } else {
        // If no valid ID found, delete the corrupted cookie
        console.warn('[ClientDataSync] No valid tenant ID found, clearing corrupted cookie');
        document.cookie = 'tenantId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'businessid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Try to fetch a tenant from server if authenticated
        fetchTenantFromServer();
      }
    }
    
    // Ensure consistency between localStorage and cookies if we have a valid ID
    if (localStorageTenantId && isValidUUID(localStorageTenantId)) {
      if (!tenantIdCookie || tenantIdCookie !== localStorageTenantId) {
        console.log('[ClientDataSync] Using local storage tenant ID for cookies:', localStorageTenantId);
        document.cookie = `tenantId=${localStorageTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        document.cookie = `businessid=${localStorageTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      }
    } else if (tenantIdCookie && isValidUUID(tenantIdCookie) && (!localStorageTenantId || localStorageTenantId !== tenantIdCookie)) {
      // If cookie has valid ID but localStorage doesn't, update localStorage
      console.log('[ClientDataSync] Using cookie tenant ID for localStorage:', tenantIdCookie);
      localStorage.setItem('tenantId', tenantIdCookie);
    } else if (!localStorageTenantId && !tenantIdCookie && !businessIdCookie) {
      // If no tenant ID is found, try to get one from the server
      fetchTenantFromServer();
    }
  } catch (error) {
    console.error('[ClientDataSync] Error syncing tenant IDs:', error);
  }
};

// Function to fetch a tenant ID from the server
const fetchTenantFromServer = async () => {
  try {
    console.log('[ClientDataSync] Attempting to fetch tenant from server...');
    
    // Call getOrCreate endpoint to get or create a tenant
    const response = await fetch('/api/tenant/getOrCreate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.tenantId) {
      console.log('[ClientDataSync] Successfully obtained tenant ID from server:', data.tenantId);
      
      // Store the tenant ID in localStorage and cookies
      localStorage.setItem('tenantId', data.tenantId);
      document.cookie = `tenantId=${data.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `businessid=${data.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      // Refresh the page to apply the new tenant ID
      window.location.reload();
    } else {
      console.error('[ClientDataSync] Failed to obtain tenant ID from server:', data.message);
    }
  } catch (error) {
    console.error('[ClientDataSync] Error fetching tenant from server:', error);
  }
};

export default function DashboardClient({ newAccount, plan }) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantVerified, setTenantVerified] = useState(false);
  const [setupStatus, setSetupStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Replace constant logging with first-render-only logging
  const isFirstRender = React.useRef(true);
  if (isFirstRender.current) {
    console.log('DashboardClient initial render with props:', { newAccount, plan });
    isFirstRender.current = false;
  }
  
  // Add searchParams
  const searchParams = useSearchParams();
  
  // Add notification context
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  
  // Dashboard loading component
  const DashboardLoadingState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading your dashboard...</h2>
        <p className="text-gray-500">Please wait while we retrieve your data.</p>
      </div>
    </div>
  );

  // Dashboard error component
  const DashboardErrorState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 text-red-500 mx-auto mb-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Unable to load dashboard</h2>
        <p className="text-gray-700 mb-4">{error || "There was a problem loading your data. Please try again later."}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
  
  // Function to fix missing attributes if needed
  async function ensureUserAttributesComplete(session, userData) {
    try {
      // First, validate we have a valid session and tokens
      if (!session || !session.tokens || !session.tokens.accessToken || !session.tokens.idToken) {
        logger.warn('[DashboardClient] Missing session or tokens, cannot update attributes');
        return {
          success: false,
          error: 'Missing authentication tokens'
        };
      }

      // Validate we have user data
      if (!userData) {
        logger.warn('[DashboardClient] No user data provided, cannot check attributes');
        return {
          success: false,
          error: 'No user data provided'
        };
      }

      // Check for missing attributes
      const missingAttributes = [];
      const requiredAttributes = [
        'custom:businessid',
        'custom:businessname',
        'custom:businesstype',
        'custom:acctstatus',
        'custom:onboarding',
        'custom:setupdone',
        'custom:created_at',
        'custom:updated_at'
      ];
      
      // Check which attributes are missing
      for (const attr of requiredAttributes) {
        if (!userData[attr]) {
          missingAttributes.push(attr);
        }
      }
      
      // If no missing attributes, return
      if (missingAttributes.length === 0) {
        return {
          success: true,
          message: 'All attributes present'
        };
      }
      
      logger.info('[DashboardClient] Detected missing attributes:', missingAttributes);
      
      // Create attributes to update
      const attributesToUpdate = {};
      const timestamp = new Date().toISOString();
      
      // For each missing attribute, set a default value
      missingAttributes.forEach(attr => {
        switch (attr) {
          case 'custom:businessid':
            // Try to generate a deterministic ID based on user ID if available
            if (userData['custom:businessid']) {
              attributesToUpdate[attr] = userData['custom:businessid'];
            } else if (userData.sub) {
              try {
                const { v5: uuidv5 } = require('uuid');
                const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                attributesToUpdate[attr] = uuidv5(userData.sub, TENANT_NAMESPACE);
              } catch (e) {
                // Fallback to random UUID only if absolutely necessary
                attributesToUpdate[attr] = crypto.randomUUID();
              }
            } else {
              // Last resort fallback
              attributesToUpdate[attr] = crypto.randomUUID();
            }
            break;
          case 'custom:businessname':
            // Try to get business name from cookies or localStorage
            const businessName = getBestBusinessName() || '';
            attributesToUpdate[attr] = userData['custom:businessname'] || businessName;
            break;
          case 'custom:businesstype':
            attributesToUpdate[attr] = userData['custom:businesstype'] || 'Other';
            break;
          case 'custom:acctstatus':
            attributesToUpdate[attr] = userData['custom:acctstatus'] || 'ACTIVE';
            break;
          case 'custom:onboarding':
            attributesToUpdate[attr] = userData['custom:onboarding'] || 'complete';
            break;
          case 'custom:setupdone':
            attributesToUpdate[attr] = userData['custom:setupdone'] || 'true';
            break;
          case 'custom:created_at':
            attributesToUpdate[attr] = userData['custom:created_at'] || timestamp;
            break;
          case 'custom:updated_at':
            attributesToUpdate[attr] = timestamp;
            break;
          default:
            break;
        }
      });
      
      // Helper function to get business name from various sources
      function getBestBusinessName() {
        try {
          // Try cookies first
          const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
          };
          
          const cookieName = getCookie('businessName') || getCookie('custom:businessname');
          if (cookieName) return cookieName;
          
          // Then try localStorage
          if (typeof localStorage !== 'undefined') {
            try {
              // Try businessInfo object
              const storedInfo = localStorage.getItem('businessInfo');
              if (storedInfo) {
                const parsedInfo = JSON.parse(storedInfo);
                if (parsedInfo.businessName) return parsedInfo.businessName;
              }
              
              // Try direct key
              const directName = localStorage.getItem('businessName');
              if (directName) return directName;
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        } catch (e) {
          // Ignore any errors in this helper
        }
        return null;
      }
      
      // Update the attributes using the API, with error handling for network issues
      try {
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.tokens.accessToken.toString()}`,
            'X-Id-Token': session.tokens.idToken.toString()
          },
          body: JSON.stringify({
            attributes: attributesToUpdate,
            forceUpdate: true
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          logger.warn('[DashboardClient] API returned error:', { status: response.status, text: errorText });
          return {
            success: false,
            error: `API error: ${response.status} ${errorText}`
          };
        }
        
        logger.info('[DashboardClient] Fixed missing attributes:', attributesToUpdate);
        return {
          success: true,
          message: 'Missing attributes fixed',
          updatedAttributes: attributesToUpdate
        };
      } catch (fetchError) {
        logger.warn('[DashboardClient] Network error updating attributes:', fetchError);
        return {
          success: false, 
          error: `Network error: ${fetchError.message}`
        };
      }
    } catch (error) {
      logger.warn('[DashboardClient] Error fixing missing attributes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate a deterministic tenant ID from the user ID if needed
  const generateDeterministicTenantId = (userId) => {
    try {
      if (!userId) return null;
      
      // Use UUID v5 algorithm for proper deterministic UUID generation
      // This uses a SHA-1 hash (via subtle crypto) to ensure consistency
      const encoder = new TextEncoder();
      const data = encoder.encode(userId);
      
      // UUID v5 namespace (using DNS namespace as base)
      const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      // Convert namespace to bytes
      const namespaceBytes = new Uint8Array(16);
      NAMESPACE.replace(/-/g, '').match(/.{2}/g).map((hex, i) => {
        namespaceBytes[i] = parseInt(hex, 16);
      });
      
      // Combine namespace and name
      const combinedBytes = new Uint8Array(16 + data.length);
      combinedBytes.set(namespaceBytes);
      combinedBytes.set(data, 16);
      
      // Get hash of combined bytes
      // In browsers supporting crypto.subtle:
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        return crypto.subtle.digest('SHA-1', combinedBytes).then(buffer => {
          const hashArray = Array.from(new Uint8Array(buffer));
          
          // Format as UUID v5
          hashArray[6] = (hashArray[6] & 0x0f) | 0x50; // Set version to 5
          hashArray[8] = (hashArray[8] & 0x3f) | 0x80; // Set variant
          
          // Convert to hex and format as UUID
          const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
          
          logger.info('[DashboardClient] Generated deterministic UUID v5 tenant ID from user ID:', uuid);
          return uuid;
        }).catch(e => {
          logger.error('[DashboardClient] Error generating UUID v5 tenant ID:', e);
          
          // Fall back to simple hash method if subtle crypto fails
          return generateSimpleHashTenantId(userId);
        });
      } else {
        // Fallback for environments without crypto.subtle
        return generateSimpleHashTenantId(userId);
      }
    } catch (e) {
      logger.error('[DashboardClient] Error generating tenant ID:', e);
      return null;
    }
  };
  
  // Fallback method using simple hash for environments without crypto.subtle
  const generateSimpleHashTenantId = (userId) => {
    const hash = Array.from(userId).reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0).toString(16).padStart(32, '0');
    
    // Format as UUID-like string
    const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
    logger.info('[DashboardClient] Generated fallback tenant ID from user ID:', uuid);
    
    return uuid;
  };

  useEffect(() => {
    const verifyCognitoState = async () => {
      setIsVerifyingTenant(true);
      
      try {
        // Always try to load from local storage first
        let userId = null;
        
        try {
          // Check Cognito identity
          const session = await fetchAuthSession();
          const identityToken = session?.tokens?.idToken?.toString();
          
          if (identityToken) {
            const idTokenPayload = session.tokens.idToken;
            userId = idTokenPayload.payload.sub;
            
            if (userId) {
              // Store user ID in local storage
              localStorage.setItem('userId', userId);
              
              // Generate tenant ID if needed
              const tenantId = localStorage.getItem('tenantId') || generateDeterministicTenantId(userId);
              if (tenantId) {
                localStorage.setItem('tenantId', tenantId);
              }
              
              setIsAuthenticated(true);
              setTenantVerified(true);
              setIsVerifyingTenant(false);
              setSetupStatus('success');
              return;
            }
          }
        } catch (e) {
          logger.error('[DashboardClient] Error fetching Cognito session:', e);
          // Continue to fallback mechanisms
        }
        
        // If we couldn't get from Cognito, try localStorage
        userId = localStorage.getItem('userId');
        const tenantId = localStorage.getItem('tenantId');
        
        if (userId && tenantId) {
          setTenantVerified(true);
          setIsVerifyingTenant(false);
          setSetupStatus('success');
          return;
        }
        
        // If we get here, we failed to verify the tenant
        setTenantVerified(false);
        setIsVerifyingTenant(false);
        setSetupStatus('failed');
        setError('Unable to verify tenant ID. Please try refreshing the page or signing in again.');
      } catch (error) {
        logger.error('[DashboardClient] Error verifying tenant:', error);
        setTenantVerified(false);
        setIsVerifyingTenant(false);
        setSetupStatus('failed');
        setError('An unexpected error occurred. Please try again later.');
      }
    };
    
    verifyCognitoState();
  }, []);
  
  // Function to fix tenant schema issues in AWS RDS
  const setupAwsRdsTables = useCallback(async (tenantId) => {
    if (!tenantId) {
      console.error('[DashboardClient] Cannot set up tables: No tenant ID provided');
      return { success: false, error: 'No tenant ID provided' };
    }
    
    try {
      console.log(`[DashboardClient] Setting up AWS RDS tables for tenant: ${tenantId}`);
      
      // Create the schema first
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Call our AWS RDS table creation endpoint
      const response = await fetch(`/api/db/create-aws-tables`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DashboardClient] AWS RDS table setup complete:', data);
        return { success: true, data };
      } else {
        const errorData = await response.json();
        console.error('[DashboardClient] Failed to set up AWS RDS tables:', errorData);
        return { success: false, error: errorData };
      }
    } catch (error) {
      console.error('[DashboardClient] Error setting up AWS RDS tables:', error.message);
      return { success: false, error: error.message };
    }
  }, []);

  // Initialize database and ensure tables exist
  const initializeDatabase = async () => {
    try {
      console.log('[DashboardClient] Initializing database connection to AWS RDS');
      
      // Get tenant ID from localStorage or cookies
      const localStorageTenantId = localStorage.getItem('tenantId');
      const cookieTenantId = (() => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; tenantId=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      })();
      
      const tenantId = localStorageTenantId || cookieTenantId;
      
      if (!tenantId) {
        console.warn('[DashboardClient] No tenant ID found for database initialization, skipping table setup');
        return;
      }
      
      // Set up AWS RDS tables with the tenant ID
      const result = await setupAwsRdsTables(tenantId);
      
      if (result.success) {
        console.log('[DashboardClient] AWS RDS tables set up successfully');
      } else {
        console.warn('[DashboardClient] AWS RDS table setup issues:', result.error);
      }
    } catch (error) {
      console.error('[DashboardClient] Error initializing AWS RDS:', error);
    }
  };
  
  // This ensures we're only rendering on the client
  useEffect(() => {
    setIsClient(true);
    
    // Run database initialization immediately with AWS RDS
    initializeDatabase();
    
    // Ensure consistent tenant ID on initialization
    const ensureConsistentTenantId = async () => {
      try {
        // Check various sources
        const localStorageTenantId = localStorage.getItem('tenantId');
        const cookieTenantId = (() => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; tenantId=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        })();
        
        // If we have inconsistent IDs or none at all, fetch from the server
        if (!localStorageTenantId || !cookieTenantId || localStorageTenantId !== cookieTenantId) {
          console.log('[DashboardClient] Tenant ID inconsistency detected, fetching from server');
          
          try {
            // Request the tenant ID from the server based on the authenticated user
            const response = await fetch('/api/user/tenant', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.tenantId) {
                console.log('[DashboardClient] Retrieved tenant ID from server:', data.tenantId);
                localStorage.setItem('tenantId', data.tenantId);
                document.cookie = `tenantId=${data.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                
                // Set up AWS RDS tables for this tenant
                await setupAwsRdsTables(data.tenantId);
                
                // Also store the source for debugging
                if (data.source) {
                  console.log('[DashboardClient] Tenant ID source:', data.source);
                }
              } else {
                // If server doesn't have a tenant ID for this user, get from Cognito
                try {
                  const userAttributes = await fetchUserAttributes();
                  const cognitoTenantId = userAttributes['custom:businessid'];
                  
                  if (cognitoTenantId) {
                    console.log('[DashboardClient] Using tenant ID from Cognito:', cognitoTenantId);
                    localStorage.setItem('tenantId', cognitoTenantId);
                    document.cookie = `tenantId=${cognitoTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    
                    // Set up AWS RDS tables for this tenant
                    await setupAwsRdsTables(cognitoTenantId);
                    
                    // Ensure tenant record exists in database and update server
                    try {
                      // Also update the tenant API
                      await fetch('/api/user/tenant', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tenantId: cognitoTenantId })
                      });
                      console.log('[DashboardClient] Updated server with Cognito tenant ID');
                    } catch (updateError) {
                      console.warn('[DashboardClient] Failed to update server with tenant ID:', updateError);
                    }
                  } else {
                    // ONLY CREATE NEW TENANT IF EXPLICITLY REQUESTED
                    // Check if we're in a new account flow that actually requires a new tenant
                    if (newAccount === true) {
                      // Generate a deterministic UUID based on user ID if possible
                      // This ensures the same user always gets the same tenant ID
                      try {
                        // Generate a deterministic UUID based on user sub
                        const userId = userAttributes.sub;
                        const { v5: uuidv5 } = require('uuid');
                        const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                        const deterministicTenantId = uuidv5(userId, TENANT_NAMESPACE);
                        
                        console.log('[DashboardClient] Generated deterministic tenant ID from user ID:', deterministicTenantId);
                        localStorage.setItem('tenantId', deterministicTenantId);
                        document.cookie = `tenantId=${deterministicTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                        
                        // Use the schema manager to ensure tables and schema exist
                        await ensureTenantSchema(deterministicTenantId, userAttributes);
                      } catch (uuidError) {
                        // If deterministic generation fails, fall back to random UUID as absolute last resort
                        const newTenantId = crypto.randomUUID();
                        console.warn('[DashboardClient] UUID error, generated random tenant ID as last resort:', newTenantId);
                        localStorage.setItem('tenantId', newTenantId);
                        document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                        
                        // Use the schema manager to ensure tables and schema exist
                        await ensureTenantSchema(newTenantId, userAttributes);
                      }
                      
                      // Ensure tenant exists in database and update server
                      try {
                        // Get the final tenant ID (from either deterministicTenantId or newTenantId)
                        const finalTenantId = localStorage.getItem('tenantId');
                        
                        // Initialize the database environment first
                        try {
                          const initResponse = await fetch('/api/tenant/init-db-env');
                          if (initResponse.ok) {
                            try {
                              const initData = await initResponse.json();
                              console.log('[DashboardClient] Database environment initialization:', 
                                initData.success ? 'successful' : 'failed',
                                'Table exists:', initData.tableExists);
                            } catch (jsonError) {
                              console.error('[DashboardClient] Failed to parse init-db-env response:', jsonError);
                              // Continue with the process despite parsing error
                            }
                          }
                        } catch (initError) {
                          console.warn('[DashboardClient] Error initializing database environment:', initError.message);
                          // Continue anyway since ensure-db-record has its own initialization
                        }
                        
                        // Now ensure the tenant record exists in the database
                        const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            tenantId: finalTenantId,
                            userId: userAttributes.sub,
                            email: userAttributes.email,
                            businessName: userAttributes['custom:businessname'],
                            forceCreate: true
                          })
                        });
                        
                        if (tenantResponse.ok) {
                          try {
                            const tenantData = await tenantResponse.json();
                            console.log('[DashboardClient] Generated tenant ID saved to database:', tenantData);
                          } catch (jsonError) {
                            console.error('[DashboardClient] Failed to parse tenant response:', jsonError);
                            // Continue despite parsing error
                          }
                        } else {
                          try {
                            const errorText = await tenantResponse.text();
                            console.warn('[DashboardClient] Failed to save generated tenant ID to database:', errorText);
                          } catch (textError) {
                            console.warn('[DashboardClient] Failed to save generated tenant ID to database. Status:', tenantResponse.status);
                          }
                        }
                        
                        // Also update the tenant API
                        await fetch('/api/user/tenant', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ tenantId: finalTenantId })
                        });
                        console.log('[DashboardClient] Updated server with generated tenant ID');
                      } catch (updateError) {
                        console.warn('[DashboardClient] Failed to update server with tenant ID:', updateError);
                      }
                    } else {
                      console.log('[DashboardClient] No tenant ID found, but new account flow not detected. Not creating a new tenant.');
                      notifyWarning('Unable to determine your organization information. Please log out and log back in.');
                    }
                  }
                } catch (cognitoError) {
                  console.error('[DashboardClient] Error fetching Cognito attributes:', cognitoError);
                }
              }
            } else {
              // If API request fails, fall back to Cognito
              console.warn('[DashboardClient] Tenant API request failed, falling back to Cognito');
              try {
                const userAttributes = await fetchUserAttributes();
                const cognitoTenantId = userAttributes['custom:businessid'];
                
                if (cognitoTenantId) {
                  console.log('[DashboardClient] Using tenant ID from Cognito after API failure:', cognitoTenantId);
                  localStorage.setItem('tenantId', cognitoTenantId);
                  document.cookie = `tenantId=${cognitoTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                } else {
                  // Generate a deterministic UUID based on user ID if available
                  try {
                    const userId = userAttributes.sub;
                    if (userId) {
                      const { v5: uuidv5 } = require('uuid');
                      const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                      const generatedTenantId = uuidv5(userId, TENANT_NAMESPACE);
                      
                      console.log('[DashboardClient] Generated deterministic tenant ID from user ID:', generatedTenantId);
                      localStorage.setItem('tenantId', generatedTenantId);
                      document.cookie = `tenantId=${generatedTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    } else {
                      // Random UUID as absolute last resort
                      const newTenantId = crypto.randomUUID();
                      console.warn('[DashboardClient] No user ID available, using random UUID:', newTenantId);
                      localStorage.setItem('tenantId', newTenantId);
                      document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    }
                  } catch (uuidError) {
                    // If UUID generation fails, use simple random UUID
                    const newTenantId = crypto.randomUUID();
                    console.error('[DashboardClient] UUID generation error, using random UUID:', newTenantId);
                    localStorage.setItem('tenantId', newTenantId);
                    document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                  }
                }
              } catch (cognitoError) {
                console.error('[DashboardClient] Error fetching Cognito attributes after API failure:', cognitoError);
                // Ultimate fallback - generate random UUID
                const newTenantId = crypto.randomUUID();
                console.warn('[DashboardClient] All tenant ID sources failed, using random UUID:', newTenantId);
                localStorage.setItem('tenantId', newTenantId);
                document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
              }
            }
          } catch (fetchError) {
            console.error('[DashboardClient] Error fetching tenant ID from server:', fetchError);
          }
        }
      } catch (e) {
        // Log but don't throw errors
        console.error('[DashboardClient] Error ensuring consistent tenant ID:', e);
      }
    };
    
    // Run the consistency check
    ensureConsistentTenantId();
    
    // First check if user is authenticated by fetching Cognito attributes
    const checkOnboardingStatus = async () => {
      try {
        console.log('[DashboardClient] Starting authentication and onboarding status check');
        
        // First check if we have a valid auth session
        const session = await fetchAuthSession();
        if (!session?.tokens?.accessToken) {
          console.warn('[DashboardClient] No valid auth session found, will redirect to sign-in');
          // Add delay to see logs before redirect
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/auth/signin');
          return;
        }
        
        // User has valid session, set authenticated
        setIsAuthenticated(true);
        
        // Get user attributes to check onboarding status
        try {
          const userAttributes = await fetchUserAttributes();
          
          // Store user attributes in state
          setUserData(userAttributes);
          
          console.log('[DashboardClient] User attributes fetched:', {
            hasBusinessId: !!userAttributes['custom:businessid'],
            hasBusinessName: !!userAttributes['custom:businessname'],
            onboardingStatus: userAttributes['custom:onboarding'],
            setupDone: userAttributes['custom:setupdone']
          });
          
          // ENHANCED CHECK: If user has completed onboarding according to Cognito, we're good
          if (userAttributes['custom:onboarding']?.toLowerCase() === 'complete' || 
              userAttributes['custom:setupdone']?.toLowerCase() === 'true') {
            console.log('[DashboardClient] User has completed onboarding, showing dashboard');
            
            // Check for tenant ID to ensure RLS works properly
            if (!userAttributes['custom:businessid']) {
              console.warn('[DashboardClient] Missing tenant ID in Cognito, will generate one for RLS');
              // Generate a deterministic UUID from user ID to ensure consistency
              try {
                const { v5: uuidv5 } = require('uuid');
                const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                const generatedTenantId = uuidv5(userAttributes.sub, TENANT_NAMESPACE);
                
                // Add this to the attributes that need updating
                userAttributes['custom:businessid'] = generatedTenantId;
                localStorage.setItem('tenantId', generatedTenantId);
                document.cookie = `tenantId=${generatedTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                console.log('[DashboardClient] Generated tenant ID for RLS:', generatedTenantId);
              } catch (e) {
                console.error('[DashboardClient] Error generating tenant ID:', e);
              }
            }
            
            // Fix any missing attributes in the background
            ensureUserAttributesComplete(session, userAttributes)
              .then(result => console.debug('[DashboardClient] Attribute check result:', result))
              .catch(err => console.error('[DashboardClient] Background attribute check error:', err));
              
            setIsReady(true);
            return;
          }
        } catch (attrError) {
          console.warn('[DashboardClient] Error fetching user attributes, using cookies as fallback:', attrError);
          
          // Even if we can't get attributes, we can use cookies
          const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
          };
          
          // Check cookies for onboarding status
          const onboardingStatus = getCookie('onboardedStatus') || getCookie('onboardingStatus');
          const setupCompleted = getCookie('setupCompleted') || getCookie('setupDone');
          
          if (onboardingStatus === 'complete' || setupCompleted === 'true') {
            console.log('[DashboardClient] Cookies indicate onboarding is complete, showing dashboard');
            setIsReady(true);
            return;
          }
        }
        
        // Set isReady true even if we don't have attributes or cookies
        // The DashboardWrapper will handle further verification
        console.log('[DashboardClient] Proceeding to dashboard, DashboardWrapper will handle verification');
        setIsReady(true);
        
      } catch (error) {
        // Log error and redirect
        console.error('[DashboardClient] Error checking auth status:', error);
        router.push('/auth/signin?returnUrl=' + encodeURIComponent('/dashboard'));
      }
    };
    
    // Run the check but set a timeout to prevent infinite loading
    checkOnboardingStatus();
    
    // Set a timeout to ensure we don't get stuck in a loading state
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.log('⚠️ Dashboard loading timeout - forcing ready state');
        setIsReady(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [router]);
  
  // Function to refresh user data
  const refreshUserData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('[DashboardClient] Refreshing user data');
      const userAttributes = await fetchUserAttributes();
      setUserData(userAttributes);
      return userAttributes;
    } catch (error) {
      console.error('[DashboardClient] Error refreshing user data:', error);
      return null;
    }
  }, [isAuthenticated]);
  
  // Helper function to handle subscription success
  useEffect(() => {
    const handleSubscriptionSuccess = async () => {
      const subscriptionSuccess = searchParams.get('subscription_success');
      const sessionId = searchParams.get('session_id');
      
      if (subscriptionSuccess === 'true' && sessionId) {
        console.log(`[Subscription] Processing successful subscription with session ID: ${sessionId}`);
        
        try {
          // Call our session-success API to verify and process the subscription
          const response = await fetch('/api/checkout/session-success', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[Subscription] Successfully processed checkout session:', data);
            notifySuccess('Subscription successfully upgraded!');
            
            // Refresh user data to get the updated subscription status
            await refreshUserData();
            
            // Clean the URL by removing query parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('subscription_success');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, document.title, url.toString());
          } else {
            const errorData = await response.json();
            console.error('[Subscription] Failed to process checkout session:', errorData);
            notifyError('Failed to verify subscription. Please contact support.');
          }
        } catch (error) {
          console.error('[Subscription] Error processing subscription:', error);
          notifyError('An error occurred while processing your subscription.');
        }
      }
    };
    
    // Only run if authenticated
    if (isAuthenticated) {
      handleSubscriptionSuccess();
    }
  }, [searchParams, isAuthenticated, notifySuccess, notifyError]);
  
  // Update loading state based on data availability
  useEffect(() => {
    // Set loading to false only when we have real data
    if (userData && Object.keys(userData).length > 0 && tenantVerified) {
      setIsLoading(false);
    }
  }, [userData, tenantVerified]);
  
  // Show loading state if still loading tenant or user data
  if (isLoading || isVerifyingTenant || !tenantVerified) {
    return <DashboardLoadingState />;
  }

  // Show error state if there's an error
  if (error || setupStatus === 'failed') {
    return <DashboardErrorState />;
  }

  // Don't show the dashboard until we have actual userData
  if (!userData || Object.keys(userData).length === 0) {
    return <DashboardLoadingState />;
  }

  if (!isClient) {
    return <DashboardWrapper 
      newAccount={userData?.['custom:isNew'] === 'true' || newAccount === 'true'}
      plan={plan || userData?.['custom:plan']}
    />;
  }

  return (
    <>
      {/* Admin panel for admin users */}
      {userData?.['custom:isadmin'] === 'true' && isAuthenticated && searchParams.get('admin') === 'true' && (
        <div className="min-h-screen">
          <DatabaseAdmin />
        </div>
      )}
      
      {/* Always render DashboardWrapper */}
      <DashboardWrapper 
        newAccount={userData?.['custom:isNew'] === 'true' || newAccount === 'true'}
        plan={plan || userData?.['custom:plan']}
      />
    </>
  );
}

/**
 * Ensure the tenant schema exists
 */
const ensureTenantSchema = async (tenantId, userAttributes) => {
  try {
    // Call the tenant manager API
    const tenantManagerResponse = await fetch('/api/tenant/tenant-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tenant_id: tenantId,
        user_id: userAttributes.sub,
        business_name: userAttributes['custom:businessname'],
        forceCreate: true // Explicitly request tenant creation
      })
    });
    
    if (tenantManagerResponse.ok) {
      const schemaResult = await tenantManagerResponse.json();
      console.log('[DashboardClient] Tenant manager result:', schemaResult);
      
      if (schemaResult.success) {
        return schemaResult;
      } else {
        console.error('[DashboardClient] Tenant creation failed:', schemaResult);
        return null;
      }
    } else {
      console.error('[DashboardClient] Tenant manager API failed:', await tenantManagerResponse.text());
      return null;
    }
  } catch (error) {
    console.error('[DashboardClient] Error in tenant setup:', error);
    return null;
  }
};

// Function to validate tenant ID
const isValidUUID = (id) => {
  if (!id) return false;
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}; 