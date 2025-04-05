'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import DashboardWrapper from './DashboardWrapper';
import { useRouter } from 'next/navigation';
import { COOKIE_NAMES, ONBOARDING_STATUS } from '@/constants/onboarding';
import { fetchAuthSession, fetchUserAttributes } from '@aws-amplify/auth';
import { CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';
import React from 'react';

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
    // Try to get from localStorage businessInfo
    const businessInfo = localStorage.getItem('businessInfo');
    if (businessInfo) {
      try {
        const parsedInfo = JSON.parse(businessInfo);
        if (parsedInfo.businessName) return parsedInfo.businessName;
      } catch (e) {
        // Invalid JSON, continue to other methods
      }
    }
    
    // Try localStorage direct key
    const businessName = localStorage.getItem('businessName');
    if (businessName) return businessName;
    
    // Try cookies
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    return getCookie('businessName');
  } catch (e) {
    return null;
  }
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

export default function DashboardClient({ newAccount, plan }) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantVerified, setTenantVerified] = useState(false);
  const [setupStatus, setSetupStatus] = useState('pending');
  const [error, setError] = useState(null);
  
  // Replace constant logging with first-render-only logging
  const isFirstRender = React.useRef(true);
  if (isFirstRender.current) {
    console.log('DashboardClient initial render with props:', { newAccount, plan });
    isFirstRender.current = false;
  }
  
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
            const businessName = getBestBusinessName() || 'My Business';
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
              return localStorage.getItem('businessName');
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
      
      // Use a simple crypto algorithm to create a v5 UUID
      // In production, we would use a proper UUID generator
      const hash = Array.from(userId).reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
      }, 0).toString(16);
      
      // Format as UUID
      const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
      logger.info('[DashboardClient] Generated deterministic tenant ID from user ID:', uuid);
      
      return uuid;
    } catch (e) {
      logger.error('[DashboardClient] Error generating tenant ID:', e);
      return null;
    }
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
  
  // This ensures we're only rendering on the client
  useEffect(() => {
    setIsClient(true);
    
    // Initialize database and ensure tables exist
    const initializeDatabase = async () => {
      try {
        logger.info('[DashboardClient] Initializing database on client mount');
        
        // First create the table
        const createTableResponse = await fetch('/api/tenant/create-table');
        if (createTableResponse.ok) {
          logger.info('[DashboardClient] Table creation successful or already exists');
        } else {
          logger.warn('[DashboardClient] Table creation response:', await createTableResponse.text());
        }
        
        // Then initialize the database environment
        const initResponse = await fetch('/api/tenant/init-db-env');
        if (initResponse.ok) {
          logger.info('[DashboardClient] Database environment initialized');
        } else {
          logger.warn('[DashboardClient] Database initialization response:', await initResponse.text());
        }
      } catch (error) {
        logger.error('[DashboardClient] Error initializing database:', error);
      }
    };
    
    // Run database initialization immediately
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
          logger.info('[DashboardClient] Tenant ID inconsistency detected, fetching from server');
          
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
                logger.info('[DashboardClient] Retrieved tenant ID from server:', data.tenantId);
                localStorage.setItem('tenantId', data.tenantId);
                document.cookie = `tenantId=${data.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                
                // Also store the source for debugging
                if (data.source) {
                  logger.debug('[DashboardClient] Tenant ID source:', data.source);
                }
              } else {
                // If server doesn't have a tenant ID for this user, get from Cognito
                try {
                  const userAttributes = await fetchUserAttributes();
                  const cognitoTenantId = userAttributes['custom:businessid'];
                  
                  if (cognitoTenantId) {
                    logger.info('[DashboardClient] Using tenant ID from Cognito:', cognitoTenantId);
                    localStorage.setItem('tenantId', cognitoTenantId);
                    document.cookie = `tenantId=${cognitoTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    
                    // Ensure tenant record exists in database and update server
                    try {
                      // First ensure the tenant record exists in the database
                      const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          tenantId: cognitoTenantId,
                          userId: userAttributes.sub,
                          email: userAttributes.email,
                          businessName: userAttributes['custom:businessname'] || 'My Business'
                        })
                      });
                      
                      if (tenantResponse.ok) {
                        const tenantData = await tenantResponse.json();
                        logger.info('[DashboardClient] Tenant record created in database:', tenantData);
                      } else {
                        logger.warn('[DashboardClient] Failed to create tenant record in database:', 
                          await tenantResponse.text().catch(() => 'Unknown error'));
                      }
                      
                      // Also update the tenant API
                      await fetch('/api/user/tenant', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tenantId: cognitoTenantId })
                      });
                      logger.debug('[DashboardClient] Updated server with Cognito tenant ID');
                    } catch (updateError) {
                      logger.warn('[DashboardClient] Failed to update server with tenant ID:', updateError);
                    }
                  } else {
                    // Generate a deterministic UUID based on user ID if possible
                    // This ensures the same user always gets the same tenant ID
                    try {
                      // Generate a deterministic UUID based on user sub
                      const userId = userAttributes.sub;
                      const { v5: uuidv5 } = require('uuid');
                      const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                      const deterministicTenantId = uuidv5(userId, TENANT_NAMESPACE);
                      
                      logger.info('[DashboardClient] Generated deterministic tenant ID from user ID:', deterministicTenantId);
                      localStorage.setItem('tenantId', deterministicTenantId);
                      document.cookie = `tenantId=${deterministicTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    } catch (uuidError) {
                      // If deterministic generation fails, fall back to random UUID as absolute last resort
                      const newTenantId = crypto.randomUUID();
                      logger.warn('[DashboardClient] UUID error, generated random tenant ID as last resort:', newTenantId);
                      localStorage.setItem('tenantId', newTenantId);
                      document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    }
                    
                    // Ensure tenant exists in database and update server
                    try {
                      // Get the final tenant ID (from either deterministicTenantId or newTenantId)
                      const finalTenantId = localStorage.getItem('tenantId');
                      
                      // Initialize the database environment first
                      try {
                        const initResponse = await fetch('/api/tenant/init-db-env');
                        if (initResponse.ok) {
                          const initData = await initResponse.json();
                          logger.info('[DashboardClient] Database environment initialization:', 
                            initData.success ? 'successful' : 'failed',
                            'Table exists:', initData.tableExists);
                        }
                      } catch (initError) {
                        logger.warn('[DashboardClient] Error initializing database environment:', initError.message);
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
                          businessName: userAttributes['custom:businessname'] || 'My Business',
                          forceCreate: true
                        })
                      });
                      
                      if (tenantResponse.ok) {
                        const tenantData = await tenantResponse.json();
                        logger.info('[DashboardClient] Generated tenant ID saved to database:', tenantData);
                      } else {
                        logger.warn('[DashboardClient] Failed to save generated tenant ID to database:', 
                          await tenantResponse.text().catch(() => 'Unknown error'));
                      }
                      
                      // Also update the tenant API
                      await fetch('/api/user/tenant', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tenantId: finalTenantId })
                      });
                      logger.debug('[DashboardClient] Updated server with generated tenant ID');
                    } catch (updateError) {
                      logger.warn('[DashboardClient] Failed to update server with tenant ID:', updateError);
                    }
                  }
                } catch (cognitoError) {
                  logger.error('[DashboardClient] Error fetching Cognito attributes:', cognitoError);
                }
              }
            } else {
              // If API request fails, fall back to Cognito
              logger.warn('[DashboardClient] Tenant API request failed, falling back to Cognito');
              try {
                const userAttributes = await fetchUserAttributes();
                const cognitoTenantId = userAttributes['custom:businessid'];
                
                if (cognitoTenantId) {
                  logger.info('[DashboardClient] Using tenant ID from Cognito after API failure:', cognitoTenantId);
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
                      
                      logger.info('[DashboardClient] Generated deterministic tenant ID from user ID:', generatedTenantId);
                      localStorage.setItem('tenantId', generatedTenantId);
                      document.cookie = `tenantId=${generatedTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    } else {
                      // Random UUID as absolute last resort
                      const newTenantId = crypto.randomUUID();
                      logger.warn('[DashboardClient] No user ID available, using random UUID:', newTenantId);
                      localStorage.setItem('tenantId', newTenantId);
                      document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                    }
                  } catch (uuidError) {
                    // If UUID generation fails, use simple random UUID
                    const newTenantId = crypto.randomUUID();
                    logger.error('[DashboardClient] UUID generation error, using random UUID:', newTenantId);
                    localStorage.setItem('tenantId', newTenantId);
                    document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                  }
                }
              } catch (cognitoError) {
                logger.error('[DashboardClient] Error fetching Cognito attributes after API failure:', cognitoError);
                // Ultimate fallback - generate random UUID
                const newTenantId = crypto.randomUUID();
                logger.warn('[DashboardClient] All tenant ID sources failed, using random UUID:', newTenantId);
                localStorage.setItem('tenantId', newTenantId);
                document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
              }
            }
          } catch (fetchError) {
            logger.error('[DashboardClient] Error fetching tenant ID from server:', fetchError);
          }
        }
      } catch (e) {
        // Log but don't throw errors
        logger.error('[DashboardClient] Error ensuring consistent tenant ID:', e);
      }
    };
    
    // Run the consistency check
    ensureConsistentTenantId();
    
    // First check if user is authenticated by fetching Cognito attributes
    const checkOnboardingStatus = async () => {
      try {
        logger.info('[DashboardClient] Starting authentication and onboarding status check');
        
        // First check if we have a valid auth session
        const session = await fetchAuthSession();
        if (!session?.tokens?.accessToken) {
          logger.warn('[DashboardClient] No valid auth session found, will redirect to sign-in');
          // Add delay to see logs before redirect
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/auth/signin');
          return;
        }
        
        // Get user attributes to check onboarding status
        try {
          const userAttributes = await fetchUserAttributes();
          logger.info('[DashboardClient] User attributes fetched:', {
            hasBusinessId: !!userAttributes['custom:businessid'],
            hasBusinessName: !!userAttributes['custom:businessname'],
            onboardingStatus: userAttributes['custom:onboarding'],
            setupDone: userAttributes['custom:setupdone']
          });
          
          // ENHANCED CHECK: If user has completed onboarding according to Cognito, we're good
          if (userAttributes['custom:onboarding']?.toLowerCase() === 'complete' || 
              userAttributes['custom:setupdone']?.toLowerCase() === 'true') {
            logger.info('[DashboardClient] User has completed onboarding, showing dashboard');
            
            // Check for tenant ID to ensure RLS works properly
            if (!userAttributes['custom:businessid']) {
              logger.warn('[DashboardClient] Missing tenant ID in Cognito, will generate one for RLS');
              // Generate a deterministic UUID from user ID to ensure consistency
              try {
                const { v5: uuidv5 } = require('uuid');
                const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
                const generatedTenantId = uuidv5(userAttributes.sub, TENANT_NAMESPACE);
                
                // Add this to the attributes that need updating
                userAttributes['custom:businessid'] = generatedTenantId;
                localStorage.setItem('tenantId', generatedTenantId);
                document.cookie = `tenantId=${generatedTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                logger.info('[DashboardClient] Generated tenant ID for RLS:', generatedTenantId);
              } catch (e) {
                logger.error('[DashboardClient] Error generating tenant ID:', e);
              }
            }
            
            // Fix any missing attributes in the background
            ensureUserAttributesComplete(session, userAttributes)
              .then(result => logger.debug('[DashboardClient] Attribute check result:', result))
              .catch(err => logger.error('[DashboardClient] Background attribute check error:', err));
              
            setIsReady(true);
            return;
          }
        } catch (attrError) {
          logger.warn('[DashboardClient] Error fetching user attributes, using cookies as fallback:', attrError);
          
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
            logger.info('[DashboardClient] Cookies indicate onboarding is complete, showing dashboard');
            setIsReady(true);
            return;
          }
        }
        
        // Set isReady true even if we don't have attributes or cookies
        // The DashboardWrapper will handle further verification
        logger.info('[DashboardClient] Proceeding to dashboard, DashboardWrapper will handle verification');
        setIsReady(true);
        
      } catch (error) {
        // Log error and redirect
        logger.error('[DashboardClient] Error checking auth status:', error);
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
  
  // Only render on the client to prevent SSR issues
  if (!isClient || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-400 mb-4"></div>
            <div className="h-4 w-32 bg-gray-400 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <p className="mt-4 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (isVerifyingTenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <CircularProgress />
          </div>
          <p className="mt-4 text-gray-600">Verifying account information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="mb-4 text-gray-700">{error}</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  console.log('🚀 Rendering DashboardWrapper with:', { newAccount, plan });
  
  return (
    <DashboardWrapper 
      newAccount={newAccount} 
      plan={plan}
      setupStatus={setupStatus}
    />
  );
} 