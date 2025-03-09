'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';
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

        const user = await getCurrentUser();
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
        logger.error('Error setting Crisp user:', error);
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

        window.$crisp.push(['safe', true]);
        window.$crisp.push(['configure', 'position:reverse']);
        window.$crisp.push(['configure', 'hide:on:mobile', false]);
        window.$crisp.push(['configure', 'position:reverse', true]);
        window.$crisp.push(['do', 'chat:show']);

        await initCrispWithUser();

        logger.debug('Crisp chat initialized successfully');
      } catch (error) {
        logger.error('Error initializing Crisp:', error);
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
        script.onload = initializeCrisp;
        script.onerror = (error) => {
          logger.error('Failed to load Crisp script:', error);
        };
        document.head.appendChild(script);
        logger.debug('Crisp script appended to head');
      } else {
        logger.debug('Crisp script already exists');
        // Only initialize if Crisp is not already initialized
        if (!window.$crisp?.is) {
          initializeCrisp();
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
