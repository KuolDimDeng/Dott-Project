'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import DashboardWrapper from './DashboardWrapper';
import { useRouter } from 'next/navigation';
import { COOKIE_NAMES, ONBOARDING_STATUS } from '@/constants/onboarding';
import { fetchAuthSession, fetchUserAttributes } from '@aws-amplify/auth';

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
  
  console.log('Dashboard rendering with props:', { newAccount, plan });
  
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
            attributesToUpdate[attr] = userData['custom:businessid'] || crypto.randomUUID();
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

  // This ensures we're only rendering on the client
  useEffect(() => {
    setIsClient(true);
    
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
        
        // Set isReady to true since we have a valid session
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
  
  console.log('🚀 Rendering DashboardWrapper with:', { newAccount, plan });
  return <DashboardWrapper newAccount={newAccount} plan={plan} />;
} 