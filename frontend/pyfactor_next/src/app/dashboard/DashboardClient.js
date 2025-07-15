'use client';






import { appCache } from '@/utils/appCache';
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import DashboardWrapper from './DashboardWrapper';
import { useRouter, useSearchParams } from 'next/navigation';
import { COOKIE_NAMES, ONBOARDING_STATUS } from '@/constants/onboarding';
import dynamic from 'next/dynamic';
import React from 'react';
import DashboardLoader from '@/components/DashboardLoader';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from '@/hooks/useSession-v2';
import { v4 as uuidv4 } from 'uuid';
import cls from '@/utils/cls';
import styles from '@/styles/DashboardClient.module.css';
import { useSafeSearchParams } from '@/utils/searchParamsUtils';

// Import HttpsConfig component for HTTPS support
import HttpsConfig from '@/components/HttpsConfig';

// Dynamically import DatabaseAdmin component to avoid loading it until needed
const DatabaseAdmin = dynamic(() => import('@/components/DatabaseAdmin'), {
  loading: () => <div>Loading database tools...</div>,
  ssr: false
});

// Replace this function with one that only uses Cognito attributes
function checkForUserOnboardingData() {
  try {
    // Check Cognito attributes first
    return new Promise(async (resolve) => {
      try {
        // Auth0 doesn't use fetchUserAttributes
        const userAttributes = {};
        
        // Check for business name in user attributes
        if (userAttributes['custom:businessname'] || 
            userAttributes['custom:businesstype'] || 
            userAttributes['custom:business_info_done'] === 'TRUE') {
          resolve(true);
          return;
        }
        
        // No business info found in Cognito
        resolve(false);
      } catch (e) {
        // Error accessing Cognito, assume no data
        console.warn('[checkForUserOnboardingData] Error checking Cognito:', e);
        resolve(false);
      }
    });
  } catch (e) {
    return Promise.resolve(false);
  }
}

// Helper to get business name from Cognito only
function getUserBusinessName() {
  return new Promise(async (resolve) => {
    try {
      // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
      
      // Try to get business name from Cognito attributes
      const businessName = userAttributes['custom:businessname'] || null;
      resolve(businessName);
    } catch (e) {
      // Error accessing Cognito, return null
      console.warn('[getUserBusinessName] Error getting from Cognito:', e);
      resolve(null);
    }
  });
}

// Helper to get business type from Cognito only
function getUserBusinessType() {
  return new Promise(async (resolve) => {
    try {
      // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
      
      // Try to get business type from Cognito attributes
      const businessType = userAttributes['custom:businesstype'] || null;
      resolve(businessType);
    } catch (e) {
      // Error accessing Cognito, return null
      console.warn('[getUserBusinessType] Error getting from Cognito:', e);
      resolve(null);
    }
  });
}

// Client data synchronization component - updated to use only Cognito
export function ClientDataSync() {
  const [syncComplete, setSyncComplete] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Function to sync tenant IDs and other client data
    const syncClientData = async () => {
      try {
        // Check if we're coming from the sign-in flow
        const isAuthFlow = searchParams?.get('fromAuth') === 'true' || 
                        searchParams?.get('fromSignIn') === 'true';
        
        // Import our Cognito tenant utils
        const { getTenantIdFromCognito, updateTenantIdInCognito } = await import('@/utils/tenantUtils');
        
        // Get tenant ID from Cognito
        const tenantId = await getTenantIdFromCognito();
        
        // Import and initialize menu privileges
        const { fetchCurrentUserMenuPrivileges } = await import('@/utils/menuPrivileges');
        await fetchCurrentUserMenuPrivileges();
        
        // If we have a tenant ID and we're on the dashboard route, redirect to the tenant URL
        if (tenantId && isAuthFlow && window.location.pathname === '/dashboard') {
          logger.info('[ClientDataSync] Auth flow detected with tenant ID, redirecting to tenant URL');
          
          // Get current URL params
          const params = {};
          searchParams.forEach((value, key) => {
            params[key] = value;
          });
          
          // Add direct=true to prevent redirect loops
          params.direct = 'true';
          
          // Build query string
          const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          
          // Redirect to tenant-specific dashboard
          const tenantUrl = `/${tenantId}/dashboard${queryString ? `?${queryString}` : ''}`;
          window.location.href = tenantUrl;
          return;
        }
        
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
  }, [searchParams, router]);
  
  // This component doesn't render anything visible
  return null;
}

// Update the syncTenantIDs function to prefer Cognito
const syncTenantIDs = async (isAuthFlow = false) => {
  try {
    console.log('[ClientDataSync] Syncing tenant IDs with priority on Cognito attributes...');
    
    // First try to get tenant directly from Cognito attributes
    let cognitoTenantId = null;
    
    try {
      // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
      cognitoTenantId = userAttributes['custom:businessid'] || userAttributes['custom:tenant_ID'];
      
      if (cognitoTenantId) {
        console.log('[ClientDataSync] Found tenant ID in Cognito attributes:', cognitoTenantId);
        
        // If we're on the dashboard route, redirect to the tenant URL
        if (isAuthFlow && window.location.pathname === '/dashboard') {
          window.location.href = `/${cognitoTenantId}/dashboard?direct=true&fromSignIn=true`;
          return;
        }
        return cognitoTenantId;
      }
    } catch (cognitoError) {
      console.warn('[ClientDataSync] Could not get tenant ID from Cognito:', cognitoError);
      // Continue to other approaches
    }
    
    // If no tenant ID is found in Cognito, try to get one from the server
    console.log('[ClientDataSync] No tenant ID found in Cognito, fetching from server...');
    await fetchTenantFromServer(isAuthFlow);
    
  } catch (error) {
    console.error('[ClientDataSync] Error syncing tenant IDs:', error);
  }
};

// Function to fetch a tenant ID from the server
const fetchTenantFromServer = async (isAuthFlow = false) => {
  try {
    console.log('[ClientDataSync] Attempting to fetch tenant from Cognito attributes...');
    
    // First try to get tenant directly from Cognito attributes
    try {
      const { fetchUserAttributes, fetchAuthSession } = await import("@/utils/auth0Adapter");
// Get the user attributes directly from Cognito
      const userAttributes = await fetchUserAttributes();
      const tenantIdFromCognito = userAttributes['custom:businessid'] || userAttributes['custom:tenant_ID'];
      
      if (tenantIdFromCognito) {
        console.log('[ClientDataSync] Successfully obtained tenant ID from Cognito attributes:', tenantIdFromCognito);
        return tenantIdFromCognito;
      }
    } catch (cognitoError) {
      console.warn('[ClientDataSync] Could not get tenant from Cognito attributes:', cognitoError);
      // Continue to server approach
    }
    
    // Add auth headers if available to prevent 401 errors
    const headers = { 'Content-Type': 'application/json' };
    
    try {
      // Try to get the session for auth
      const { fetchAuthSession } = await import('@/utils/auth0Adapter');
      const session = await getAuth0Session();
      if (session?.tokens?.idToken) {
        headers['Authorization'] = `Bearer ${session.tokens.idToken.toString()}`;
      }
    } catch (authError) {
      // Non-blocking error - we'll still try the request
      console.warn('[ClientDataSync] Could not add auth headers:', authError);
    }
    
    // Call getOrCreate endpoint to get or create a tenant
    const response = await fetch('/api/tenant/getOrCreate', {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for session-based auth
    });
    
    if (!response.ok) {
      // If unauthorized, try fallback approach
      if (response.status === 401) {
        console.warn('[ClientDataSync] Unauthorized request, trying fallback endpoint...');
        
        const fallbackResponse = await fetch('/api/tenant/fallback', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.tenantId) {
            console.log('[ClientDataSync] Successfully obtained tenant ID from fallback:', fallbackData.tenantId);
            
            // Save this to Cognito attributes for future use
            try {
              const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
                userAttributes: {
                  'custom:businessid': fallbackData.tenantId
                }
              });
              console.log('[ClientDataSync] Updated Cognito attributes with tenant ID');
            } catch (updateError) {
              console.warn('[ClientDataSync] Could not update Cognito attributes:', updateError);
            }
            
            return fallbackData.tenantId;
          }
        }
      }
      
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.tenantId) {
      console.log('[ClientDataSync] Successfully obtained tenant ID from server:', data.tenantId);
      
      // Save this to Cognito attributes for future use
      try {
        const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
          userAttributes: {
            'custom:businessid': data.tenantId
          }
        });
        console.log('[ClientDataSync] Updated Cognito attributes with tenant ID');
      } catch (updateError) {
        console.warn('[ClientDataSync] Could not update Cognito attributes:', updateError);
      }
      
      // If from auth flow, redirect to tenant URL
      if (isAuthFlow && window.location.pathname === '/dashboard') {
        window.location.href = `/${data.tenantId}/dashboard?direct=true&fromSignIn=true`;
        return data.tenantId;
      }
      
      // Refresh the page to apply the new tenant ID if not from auth flow
      if (!isAuthFlow) {
        window.location.reload();
      }
      
      return data.tenantId;
    } else {
      console.error('[ClientDataSync] Failed to obtain tenant ID from server:', data.message);
    }
  } catch (error) {
    console.error('[ClientDataSync] Error fetching tenant from server:', error);
  }
  
  return null;
};

export default function DashboardClient({ newAccount, plan, createTenant, businessId }) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Use the session hook instead of managing userData separately
  const { session, loading: sessionLoading, error: sessionError, refreshSession } = useSession();
  const userData = session?.user || null;
  
  // COMPREHENSIVE DEBUG: Log session and userData state
  useEffect(() => {
    console.log('🎯 [DashboardClient] === SESSION DEBUG START ===');
    console.log('🎯 [DashboardClient] Session loading:', sessionLoading);
    console.log('🎯 [DashboardClient] Session error:', sessionError);
    console.log('🎯 [DashboardClient] Session object:', session);
    console.log('🎯 [DashboardClient] Session authenticated:', session?.authenticated);
    console.log('🎯 [DashboardClient] Session user exists:', !!session?.user);
    console.log('🎯 [DashboardClient] Session user keys:', session?.user ? Object.keys(session.user) : 'no user');
    console.log('🎯 [DashboardClient] Extracted userData:', userData);
    console.log('🎯 [DashboardClient] UserData type:', typeof userData);
    console.log('🎯 [DashboardClient] UserData keys:', userData ? Object.keys(userData) : 'no userData');
    console.log('🎯 [DashboardClient] === SESSION DEBUG END ===');
  }, [session, sessionLoading, sessionError, userData]);
  
  // Update authentication state based on session
  useEffect(() => {
    setIsAuthenticated(session?.authenticated || false);
  }, [session?.authenticated]);
  
  // Update loading state to include session loading
  useEffect(() => {
    if (!sessionLoading && session) {
      setIsLoading(false);
    }
  }, [sessionLoading, session]);
  
  const [tenantCreated, setTenantCreated] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const router = useRouter();
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantVerified, setTenantVerified] = useState(false);
  const [setupStatus, setSetupStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupMode, setSetupMode] = useState('');
  
  // Replace constant logging with first-render-only logging
  const isFirstRender = React.useRef(true);
  if (isFirstRender.current) {
    console.log('DashboardClient initial render with props:', { newAccount, plan, createTenant, businessId });
    isFirstRender.current = false;
  }
  
  // Use our safe searchParams utility
  const searchParams = useSafeSearchParams();
  
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
      async function getBestBusinessName() {
        try {
          // Try to get business name from Cognito attributes
          // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
          
          // Look for business name in custom attributes
          const cognitoBusinessName = 
            userAttributes['custom:businessname'] || 
            userAttributes['custom:business_name'] ||
            null;
            
          if (cognitoBusinessName) {
            return cognitoBusinessName;
          }
          
          // If no business name in Cognito, try to infer from other attributes
          if (userAttributes.given_name && userAttributes.family_name) {
            return `${userAttributes.given_name}'s Business`;
          } else if (userAttributes.email) {
            const emailPrefix = userAttributes.email.split('@')[0];
            return `${emailPrefix}'s Business`;
          }
        } catch (e) {
          logger.warn('[DashboardClient] Error getting business name from Cognito:', e);
        }
        
        return ''; // Default fallback
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
        // Check Cognito identity and attributes
        try {
          // Get Cognito session
          const session = await getAuth0Session();
          const identityToken = session?.id_token || session?.idToken;
          
          if (!identityToken) {
            throw new Error('No valid identity token found');
          }
          
          // Get user ID from token
          const idTokenPayload = session.tokens.idToken;
          const userId = idTokenPayload.payload.sub;
          
          if (!userId) {
            throw new Error('No user ID found in token');
          }
          
          // Get tenant ID from Cognito attributes
          const userAttributes = await fetchUserAttributes();
          let tenantId = userAttributes['custom:tenant_ID'] || 
                        userAttributes['custom:tenant_id'] || 
                        userAttributes['custom:businessid'];
          
          // If no tenant ID in attributes, generate one and update Cognito
          if (!tenantId) {
            logger.info('[DashboardClient] No tenant ID found in Cognito, generating one');
            
            // Generate deterministic tenant ID from user ID
            tenantId = await generateDeterministicTenantId(userId);
            
            if (tenantId) {
              // Update Cognito with the tenant ID
              const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
                userAttributes: {
                  'custom:tenant_ID': tenantId,
                  'custom:tenant_id': tenantId,
                  'custom:businessid': tenantId,
                  'custom:updated_at': new Date().toISOString()
                }
              });
              
              logger.info('[DashboardClient] Updated Cognito with generated tenant ID:', tenantId);
            }
          }
          
          // Tenant verification successful
          setIsAuthenticated(true);
          setTenantVerified(true);
          setIsVerifyingTenant(false);
          setSetupStatus('success');
          return;
        } catch (e) {
          logger.error('[DashboardClient] Error verifying Cognito session:', e);
          // Fall through to error state
        }
        
        // If we get here, we failed to verify the tenant
        setTenantVerified(false);
        setIsVerifyingTenant(false);
        setSetupStatus('failed');
        setError('Unable to verify tenant ID. Please try signing in again.');
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
      
      // Try to get tenant ID from Cognito first
      let tenantId = null;
      
      try {
        // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
        tenantId = userAttributes['custom:businessid'] || userAttributes['custom:tenant_ID'];
        
        if (tenantId) {
          console.log('[DashboardClient] Using tenant ID from Cognito for database initialization:', tenantId);
        }
      } catch (cognitoError) {
        console.warn('[DashboardClient] Could not get tenant ID from Cognito:', cognitoError);
        // Continue to other approaches
      }
      
      // If no tenant ID found, try fallback API
      if (!tenantId) {
        try {
          console.log('[DashboardClient] Trying fallback API for tenant ID');
          const fallbackResponse = await fetch('/api/tenant/fallback', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.tenantId) {
              tenantId = fallbackData.tenantId;
              console.log('[DashboardClient] Got tenant ID from fallback API:', tenantId);
            }
          }
        } catch (fallbackError) {
          console.warn('[DashboardClient] Could not get tenant ID from fallback API:', fallbackError);
        }
      }
      
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
        console.log('[DashboardClient] Ensuring consistent tenant ID using Cognito attributes');
        
        // First try to get tenant ID from Cognito
        let cognitoTenantId = null;
        
        try {
          // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
          cognitoTenantId = userAttributes['custom:businessid'] || userAttributes['custom:tenant_ID'];
          
          if (cognitoTenantId) {
            console.log('[DashboardClient] Found tenant ID in Cognito attributes:', cognitoTenantId);
            
            // Set up AWS RDS tables for this tenant
            await setupAwsRdsTables(cognitoTenantId);
            
            return cognitoTenantId;
          }
        } catch (cognitoError) {
          console.warn('[DashboardClient] Could not get tenant ID from Cognito:', cognitoError);
        }
        
        // If still no tenant ID, try to get from server API
        console.log('[DashboardClient] No tenant ID found in Cognito, requesting from server API');
        
        try {
          // Request the tenant ID from the server based on the authenticated user
          const response = await fetch('/api/user/tenant', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.tenantId) {
              console.log('[DashboardClient] Retrieved tenant ID from server:', data.tenantId);
              
              // Update Cognito with this tenant ID
              try {
                const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
                  userAttributes: {
                    'custom:businessid': data.tenantId
                  }
                });
                console.log('[DashboardClient] Updated Cognito attributes with tenant ID');
              } catch (updateError) {
                console.warn('[DashboardClient] Could not update Cognito attributes:', updateError);
              }
              
              // Set up AWS RDS tables for this tenant
              await setupAwsRdsTables(data.tenantId);
              
              return data.tenantId;
            }
          } else {
            console.warn('[DashboardClient] Server returned status:', response.status);
          }
        } catch (serverError) {
          console.error('[DashboardClient] Error fetching tenant from server:', serverError);
        }
        
        // If all methods fail, try fallback API
        try {
          console.log('[DashboardClient] Trying fallback API for tenant ID');
          const fallbackResponse = await fetch('/api/tenant/fallback', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.tenantId) {
              const tenantId = fallbackData.tenantId;
              console.log('[DashboardClient] Got tenant ID from fallback API:', tenantId);
              
              // Update Cognito with this tenant ID
              try {
                const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
                  userAttributes: {
                    'custom:businessid': tenantId
                  }
                });
                console.log('[DashboardClient] Updated Cognito attributes with tenant ID from fallback');
              } catch (updateError) {
                console.warn('[DashboardClient] Could not update Cognito attributes:', updateError);
              }
              
              // Set up AWS RDS tables for this tenant
              await setupAwsRdsTables(tenantId);
              
              return tenantId;
            }
          }
        } catch (fallbackError) {
          console.warn('[DashboardClient] Could not get tenant ID from fallback API:', fallbackError);
        }
        
        console.warn('[DashboardClient] Could not determine tenant ID from any source');
        return null;
      } catch (error) {
        console.error('[DashboardClient] Error ensuring consistent tenant ID:', error);
        return null;
      }
    };
    
    // Run the consistency check
    ensureConsistentTenantId();
    
    // First check if user is authenticated by fetching Cognito attributes
    const checkOnboardingStatus = async () => {
      try {
        // Get onboarding status information from Cognito
        const onboardingInfo = await getOnboardingStatusFromCognito();
        
        // If we have valid onboarding status
        if (onboardingInfo) {
          const { onboardingStatus, setupCompleted, step } = onboardingInfo;
          
          // Check if onboarding is complete
          if (setupCompleted || onboardingStatus.toLowerCase() === 'complete') {
            // Onboarding is complete
            setSetupMode('');
            return true;
          }
          
          // Onboarding is not complete, determine the step
          switch (step) {
            case 'business-info':
              setSetupMode('business-info');
              break;
            case 'subscription':
              setSetupMode('subscription');
              break;
            case 'payment':
              setSetupMode('payment');
              break;
            case 'setup':
              setSetupMode('setup');
              break;
            default:
              // Default to business-info if we can't determine the step
              setSetupMode('business-info');
              break;
          }
          
          // Onboarding is not complete
          return false;
        }
        
        // Default to showing business info setup if we couldn't determine status
        setSetupMode('business-info');
        return false;
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to business info setup in case of error
        setSetupMode('business-info');
        return false;
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
  
  // Function to refresh user data - now uses session hook
  const refreshUserData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('[DashboardClient] Refreshing user data via session');
      await refreshSession();
      return session?.user || null;
    } catch (error) {
      console.error('[DashboardClient] Error refreshing user data:', error);
      return null;
    }
  }, [isAuthenticated, refreshSession, session?.user]);
  
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

  // Handle tenant creation if needed
  useEffect(() => {
    if (createTenant && businessId) {
      const createTenantForUser = async () => {
        try {
          console.log('[DashboardClient] Creating tenant for user with business ID:', businessId);
          
          // Get user attributes
          // Auth0 doesn't use fetchUserAttributes
      const userAttributes = {};
          
          // Call tenant manager API
          const tenantResponse = await fetch('/api/tenant/tenant-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_id: businessId,
              user_id: userAttributes.sub,
              business_name: userAttributes['custom:businessname'],
              forceCreate: true
            })
          });
          
          if (tenantResponse.ok) {
            const result = await tenantResponse.json();
            
            if (result.success && result.tenantId) {
              console.log('[DashboardClient] Tenant created successfully:', result.tenantId);
              
              // Update user attributes with tenant ID
              const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      await updateUserAttributes({
                userAttributes: {
                  'custom:tenant_id': result.tenantId,
                  'custom:updated_at': new Date().toISOString()
                }
              });
              
              // Store tenant ID and redirect
              // Initialize app cache if it doesn't exist
              if (typeof window !== 'undefined') {
                // Initialize app cache properly
if (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {
  appCache.set('auth', {});
  appCache.set('user', {});
  appCache.set('tenant', {});
}
                if (!appCache.get('tenant')) appCache.set('tenant', {});
                appCache.set('tenant.id', result.tenantId);
              }
              
              setTenantId(result.tenantId);
              setTenantCreated(true);
              
              // Redirect to tenant dashboard
              router.push(`/${result.tenantId}/dashboard?freePlan=true&newTenant=true`);
            } else {
              console.error('[DashboardClient] Failed to create tenant:', result);
            }
          } else {
            console.error('[DashboardClient] Tenant creation API failed');
          }
        } catch (error) {
          console.error('[DashboardClient] Error creating tenant:', error);
        }
      };
      
      createTenantForUser();
    }
  }, [createTenant, businessId, router]);

  return (
    <div className="relative">
      <div className={cls(styles.dashboardContainer)}>
        {/* Dashboard content */}
      </div>
    </div>
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

/**
 * Get business name from Cognito attributes
 * @returns {Promise<string>} Business name or default value
 */
async function getBusinessNameFromCognito() {
  try {
    // Get attributes from Cognito
    const { fetchUserAttributes } = await import('@/utils/auth0Adapter');
      const attributes = await fetchUserAttributes();
    
    // Check for business name in various attributes
    const businessName = attributes['custom:businessname'] ||
                       attributes['custom:business_name'] || 
                       attributes['custom:tenant_name'];
                       
    if (businessName) {
      return businessName;
    }
    
    // If no business name found, try to construct one from user info
    const firstName = attributes.given_name || attributes.name?.split(' ')[0] || '';
    if (firstName) {
      return `${firstName}'s Business`;
    }
    
    // Last resort - use email prefix
    if (attributes.email) {
      const emailPrefix = attributes.email.split('@')[0];
      return `${emailPrefix}'s Business`;
    }
    
    // Default value if no other options
    return '';
  } catch (error) {
    logger.error('[DashboardClient] Error getting business name from Cognito:', error);
    return '';
  }
}

/**
 * Get onboarding status and step information from Cognito
 * @returns {Promise<Object>} Onboarding information
 */
async function getOnboardingStatusFromCognito() {
  try {
    // Get attributes from Cognito
    const { fetchUserAttributes } = await import('@/utils/auth0Adapter');
      const attributes = await fetchUserAttributes();
    
    // Get onboarding status
    const onboardingStatus = attributes['custom:onboarding'] || 'PENDING';
    const setupCompleted = attributes['custom:setupdone']?.toLowerCase() === 'true' || 
                         onboardingStatus?.toLowerCase() === 'complete';
    
    // Check completion of individual steps
    const businessInfoDone = attributes['custom:business_info_done'] === 'TRUE';
    const subscriptionDone = attributes['custom:subscription_done'] === 'TRUE';
    const paymentDone = attributes['custom:payment_done'] === 'TRUE';
    
    // Determine step based on completions
    let step = 'business-info';
    if (businessInfoDone && !subscriptionDone) {
      step = 'subscription';
    } else if (businessInfoDone && subscriptionDone && !paymentDone) {
      step = 'payment';
    } else if (businessInfoDone && subscriptionDone && paymentDone && !setupCompleted) {
      step = 'setup';
    } else if (setupCompleted) {
      step = 'complete';
    }
    
    return {
      onboardingStatus: onboardingStatus,
      setupCompleted: setupCompleted,
      step: step,
      businessInfoDone: businessInfoDone,
      subscriptionDone: subscriptionDone,
      paymentDone: paymentDone
    };
  } catch (error) {
    logger.error('[DashboardClient] Error getting onboarding status from Cognito:', error);
    return {
      onboardingStatus: 'PENDING',
      setupCompleted: false,
      step: 'business-info',
      businessInfoDone: false,
      subscriptionDone: false,
      paymentDone: false
    };
  }
}

/**
 * Generate a business name from Cognito attributes
 * @returns {Promise<string>} Generated business name
 */
const generateBusinessName = async () => {
  try {
    // Get attributes from Cognito
    const { fetchUserAttributes } = await import('@/utils/auth0Adapter');
      const attributes = await fetchUserAttributes();
    
    // Try to find business name in user attributes
    const businessName = attributes['custom:businessname'] || 
                       attributes['custom:tenant_name'] || 
                       attributes['custom:business_name'];
    
    if (businessName) {
      return businessName;
    }
    
    // Try to construct from user names
    const firstName = attributes.given_name || 
                    attributes.name?.split(' ')[0] || 
                    null;
    
    if (firstName) {
      return `${firstName}'s Business`;
    }
    
    // Try to extract from email
    if (attributes.email) {
      const emailPrefix = attributes.email.split('@')[0]
                        .replace(/[^a-zA-Z0-9]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
      return `${emailPrefix}'s Business`;
    }
    
    // Default name if nothing else works
    return '';
  } catch (error) {
    logger.error('[DashboardClient] Error generating business name:', error);
    return '';
  }
}; 