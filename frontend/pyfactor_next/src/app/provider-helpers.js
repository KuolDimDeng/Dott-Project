'use client';

// Common imports for auth-related providers
import { Amplify } from 'aws-amplify';
import { configureAmplify } from '@/config/amplifyUnified';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import dynamic from 'next/dynamic';

// Dynamically import SessionDebugger with no SSR
const SessionDebugger = dynamic(() => import('@/components/SessionDebugger'), { ssr: false });

// Function to clear all development flags on startup
const clearDevFlags = () => {
  if (typeof window !== 'undefined') {
    console.log('🧹 Clearing all development flags and cookies for production mode...');
    
    // Clear localStorage items
    const devKeys = [
      'dev-user-name', 'dev-authenticated', 'dev-mode', 'bypassAuthValidation',
      'dev-tenant-id', 'dev-tenant-name', 'dev-business-type', 'dev-subscription-plan',
      'dev-initials', 'authSuccess', 'authUser', 'authTimestamp'
    ];
    
    devKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Clear cookies
    const devCookies = [
      'businessName', 'businessType', 'authUser', 'bypassAuthValidation',
      'dev-tenant-id', 'tenantId', 'dev-mode', 'hasSession'
    ];
    
    devCookies.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    
    console.log('✅ All development flags cleared for production mode');
  }
};

// Call clearDevFlags immediately when this module loads in client side
if (typeof window !== 'undefined') {
  clearDevFlags();
}

// Auto-setup for direct bypass (specific user: Kuol Deng)
const setupDirectBypass = () => {
  // Disable direct bypass regardless of environment
  return;

  // Original implementation commented out
  /* 
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('🔧 Setting up direct bypass for development...');
    
    // Set up specific user for Kuol Deng
    const userData = {
      name: 'Kuol Deng',
      email: 'kuol.deng@example.com',
      businessId: '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
      businessName: 'Juba Cargo Village',
      businessType: 'Logistics',
      subscriptionPlan: 'free'
    };
    
    // Store in localStorage
    localStorage.setItem('dev-user-name', userData.name);
    localStorage.setItem('dev-authenticated', 'true');
    localStorage.setItem('dev-mode', 'true');
    localStorage.setItem('bypassAuthValidation', 'true');
    localStorage.setItem('dev-tenant-id', userData.businessId);
    localStorage.setItem('dev-tenant-name', userData.businessName);
    localStorage.setItem('dev-business-type', userData.businessType);
    localStorage.setItem('dev-subscription-plan', userData.subscriptionPlan);
    localStorage.setItem('dev-initials', 'KD');
    
    // Check if cookies are already set to avoid double-setting
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    // Log current cookie values for debugging
    const businessNameCookie = getCookie('businessName');
    console.log('Checking cookies before setup:');
    console.log('- businessName:', businessNameCookie);
    if (businessNameCookie) {
      try {
        console.log('- decoded once:', decodeURIComponent(businessNameCookie));
        if (businessNameCookie.includes('%25')) {
          console.log('- decoded twice:', decodeURIComponent(decodeURIComponent(businessNameCookie)));
        }
      } catch (e) {
        console.error('Error decoding cookie:', e);
      }
    }
    
    // Check for double encoding or other issues
    const hasEncodingIssue = businessNameCookie && (
      businessNameCookie.includes('%25') || // Double encoded % sign
      businessNameCookie !== encodeURIComponent(userData.businessName) // Different from expected value
    );
    
    // Always clear cookies for consistent behavior during development
    console.log('Clearing existing cookies to ensure fresh state...');
    document.cookie = 'businessName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'businessType=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'authUser=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'bypassAuthValidation=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'dev-tenant-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'tenantId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Set cookies for API requests - ensuring values are properly encoded just once
    console.log('Setting properly encoded cookies...');
    const encodedBusinessName = encodeURIComponent(userData.businessName);
    const encodedBusinessType = encodeURIComponent(userData.businessType);
    const encodedEmail = encodeURIComponent(userData.email);
    
    document.cookie = `bypassAuthValidation=true; path=/; max-age=86400`;
    document.cookie = `authUser=${encodedEmail}; path=/; max-age=86400`;
    document.cookie = `dev-tenant-id=${userData.businessId}; path=/; max-age=86400`;
    document.cookie = `tenantId=${userData.businessId}; path=/; max-age=86400`;
    document.cookie = `businessName=${encodedBusinessName}; path=/; max-age=86400`;
    document.cookie = `businessType=${encodedBusinessType}; path=/; max-age=86400`;
    
    // Log the new cookie values to verify
    console.log('New cookie values set:');
    console.log('- businessName:', getCookie('businessName'));
    console.log('- businessName decoded:', decodeURIComponent(getCookie('businessName')));
    console.log('- businessType:', getCookie('businessType'));
    console.log('- authUser:', getCookie('authUser'));
    
    // Set session storage values
    sessionStorage.setItem('tenant_id', userData.businessId);
    sessionStorage.setItem('business-type', userData.businessType);
    sessionStorage.setItem('subscription-plan', userData.subscriptionPlan);
    sessionStorage.setItem('user-initials', 'KD');
    
    console.log('✅ Auto-setup complete for Kuol Deng at Juba Cargo Village');
  }
  */
};

// Add global debug tools
if (false) { // Disable dev tools regardless of environment
  // Auto-setup on page load for direct access
  setupDirectBypass();
  
  window.authDebug = {
    // Auth debug tools are disabled in production mode
  };
  
  console.log('%c🛠️ Dev tools disabled in production mode', 'font-weight: bold; font-size: 14px; color: #1E40AF');
}

/**
 * Helper to configure Amplify for authentication
 */
export function useConfigureAmplify() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isConfigured) return;
    
    try {
      logger.debug('[useConfigureAmplify] Configuring Amplify');
      const configResult = configureAmplify();
      logger.debug('[useConfigureAmplify] Amplify configured successfully');
      setIsConfigured(true);
    } catch (e) {
      logger.error('[useConfigureAmplify] Error configuring Amplify:', e);
      setError(e);
    }
  }, [isConfigured]);

  return { isConfigured, error };
}

/**
 * Simple provider wrapper that configures Amplify
 */
export function SimpleProviderWrapper({ children }) {
  const { isConfigured, error } = useConfigureAmplify();
  
  // Development error display only shown in development mode
  if (error && process.env.NODE_ENV === 'development') {
    return (
      <div style={{ 
        padding: '10px', 
        margin: '10px',
        background: '#fee2e2', 
        border: '1px solid #ef4444',
        borderRadius: '4px'
      }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#b91c1c' }}>
          Error configuring authentication
        </h3>
        <pre style={{ margin: '0', fontSize: '0.8rem', overflow: 'auto' }}>
          {error.message || JSON.stringify(error)}
        </pre>
      </div>
    );
  }
  
  return (
    <>
      {children}
      <SessionDebugger />
    </>
  );
} 