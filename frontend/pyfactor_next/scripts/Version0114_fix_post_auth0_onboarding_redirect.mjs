/**
 * Version0114_fix_post_auth0_onboarding_redirect.mjs
 * 
 * This script fixes the issue where users are redirected to onboarding 
 * after signing out and back in, even when they've already completed the onboarding process.
 * 
 * The fix improves the auth callback flow to properly check and persist onboarding status.
 */

import fs from 'fs';
import path from 'path';

// Create backups before making changes
const backupFiles = [
  'src/app/api/auth/callback/route.js',
  'src/app/auth/callback/page.js',
  'src/utils/tenantUtils.js'
];

const createBackup = (filePath) => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const backupPath = `${filePath}.backup_${dateStr}`;
  
  if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
    console.log(`Creating backup of ${filePath}`);
    fs.copyFileSync(filePath, backupPath);
    return true;
  }
  return false;
};

// Create backups of files we're going to modify
backupFiles.forEach(file => createBackup(file));

// 1. Update the auth callback route.js to improve onboarding status persistence
const updateAuthCallbackRoute = () => {
  const callbackRoutePath = 'src/app/api/auth/callback/route.js';
  if (!fs.existsSync(callbackRoutePath)) {
    console.warn(`File ${callbackRoutePath} does not exist, skipping modification`);
    return;
  }

  let content = fs.readFileSync(callbackRoutePath, 'utf8');
  
  // We need to enhance how the callback route handles onboarding status after successful auth
  // Look for the successful callback handling section
  if (content.includes('// Successful callback')) {
    content = content.replace(
      /\/\/ Successful callback[^}]*?const url = `\/auth\/callback`;/s,
      `// Successful callback
      // Include onboarding status in the redirect URL for persistence
      // This allows the callback page to access this information
      const onboardingStatusParam = searchParams.get('onboardingStatus') || 'unknown';
      const tenantIdParam = searchParams.get('tenantId') || '';
      
      // Enhanced redirect with onboarding info to improve post-login state persistence
      const url = \`/auth/callback?onboardingStatus=\${onboardingStatusParam}&tenantId=\${tenantIdParam}\`;`
    );
  } else {
    // If we can't find the exact match, look for the redirect URL construction
    content = content.replace(
      /const url = `\/auth\/callback`;/,
      `// Enhanced redirect with onboarding info to improve post-login state persistence
      const onboardingStatusParam = searchParams.get('onboardingStatus') || 'unknown';
      const tenantIdParam = searchParams.get('tenantId') || '';
      const url = \`/auth/callback?onboardingStatus=\${onboardingStatusParam}&tenantId=\${tenantIdParam}\`;`
    );
  }
  
  fs.writeFileSync(callbackRoutePath, content);
  console.log('Updated auth callback route with enhanced onboarding persistence');
};

// 2. Update the callback page to enhance the post-auth flow
const updateCallbackPage = () => {
  const callbackPagePath = 'src/app/auth/callback/page.js';
  
  // Create the file if it doesn't exist
  if (!fs.existsSync(callbackPagePath)) {
    const defaultContent = `'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Auth0Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Authenticating...');
  const [error, setError] = useState(null);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isLoading) return;
        
        setStatus('Checking authentication...');
        
        if (!user) {
          setStatus('Authentication failed, redirecting to login...');
          setTimeout(() => {
            router.push('/auth/signin');
          }, 2000);
          return;
        }

        setStatus('Authenticated, checking onboarding status...');
        
        // Get onboarding status from URL parameters if available
        const onboardingStatus = searchParams.get('onboardingStatus');
        const tenantId = searchParams.get('tenantId');
        
        // Attempt to load onboarding status from API
        const apiResponse = await fetch('/api/onboarding/status' + (tenantId ? \`?tenantId=\${tenantId}\` : ''));
        let onboardingData = {};
        
        if (apiResponse.ok) {
          onboardingData = await apiResponse.json();
        } else {
          console.warn('Failed to fetch onboarding status from API');
        }
        
        // Check if onboarding is completed from multiple sources
        const isComplete = 
          onboardingStatus === 'complete' || 
          onboardingData?.status === 'complete' ||
          (typeof localStorage !== 'undefined' && localStorage.getItem(\`onboarding_\${tenantId}\`) === 'complete');
        
        // If any source indicates completion, store and redirect to dashboard
        if (isComplete) {
          setStatus('Onboarding complete, redirecting to dashboard...');
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(\`onboarding_\${tenantId}\`, 'complete');
          }
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
          return;
        }
        
        // If we have an onboarding status but it's not complete, redirect to the appropriate step
        if (onboardingData?.currentStep && onboardingData.currentStep !== 'complete') {
          setStatus(\`Redirecting to onboarding: \${onboardingData.currentStep}...\`);
          setTimeout(() => {
            router.push(\`/onboarding/\${onboardingData.currentStep.replace('_', '-')}\`);
          }, 1000);
          return;
        }
        
        // Default: redirect to business info
        setStatus('Redirecting to start onboarding...');
        setTimeout(() => {
          router.push('/onboarding/business-info');
        }, 1000);
      } catch (error) {
        console.error('Error in auth callback:', error);
        setError(error.message);
        setStatus('Error during authentication');
      }
    };

    checkAuth();
  }, [user, isLoading, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <LoadingSpinner />
      <h2 className="mt-4 text-xl font-semibold">{status}</h2>
      {error && <p className="mt-2 text-red-500">{error}</p>}
    </div>
  );
}`;
    
    fs.writeFileSync(callbackPagePath, defaultContent);
  } else {
    // Update existing file
    let content = fs.readFileSync(callbackPagePath, 'utf8');
    
    // Update the file to check for onboarding status from URL params
    if (content.includes('const checkAuth = async () => {')) {
      // Add URL parameter checking
      content = content.replace(
        /const checkAuth = async \(\) => {([^}]*?)\/\/ Attempt to load onboarding status/s,
        `const checkAuth = async () => {$1// Get onboarding status from URL parameters if available
        const onboardingStatus = searchParams.get('onboardingStatus');
        const tenantId = searchParams.get('tenantId');
        
        // Attempt to load onboarding status`
      );
      
      // Enhance the completion check to use multiple sources
      content = content.replace(
        /const isComplete = ([^;]*?);/s,
        `// Check if onboarding is completed from multiple sources
        const isComplete = 
          onboardingStatus === 'complete' || 
          $1 ||
          (typeof localStorage !== 'undefined' && localStorage.getItem(\`onboarding_\${tenantId}\`) === 'complete');`
      );
      
      // Improve persistence by storing the status
      content = content.replace(
        /if \(isComplete\) {([^}]*?)router\.push\('\/dashboard'\);/s,
        `if (isComplete) {$1// Store completion status in localStorage for better persistence
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(\`onboarding_\${tenantId}\`, 'complete');
          }
          router.push('/dashboard');`
      );
    }
    
    fs.writeFileSync(callbackPagePath, content);
  }
  
  console.log('Updated callback page with enhanced onboarding status handling');
};

// 3. Enhance tenantUtils.js to better handle onboarding persistence
const updateTenantUtils = () => {
  const tenantUtilsPath = 'src/utils/tenantUtils.js';
  if (!fs.existsSync(tenantUtilsPath)) {
    console.warn(`File ${tenantUtilsPath} does not exist, skipping modification`);
    return;
  }

  let content = fs.readFileSync(tenantUtilsPath, 'utf8');
  
  // Add or enhance the getOnboardingStatus function
  if (content.includes('export const getOnboardingStatus')) {
    // Update existing function to check multiple sources
    content = content.replace(
      /export const getOnboardingStatus = async[^}]*}/s,
      `export const getOnboardingStatus = async (tenantId) => {
  try {
    // Try to fetch from API first
    const response = await fetch(\`/api/onboarding/status?tenantId=\${tenantId}\`);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    console.warn('Failed to fetch onboarding status from API, checking localStorage');
    
    // Check localStorage fallback
    if (typeof localStorage !== 'undefined') {
      const localStatus = localStorage.getItem(\`onboarding_\${tenantId}\`);
      if (localStatus === 'complete') {
        return {
          status: 'complete',
          currentStep: 'complete',
          completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
          businessInfoCompleted: true,
          subscriptionCompleted: true,
          paymentCompleted: true,
          setupCompleted: true
        };
      }
    }
    
    // Default to not started
    return {
      status: 'not_started',
      currentStep: 'business_info',
      completedSteps: []
    };
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}`
    );
  } else {
    // Add the function if it doesn't exist
    content += `
// Get onboarding status with multi-source fallbacks
export const getOnboardingStatus = async (tenantId) => {
  try {
    // Try to fetch from API first
    const response = await fetch(\`/api/onboarding/status?tenantId=\${tenantId}\`);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    console.warn('Failed to fetch onboarding status from API, checking localStorage');
    
    // Check localStorage fallback
    if (typeof localStorage !== 'undefined') {
      const localStatus = localStorage.getItem(\`onboarding_\${tenantId}\`);
      if (localStatus === 'complete') {
        return {
          status: 'complete',
          currentStep: 'complete',
          completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
          businessInfoCompleted: true,
          subscriptionCompleted: true,
          paymentCompleted: true,
          setupCompleted: true
        };
      }
    }
    
    // Default to not started
    return {
      status: 'not_started',
      currentStep: 'business_info',
      completedSteps: []
    };
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
};`;
  }
  
  // Add or enhance the saveOnboardingStatus function
  if (content.includes('export const saveOnboardingStatus')) {
    // Update existing function
    content = content.replace(
      /export const saveOnboardingStatus = async[^}]*}/s,
      `export const saveOnboardingStatus = async (tenantId, status) => {
  try {
    // Save to API
    const response = await fetch('/api/onboarding/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({ status })
    });
    
    // Also save to localStorage for redundancy
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(\`onboarding_\${tenantId}\`, status);
    }
    
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(\`Failed to save onboarding status: \${response.status}\`);
  } catch (error) {
    console.error('Error saving onboarding status:', error);
    throw error;
  }
}`
    );
  } else {
    // Add the function if it doesn't exist
    content += `
// Save onboarding status with multi-source persistence
export const saveOnboardingStatus = async (tenantId, status) => {
  try {
    // Save to API
    const response = await fetch('/api/onboarding/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({ status })
    });
    
    // Also save to localStorage for redundancy
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(\`onboarding_\${tenantId}\`, status);
    }
    
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(\`Failed to save onboarding status: \${response.status}\`);
  } catch (error) {
    console.error('Error saving onboarding status:', error);
    throw error;
  }
};`;
  }
  
  fs.writeFileSync(tenantUtilsPath, content);
  console.log('Updated tenant utils with enhanced onboarding status functions');
};

// Apply all updates
updateAuthCallbackRoute();
updateCallbackPage();
updateTenantUtils();

// Create documentation file
const docContent = `# Onboarding Status Persistence Fix

## Problem

Users who completed the onboarding process were being redirected back to onboarding after signing out and signing back in, even though their onboarding was already complete.

## Root Causes

1. **Multiple Storage Locations**: Onboarding status is stored in multiple places:
   - Backend database (Django OnboardingProgress model)
   - Auth0 user attributes
   - Browser localStorage
   
2. **Synchronization Issues**: These storage locations weren't properly synchronized.

3. **Data Loss During Auth Flow**: During the authentication flow, the onboarding status information was being lost or not properly passed through.

## Solution

The fix implements a comprehensive approach to onboarding status persistence:

1. **Enhanced Auth Callback Flow**:
   - Pass onboarding status through URL parameters during authentication
   - Check multiple sources for onboarding status
   - Implement redundant storage mechanisms

2. **Improved Tenant Utils**:
   - Added robust getOnboardingStatus function with fallbacks
   - Enhanced saveOnboardingStatus to save to multiple locations

3. **Auth Callback Page Improvements**:
   - Better status checking from multiple sources
   - Improved error handling
   - Better redirection logic based on onboarding state

## Benefits

- More reliable onboarding status persistence across sign-out/sign-in cycles
- Proper redirect to dashboard after authentication when onboarding is complete
- Multiple fallback mechanisms if one storage method fails

## Implementation Details

Files modified:
- src/app/api/auth/callback/route.js
- src/app/auth/callback/page.js
- src/utils/tenantUtils.js

## Testing

To test this fix:
1. Complete the onboarding process
2. Sign out
3. Sign back in
4. Verify you're redirected to the dashboard, not onboarding
`;

fs.writeFileSync('frontend/pyfactor_next/scripts/ONBOARDING_STATUS_PERSISTENCE_FIX.md', docContent);
console.log('Created documentation file: ONBOARDING_STATUS_PERSISTENCE_FIX.md');

console.log('Script completed successfully');
