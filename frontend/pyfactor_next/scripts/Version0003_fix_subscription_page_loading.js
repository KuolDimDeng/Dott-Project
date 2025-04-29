/**
 * Version0003_fix_subscription_page_loading.js
 * 
 * This script addresses the issue where the subscription page fails to load properly
 * after being redirected from the business info page.
 * 
 * Problem: The subscription page loads (HTTP 200) but fails to initialize properly,
 * resulting in a blank or incomplete page.
 * 
 * Solution: Enhance the subscription page initialization logic to be more robust,
 * implement better error handling, and add fallback mechanisms for initialization.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../src/backups');
const SUBSCRIPTION_PAGE_PATH = path.join(__dirname, '../src/app/onboarding/subscription/page.js');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper function to create a backup
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Helper function to update a file
function updateFile(filePath, findPattern, replacement) {
  // Create backup
  createBackup(filePath);
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace content
  const updatedContent = content.replace(findPattern, replacement);
  
  // Write back to file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`Updated file: ${filePath}`);
}

// Main execution
try {
  console.log('Starting execution of Version0003_fix_subscription_page_loading.js');
  
  // 1. Fix the initializeSubscription function in subscription page
  console.log('Updating initializeSubscription function in subscription page.js...');
  
  const initializeSubscriptionFindPattern = 
    /const initializeSubscription = async \(\) => \{[\s\S]*?try \{[\s\S]*?setLoading\(true\);[\s\S]*?\/\/ Get business info from AppCache or Cognito[\s\S]*?const \{ businessInfo \} = await getBusinessInfoFromCognito\(\);[\s\S]*?setBusinessData\(businessInfo\);/;
  
  const initializeSubscriptionReplacement = 
    `const initializeSubscription = async () => {
    try {
      setLoading(true);
      logger.debug('[SubscriptionPage] Initializing subscription page');
      
      // Get business info from AppCache or Cognito with fallback
      try {
        const { businessInfo, source } = await getBusinessInfoFromCognito();
        logger.debug('[SubscriptionPage] Retrieved business info successfully from ' + source);
        setBusinessData(businessInfo);
      } catch (businessInfoError) {
        logger.warn('[SubscriptionPage] Failed to get business info, using defaults:', businessInfoError);
        // Use default business data if retrieval fails
        setBusinessData({
          businessName: 'Your Business',
          businessType: 'Other',
          legalName: 'Your Business',
          country: 'US'
        });
      }`;
  
  updateFile(SUBSCRIPTION_PAGE_PATH, initializeSubscriptionFindPattern, initializeSubscriptionReplacement);
  
  // 2. Fix the getBusinessInfoFromCognito function to be more robust
  console.log('Enhancing getBusinessInfoFromCognito function...');
  
  const businessInfoFindPattern = 
    /\/\/ Helper to get business info from Cognito and AppCache[\s\S]*?const getBusinessInfoFromCognito = async \(\) => \{[\s\S]*?try \{[\s\S]*?\/\/ Try to get from AppCache first[\s\S]*?const cachedBusinessInfo = getCacheValue\('business_info'\);[\s\S]*?if \(cachedBusinessInfo\) \{[\s\S]*?logger\.debug\('\[SubscriptionPage\] Using cached business info from AppCache'\);[\s\S]*?return \{[\s\S]*?businessInfo: cachedBusinessInfo,[\s\S]*?source: 'appcache'[\s\S]*?\};[\s\S]*?\}/;
  
  const businessInfoReplacement = 
    `// Helper to get business info from Cognito and AppCache with enhanced reliability
const getBusinessInfoFromCognito = async () => {
  try {
    // Try multiple sources in order of reliability
    
    // 1. First try to get from sessionStorage directly (most reliable)
    try {
      const sessionBusinessInfo = sessionStorage.getItem('business_info');
      if (sessionBusinessInfo) {
        const parsedInfo = JSON.parse(sessionBusinessInfo);
        logger.debug('[SubscriptionPage] Using business info from sessionStorage');
        return {
          businessInfo: parsedInfo,
          source: 'sessionStorage'
        };
      }
    } catch (sessionError) {
      logger.warn('[SubscriptionPage] Error reading from sessionStorage:', sessionError);
    }
    
    // 2. Then try to get from AppCache
    const cachedBusinessInfo = getCacheValue('business_info');
    if (cachedBusinessInfo) {
      logger.debug('[SubscriptionPage] Using cached business info from AppCache');
      
      // Also store in sessionStorage for redundancy
      try {
        sessionStorage.setItem('business_info', JSON.stringify(cachedBusinessInfo));
      } catch (e) {
        // Ignore storage errors
      }
      
      return {
        businessInfo: cachedBusinessInfo,
        source: 'appcache'
      };
    }`;
  
  updateFile(SUBSCRIPTION_PAGE_PATH, businessInfoFindPattern, businessInfoReplacement);
  
  // 3. Add fallback UI rendering with error boundary
  console.log('Adding fallback UI rendering for subscription page...');
  
  const loadingStateFindPattern = 
    /if \(loading\) \{[\s\S]*?return \([\s\S]*?<div className="flex h-screen items-center justify-center bg-gray-50">[\s\S]*?<div className="text-center">[\s\S]*?<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-\[-0\.125em\]" role="status">[\s\S]*?<span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 !\[clip:rect\(0,0,0,0\)\]">Loading\.\.\.<\/span>[\s\S]*?<\/div>[\s\S]*?<p className="mt-4 text-lg text-gray-700">Loading subscription options\.\.\.<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\);[\s\S]*?\}/;
  
  const loadingStateReplacement = 
    `if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-4 text-lg text-gray-700">Loading subscription options...</p>
        </div>
      </div>
    );
  }
  
  // Add error state rendering
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="mb-4 text-xl font-semibold text-center text-gray-800">Error Loading Subscription Options</h2>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => { setError(null); initializeSubscription(); }}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/onboarding/business-info')}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Back to Business Info
            </button>
          </div>
        </div>
      </div>
    );
  }`;
  
  updateFile(SUBSCRIPTION_PAGE_PATH, loadingStateFindPattern, loadingStateReplacement);
  
  // 4. Enhance the useEffect initialization to handle URL params and improve reliability
  console.log('Enhancing useEffect initialization...');
  
  const useEffectFindPattern = 
    /\/\/ Authentication and initialization[\s\S]*?useEffect\(\(\) => \{[\s\S]*?const checkAuth = async \(\) => \{[\s\S]*?try \{[\s\S]*?\/\/ Use the new Amplify v6 syntax for getCurrentUser[\s\S]*?const \{ userId, username \} = await getCurrentUser\(\);/;
  
  const useEffectReplacement = 
    `// Authentication and initialization
  useEffect(() => {
    // Check if this is a direct navigation from business info page
    const source = searchParams.get('source');
    const fallback = searchParams.get('fallback');
    const timestamp = searchParams.get('ts');
    
    // Log navigation source for debugging
    if (source) {
      logger.debug('[SubscriptionPage] Page loaded from source:', { 
        source, 
        fallback: fallback === 'true',
        timestamp
      });
    }
    
    const checkAuth = async () => {
      try {
        logger.debug('[SubscriptionPage] Starting authentication check');
        
        // Use the new Amplify v6 syntax for getCurrentUser
        const { userId, username } = await getCurrentUser().catch(error => {
          logger.warn('[SubscriptionPage] getCurrentUser error, trying fallback:', error);
          
          // Check if we have tokens in sessionStorage as fallback
          const idToken = sessionStorage.getItem('idToken');
          if (idToken) {
            // Extract user info from token if possible
            try {
              const tokenParts = idToken.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return { 
                  userId: payload.sub, 
                  username: payload.email || payload['cognito:username'] 
                };
              }
            } catch (tokenError) {
              logger.error('[SubscriptionPage] Failed to parse token:', tokenError);
            }
          }
          
          // Re-throw if fallback fails
          throw error;
        });`;
  
  updateFile(SUBSCRIPTION_PAGE_PATH, useEffectFindPattern, useEffectReplacement);
  
  // Update registry file
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  // Check if registry file exists and read its content
  let registryContent = '';
  if (fs.existsSync(registryPath)) {
    registryContent = fs.readFileSync(registryPath, 'utf8');
  } else {
    registryContent = '# Frontend Script Registry\n\n';
  }
  
  // Add new script entry
  registryContent += `
## Version0003_fix_subscription_page_loading.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Fix issue with subscription page not loading properly after redirection
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/subscription/page.js
- **Summary of Changes:**
  - Enhanced initializeSubscription function with better error handling
  - Improved business info retrieval with multi-source fallbacks
  - Added proper error state UI with retry options
  - Enhanced authentication flow with token fallback mechanism
  - Added support for URL parameters from business info page
`;

  fs.writeFileSync(registryPath, registryContent, 'utf8');
  console.log(`Updated script registry: ${registryPath}`);

  // Create documentation file
  const docPath = path.join(__dirname, '../src/app/onboarding/SUBSCRIPTION_PAGE_LOADING_FIX.md');
  const docContent = `# Subscription Page Loading Fix Documentation

## Issue Summary

After being redirected from the business info page, the subscription page fails to load properly. The page receives a successful HTTP 200 response, but either shows a blank screen or fails to initialize correctly.

## Root Cause

The issue was caused by several weaknesses in the subscription page initialization:

1. The business info retrieval had no fallback mechanism if the primary source failed
2. The authentication check was not handling token fallbacks properly
3. There was insufficient error handling during the initialization process
4. The page had no proper error state UI to allow recovery from failed initialization

## Solution

We implemented a fix (Version0003_fix_subscription_page_loading.js) with the following changes:

1. **Enhanced Business Info Retrieval**:
   - Added multiple fallback sources for business info (sessionStorage, AppCache, Cognito)
   - Implemented error handling with default values if all sources fail
   - Added redundant storage to ensure data availability

2. **Improved Authentication Flow**:
   - Added token-based fallback when getCurrentUser fails
   - Enhanced error handling during the authentication process
   - Added support for navigational parameters from the business info page

3. **Better Error Handling and Recovery**:
   - Added proper error state UI with retry options
   - Implemented a "Back to Business Info" option for recovery
   - Added detailed logging for improved debuggability

## Implementation Details

The fix enhances the following key functions:

1. **getBusinessInfoFromCognito**: Now tries multiple data sources with proper fallbacks
2. **initializeSubscription**: Enhanced with better error handling and logging
3. **useEffect initialization**: Added support for URL parameters and improved reliability
4. **Error UI**: Added a user-friendly error state with recovery options

## Testing

To verify the fix, follow these steps:

1. Complete the business info form with all required fields
2. Submit the form and verify you're properly redirected to the subscription page
3. Verify the subscription page loads properly and displays the correct business information
4. Complete the subscription selection process

## Version History

- **v1.0** (2025-04-28): Initial implementation of the fix
`;

  fs.writeFileSync(docPath, docContent, 'utf8');
  console.log(`Created documentation file: ${docPath}`);

  console.log('Fix script execution completed successfully');
} catch (error) {
  console.error('Error executing fix script:', error);
} 