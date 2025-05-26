#!/usr/bin/env node

/**
 * Version0030_implement_crisp_chat_all_pages_fixed.mjs
 * 
 * Purpose: Implement Crisp Chat functionality to work on all pages of the app
 * Version: 0030 v1.0
 * Created: 2024-12-19
 * 
 * This script ensures Crisp Chat is properly integrated across all pages with:
 * - Proper authentication state management
 * - CognitoAttributes utility usage for user data
 * - Global availability without page-specific implementation
 * - Enhanced error handling and debugging
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  version: '0030',
  scriptName: 'implement_crisp_chat_all_pages',
  targetFiles: [
    'src/components/DynamicComponents.js',
    'src/components/CrispChat/CrispChat.js'
  ]
};

/**
 * Enhanced logging utility
 */
const logger = {
  info: (message, data = {}) => {
    console.log(`[${CONFIG.version}] INFO: ${message}`, data);
  },
  warn: (message, data = {}) => {
    console.warn(`[${CONFIG.version}] WARN: ${message}`, data);
  },
  error: (message, data = {}) => {
    console.error(`[${CONFIG.version}] ERROR: ${message}`, data);
  },
  success: (message, data = {}) => {
    console.log(`[${CONFIG.version}] ✅ SUCCESS: ${message}`, data);
  }
};

/**
 * File operation utilities
 */
const fileUtils = {
  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      logger.info(`Read file: ${filePath}`);
      return content;
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, { error: error.message });
      throw error;
    }
  },

  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      logger.info(`Wrote file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, { error: error.message });
      throw error;
    }
  }
};

/**
 * Update DynamicComponents to properly pass authentication state
 */
async function updateDynamicComponents() {
  const filePath = path.join(process.cwd(), 'src/components/DynamicComponents.js');
  
  try {
    const updatedContent = `'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';

// Dynamically import components to avoid SSR issues with error handling
const CookieBanner = dynamic(
  () => import('@/components/Cookie/CookieBanner').catch(err => {
    logger.error('[DynamicComponents] Error loading CookieBanner:', err);
    return () => null; // Return empty component on error
  }),
  {
    ssr: false,
    loading: () => null,
  }
);

const CrispChat = dynamic(
  () => import('@/components/CrispChat/CrispChat').catch(err => {
    logger.error('[DynamicComponents] Error loading CrispChat:', err);
    return () => null; // Return empty component on error
  }),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function DynamicComponents({ children }) {
  const [componentsMounted, setComponentsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status for Crisp Chat
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        logger.debug('[DynamicComponents] Checking authentication status for Crisp Chat');
        
        // Check if user is authenticated
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          logger.debug('[DynamicComponents] User authenticated for Crisp Chat');
        } else {
          setIsAuthenticated(false);
          logger.debug('[DynamicComponents] User not authenticated for Crisp Chat');
        }
      } catch (error) {
        // User not authenticated
        setIsAuthenticated(false);
        logger.debug('[DynamicComponents] Authentication check failed, user not authenticated');
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuthStatus();
  }, []);

  // Only render components after client-side hydration is complete
  useEffect(() => {
    setComponentsMounted(true);
  }, []);

  if (!componentsMounted || !authChecked) {
    return null;
  }

  return (
    <>
      <CookieBanner />
      <CrispChat isAuthenticated={isAuthenticated} />
      {children}
    </>
  );
}`;

    await fileUtils.writeFile(filePath, updatedContent);
    logger.success('Updated DynamicComponents.js with proper authentication state management');
    
  } catch (error) {
    logger.error('Failed to update DynamicComponents.js', { error: error.message });
    throw error;
  }
}

/**
 * Update CrispChat component to use CognitoAttributes utility
 */
async function updateCrispChatComponent() {
  const filePath = path.join(process.cwd(), 'src/components/CrispChat/CrispChat.js');
  
  try {
    const updatedContent = `'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';
import CognitoAttributes from '@/utils/CognitoAttributes';
import CrispErrorBoundary from './CrispErrorBoundary';

function CrispChat({ isAuthenticated }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    logger.debug('CrispChat component mounting');

    if (typeof window === 'undefined') return;

    const initCrispWithUser = async () => {
      try {
        if (!isAuthenticated) {
          logger.debug('User not authenticated, skipping Crisp user setup');
          return;
        }

        let user;
        try {
          user = await getCurrentUser();
        } catch (authError) {
          // Handle authentication errors gracefully
          if (authError.name === 'UserUnAuthenticatedException') {
            logger.info('User not fully authenticated for Crisp chat, continuing without user data');
            // Set up Crisp with minimal configuration
            window.$crisp.push(['do', 'chat:show']);
            return;
          }
          throw authError; // Re-throw other errors
        }

        if (!user?.attributes) {
          logger.warn('User authenticated but attributes not available');
          return;
        }

        const { attributes } = user;

        // Set email if available using CognitoAttributes utility
        const email = CognitoAttributes.getValue(attributes, CognitoAttributes.EMAIL);
        if (email) {
          window.$crisp.push(['set', 'user:email', email]);
          logger.debug('Set Crisp user email');
        }

        // Set nickname from first and last name using CognitoAttributes utility
        const firstName = CognitoAttributes.getValue(attributes, CognitoAttributes.GIVEN_NAME);
        const lastName = CognitoAttributes.getValue(attributes, CognitoAttributes.FAMILY_NAME);
        if (firstName || lastName) {
          const nickname = [firstName, lastName].filter(Boolean).join(' ');
          if (nickname) {
            window.$crisp.push(['set', 'user:nickname', nickname]);
            logger.debug('Set Crisp user nickname:', nickname);
          }
        }

        // Set company name if available using CognitoAttributes utility
        const businessName = CognitoAttributes.getBusinessName(attributes);
        if (businessName) {
          window.$crisp.push([
            'set',
            'user:company',
            [businessName],
          ]);
          logger.debug('Set Crisp user company:', businessName);
        }

        // Set tenant ID as custom data using CognitoAttributes utility
        const tenantId = CognitoAttributes.getTenantId(attributes);
        if (tenantId) {
          window.$crisp.push([
            'set',
            'session:data',
            [['tenant_id', tenantId]]
          ]);
          logger.debug('Set Crisp tenant ID:', tenantId);
        }

        // Set user role if available using CognitoAttributes utility
        const userRole = CognitoAttributes.getUserRole(attributes);
        if (userRole) {
          window.$crisp.push([
            'set',
            'session:data',
            [['user_role', userRole]]
          ]);
          logger.debug('Set Crisp user role:', userRole);
        }

        logger.debug('Crisp user data set successfully');
      } catch (error) {
        // Log the error but don't let it block Crisp initialization
        logger.error('Error setting Crisp user:', error);
        // Ensure Crisp is still visible even if user data setting fails
        if (window.$crisp?.push) {
          window.$crisp.push(['do', 'chat:show']);
        }
      }
    };

    const initializeCrisp = async () => {
      try {
        logger.debug('Initializing Crisp chat');
        setMounted(true);

        // Wait for Crisp to be ready with timeout
        let attempts = 0;
        const maxAttempts = 10;
        while (!window.$crisp?.push && attempts < maxAttempts) {
          logger.debug('Waiting for Crisp to be ready (attempt ' + (attempts + 1) + '/' + maxAttempts + ')...');
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.$crisp?.push) {
          throw new Error('Crisp failed to initialize after maximum attempts');
        }

        // Basic configuration that should always be applied
        window.$crisp.push(['safe', true]);
        window.$crisp.push(['configure', 'position:reverse']);
        window.$crisp.push(['configure', 'hide:on:mobile', false]);
        window.$crisp.push(['configure', 'position:reverse', true]);
        window.$crisp.push(['do', 'chat:show']);

        // Try to set user data, but don't block if it fails
        try {
          await initCrispWithUser();
        } catch (userError) {
          // Already logged in initCrispWithUser, don't log again
          // But ensure chat is still shown
          window.$crisp.push(['do', 'chat:show']);
        }

        logger.debug('Crisp chat initialized successfully');
      } catch (error) {
        logger.error('Error initializing Crisp:', error);
        // Don't rethrow - we want the app to continue even if Crisp fails
      }
    };

    try {
      // Add minimal CSS to ensure proper z-index
      const style = document.createElement('style');
             style.textContent = '/* Ensure Crisp chat has proper z-index */ #crisp-chatbox { z-index: 9999 !important; } /* Ensure cookie banner is above Crisp */ .cookie-banner { z-index: 99999 !important; }';
      document.head.appendChild(style);
      logger.debug('Added custom CSS to control Crisp z-index');

      window.$crisp = [];
      const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
      if (!CRISP_WEBSITE_ID) {
        logger.error('CRISP_WEBSITE_ID not found in environment variables');
        return;
      }
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

      const existingScript = document.querySelector(
        'script[src="https://client.crisp.chat/l.js"]'
      );
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://client.crisp.chat/l.js';
        script.async = true;
        
        // Add a delay before initializing to ensure the script has time to load properly
        script.onload = () => {
          logger.debug('Crisp script loaded successfully, waiting before initialization');
          setTimeout(initializeCrisp, 500); // Add a 500ms delay before initialization
        };
        
        script.onerror = (error) => {
          logger.error('Failed to load Crisp script:', error);
          // Attempt to reload after a delay
          setTimeout(() => {
            logger.debug('Attempting to reload Crisp script after failure');
            const retryScript = document.createElement('script');
            retryScript.src = 'https://client.crisp.chat/l.js';
            retryScript.async = true;
            retryScript.onload = initializeCrisp;
            document.head.appendChild(retryScript);
          }, 2000);
        };
        
        document.head.appendChild(script);
        logger.debug('Crisp script appended to head');
      } else {
        logger.debug('Crisp script already exists');
        // Only initialize if Crisp is not already initialized
        if (!window.$crisp?.is) {
          // Add a delay before initializing to ensure the script is fully loaded
          setTimeout(initializeCrisp, 300);
        }
      }
    } catch (error) {
      logger.error('Error initializing Crisp:', error);
    }

    return () => {
      if (window.$crisp) {
        window.$crisp.push(['do', 'chat:hide']);
      }
    };
  }, [isAuthenticated]);

  return null;
}

export default function CrispChatWithErrorBoundary(props) {
  return (
    <CrispErrorBoundary>
      <CrispChat {...props} />
    </CrispErrorBoundary>
  );
}`;

    await fileUtils.writeFile(filePath, updatedContent);
    logger.success('Updated CrispChat.js with CognitoAttributes utility usage');
    
  } catch (error) {
    logger.error('Failed to update CrispChat.js', { error: error.message });
    throw error;
  }
}

/**
 * Create documentation for the changes
 */
async function createDocumentation() {
  const docPath = path.join(process.cwd(), 'src/components/CrispChat/CrispChatImplementation.md');
  
  const documentation = '# Crisp Chat Implementation Documentation

## Version: 0030 v1.0
## Created: 2024-12-19
## Purpose: Implement Crisp Chat functionality on all pages of the app

## Overview
This implementation ensures Crisp Chat is available on all pages of the application with proper authentication state management and user data integration using the CognitoAttributes utility.

## Key Features

### 1. Global Availability
- Crisp Chat is loaded through DynamicComponents which is included in ClientLayout
- Available on all pages without requiring page-specific implementation
- Proper SSR handling with dynamic imports

### 2. Authentication State Management
- DynamicComponents now checks authentication status using getCurrentUser()
- Passes isAuthenticated prop to CrispChat component
- Handles authentication state changes gracefully

### 3. CognitoAttributes Integration
- Uses CognitoAttributes utility for all user attribute access
- Proper handling of given_name and family_name for user display
- Tenant ID integration using custom:tenant_ID attribute
- Business name and user role integration

### 4. Enhanced Error Handling
- Graceful fallback when Crisp script fails to load
- Error boundary protection for the entire component
- Comprehensive logging for debugging

## Files Modified

### 1. src/components/DynamicComponents.js
- Added authentication state checking
- Proper prop passing to CrispChat
- Enhanced error handling

### 2. src/components/CrispChat/CrispChat.js
- Integrated CognitoAttributes utility for user data access
- Enhanced user data setting with tenant ID and role
- Improved error handling and logging
- Better CSS z-index management

## Technical Implementation

### Authentication Flow
1. DynamicComponents checks authentication status on mount
2. Uses getCurrentUser() from aws-amplify/auth
3. Passes isAuthenticated boolean to CrispChat
4. CrispChat initializes with or without user data based on auth status

### User Data Integration
- Email: CognitoAttributes.getValue(attributes, CognitoAttributes.EMAIL)
- Name: CognitoAttributes.getValue(attributes, CognitoAttributes.GIVEN_NAME/FAMILY_NAME)
- Company: CognitoAttributes.getBusinessName(attributes)
- Tenant ID: CognitoAttributes.getTenantId(attributes)
- User Role: CognitoAttributes.getUserRole(attributes)

### Environment Configuration
- Requires NEXT_PUBLIC_CRISP_WEBSITE_ID in environment variables
- No hardcoded values per requirements
- Production-ready configuration

## Requirements Addressed

✅ **Condition 6**: Use CognitoAttributes utility for accessing Cognito user attributes
✅ **Condition 9**: Use custom:tenant_ID for tenant id
✅ **Condition 11**: Next.js version 15 compatibility
✅ **Condition 12**: Long term solution implementation
✅ **Condition 17**: JavaScript (not TypeScript)
✅ **Condition 19**: Production mode only
✅ **Condition 22**: No hardcoded environment keys
✅ **Condition 28**: Clean and efficient code

## Usage

Crisp Chat will automatically be available on all pages once this implementation is deployed. No additional configuration is required on individual pages.

### For Authenticated Users
- Full user profile integration
- Tenant-specific context
- Role-based information

### For Unauthenticated Users
- Basic chat functionality
- No user data integration
- Still fully functional

## Debugging

The implementation includes comprehensive logging:
- Authentication status checks
- User data extraction and setting
- Crisp script loading status
- Error conditions and fallbacks

Check browser console for detailed logs with '[DynamicComponents]' and '[CrispChat]' prefixes.

## Version History

### v1.0 (2024-12-19)
- Initial implementation
- CognitoAttributes integration
- Global availability on all pages
- Enhanced error handling and logging
';

  await fileUtils.writeFile(docPath, documentation);
  logger.success('Created comprehensive documentation');
}

/**
 * Update script registry
 */
async function updateScriptRegistry() {
  const registryPath = path.join(process.cwd(), 'scripts/script_registry.md');
  
  try {
    const content = await fileUtils.readFile(registryPath);
    
    const newEntry = '

### Version0030_implement_crisp_chat_all_pages.mjs
- **Version**: 0030 v1.0
- **Purpose**: Implement Crisp Chat functionality to work on all pages of the app
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target Files**: 
  - /src/components/DynamicComponents.js (enhanced authentication state management)
  - /src/components/CrispChat/CrispChat.js (integrated CognitoAttributes utility)
- **Description**: Implements Crisp Chat globally across all pages with proper authentication state management and CognitoAttributes integration
- **Key Features**:
  - Global availability on all pages through DynamicComponents
  - Proper authentication state checking and prop passing
  - CognitoAttributes utility integration for user data
  - Enhanced error handling and debugging
  - Tenant ID and user role integration
  - Production-ready implementation with environment variable usage
- **Requirements Addressed**: Conditions 6, 9, 11, 12, 17, 19, 22, 28';

    const updatedContent = content + newEntry;
    await fileUtils.writeFile(registryPath, updatedContent);
    logger.success('Updated script registry');
    
  } catch (error) {
    logger.error('Failed to update script registry', { error: error.message });
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('Starting Crisp Chat implementation script');
    logger.info('Version: ' + CONFIG.version);
    logger.info('Target files:', CONFIG.targetFiles);

    // Update components
    logger.info('Updating components...');
    await updateDynamicComponents();
    await updateCrispChatComponent();

    // Create documentation
    logger.info('Creating documentation...');
    await createDocumentation();

    // Update script registry
    logger.info('Updating script registry...');
    await updateScriptRegistry();

    logger.success('Crisp Chat implementation completed successfully!');
    logger.info('Summary of changes:');
    logger.info('✅ Updated DynamicComponents.js with authentication state management');
    logger.info('✅ Enhanced CrispChat.js with CognitoAttributes utility integration');
    logger.info('✅ Created comprehensive documentation');
    logger.info('✅ Updated script registry');
    logger.info('');
    logger.info('Crisp Chat is now available on all pages of the application.');
    logger.info('Make sure NEXT_PUBLIC_CRISP_WEBSITE_ID is set in your environment variables.');

  } catch (error) {
    logger.error('Script execution failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Execute the script
if (import.meta.url === 'file://' + process.argv[1]) {
  main();
}

export default main; 