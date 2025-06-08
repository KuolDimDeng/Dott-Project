'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
// Removed Amplify imports - using Auth0 session data instead
import CrispErrorBoundary from './CrispErrorBoundary';
import crispConfig from '@/config/crisp.config';

function CrispChat({ isAuthenticated, user }) {
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

        // Use Auth0 user data passed as prop
        const userData = user;

        if (!userData) {
          logger.warn('User authenticated but data not available');
          return;
        }

        // Set email if available
        if (userData.email) {
          window.$crisp.push(['set', 'user:email', userData.email]);
          logger.debug('Set Crisp user email');
        }

        // Set nickname from name or email
        const nickname = userData.name || userData.nickname || userData.email?.split('@')[0];
        if (nickname) {
          window.$crisp.push(['set', 'user:nickname', nickname]);
          logger.debug('Set Crisp user nickname:', nickname);
        }

        // Get additional user metadata if available
        try {
          const userResponse = await fetch('/api/user/current', {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            const backendUser = await userResponse.json();
            
            // Set company name if available
            if (backendUser.business_name) {
              window.$crisp.push([
                'set',
                'user:company',
                [backendUser.business_name],
              ]);
              logger.debug('Set Crisp user company:', backendUser.business_name);
            }
            
            // Set tenant ID as custom data
            if (backendUser.tenant_id) {
              window.$crisp.push([
                'set',
                'session:data',
                [['tenant_id', backendUser.tenant_id]]
              ]);
              logger.debug('Set Crisp tenant ID:', backendUser.tenant_id);
            }
            
            // Set user role if available
            if (backendUser.user_role) {
              window.$crisp.push([
                'set',
                'session:data',
                [['user_role', backendUser.user_role]]
              ]);
              logger.debug('Set Crisp user role:', backendUser.user_role);
            }
          }
        } catch (error) {
          logger.debug('Could not fetch additional user data for Crisp:', error);
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

        // Wait for Crisp to be ready with timeout using config values
        let attempts = 0;
        const maxAttempts = crispConfig.delays.maxReadyAttempts;
        while (!window.$crisp?.push && attempts < maxAttempts) {
          logger.debug('Waiting for Crisp to be ready (attempt ' + (attempts + 1) + '/' + maxAttempts + ')...');
          await new Promise((resolve) => setTimeout(resolve, crispConfig.delays.readyCheckDelay));
          attempts++;
        }

        if (!window.$crisp?.push) {
          throw new Error('Crisp failed to initialize after maximum attempts');
        }

        // Apply configuration from config file
        window.$crisp.push(['safe', crispConfig.options.safeMode]);
        window.$crisp.push(['configure', 'position:reverse', crispConfig.options.positionReverse]);
        window.$crisp.push(['configure', 'hide:on:mobile', crispConfig.options.hideOnMobile]);
        
        if (crispConfig.features.autoShow) {
          window.$crisp.push(['do', 'chat:show']);
        }

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
      // Add CSS to ensure proper z-index using config values
      const style = document.createElement('style');
      style.textContent = `
        /* Ensure Crisp chat has proper z-index */
        #crisp-chatbox {
          z-index: ${crispConfig.zIndex.chatbox} !important;
        }
        /* Ensure cookie banner is above Crisp */
        .cookie-banner {
          z-index: ${crispConfig.zIndex.cookieBanner} !important;
        }
      `;
      document.head.appendChild(style);
      logger.debug('Added custom CSS to control Crisp z-index with config values');

      // Get website ID from config (with environment variable override)
      const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || crispConfig.websiteId;
      
      logger.debug('Crisp configuration:', { 
        CRISP_WEBSITE_ID, 
        fromEnv: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
        fromConfig: crispConfig.websiteId,
        allEnvVars: Object.keys(process.env).filter(key => key.includes('CRISP')),
        NODE_ENV: process.env.NODE_ENV 
      });
      
      if (!CRISP_WEBSITE_ID) {
        logger.error('CRISP_WEBSITE_ID not found in environment variables or config');
        return;
      }
      
      // Initialize Crisp following the official pattern
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

      // Load Crisp script following the official pattern
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (!existingScript) {
        logger.debug('Loading Crisp script with website ID:', CRISP_WEBSITE_ID);
        
        // Use the exact pattern from Crisp's official code
        const d = document;
        const s = d.createElement('script');
        s.src = 'https://client.crisp.chat/l.js';
        s.async = 1;
        
        s.onload = () => {
          logger.debug('Crisp script loaded successfully, initializing...');
          setTimeout(initializeCrisp, crispConfig.delays.initDelay);
        };
        
        s.onerror = (error) => {
          logger.error('Failed to load Crisp script:', error);
          setTimeout(() => {
            logger.debug('Retrying Crisp script load...');
            const retryScript = document.createElement('script');
            retryScript.src = 'https://client.crisp.chat/l.js';
            retryScript.async = 1;
            retryScript.onload = () => setTimeout(initializeCrisp, crispConfig.delays.initDelay);
            document.head.appendChild(retryScript);
          }, crispConfig.delays.retryDelay);
        };
        
        d.getElementsByTagName('head')[0].appendChild(s);
        logger.debug('Crisp script appended to head');
      } else {
        logger.debug('Crisp script already exists, checking initialization...');
        if (!window.$crisp?.is) {
          setTimeout(initializeCrisp, crispConfig.delays.initDelay);
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
