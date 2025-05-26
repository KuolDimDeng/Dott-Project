'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';
import CognitoAttributes from '@/utils/CognitoAttributes';
import CrispErrorBoundary from './CrispErrorBoundary';

function CrispChat({ isAuthenticated }) {
  const [mounted, setMounted] = useState(false);

  // Log immediately when component is created
  logger.debug('CrispChat component created with props:', { isAuthenticated });

  useEffect(() => {
    logger.debug('CrispChat component mounting with isAuthenticated:', isAuthenticated);

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
      style.textContent = `
        /* Ensure Crisp chat has proper z-index */
        #crisp-chatbox {
          z-index: 9999 !important;
        }
        /* Ensure cookie banner is above Crisp */
        .cookie-banner {
          z-index: 99999 !important;
        }
      `;
      document.head.appendChild(style);
      logger.debug('Added custom CSS to control Crisp z-index');

      window.$crisp = [];
      const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
      logger.debug('Environment check:', { 
        CRISP_WEBSITE_ID, 
        allEnvVars: Object.keys(process.env).filter(key => key.includes('CRISP')),
        NODE_ENV: process.env.NODE_ENV 
      });
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
}
