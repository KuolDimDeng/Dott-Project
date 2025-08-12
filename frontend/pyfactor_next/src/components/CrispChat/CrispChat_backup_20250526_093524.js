'use client';


import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
// Auth0 authentication is handled via useSession hook
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

        // Set email if available
        if (attributes.email) {
          window.$crisp.push(['set', 'user:email', attributes.email]);
          logger.debug('Set Crisp user email');
        }

        // Set nickname from first and last name
        const firstName = attributes['custom:firstname'];
        const lastName = attributes['custom:lastname'];
        if (firstName || lastName) {
          const nickname = [firstName, lastName].filter(Boolean).join(' ');
          if (nickname) {
            window.$crisp.push(['set', 'user:nickname', nickname]);
            logger.debug('Set Crisp user nickname');
          }
        }

        // Set company name if available
        if (attributes['custom:business_name']) {
          window.$crisp.push([
            'set',
            'user:company',
            [attributes['custom:business_name']],
          ]);
          logger.debug('Set Crisp user company');
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
          logger.debug(
            `Waiting for Crisp to be ready (attempt ${attempts + 1}/${maxAttempts})...`
          );
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
      // Add minimal CSS to ensure cookie banner is above Crisp
      const style = document.createElement('style');
      style.textContent = `
        /* Ensure the cookie banner is above everything */
        .MuiPaper-root[style*="position: fixed"] {
          z-index: 99999 !important;
        }
      `;
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
}
