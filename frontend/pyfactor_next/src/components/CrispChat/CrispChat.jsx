// src/components/CrispChat/CrispChat.jsx
'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';

export default function CrispChat({ isAuthenticated }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    logger.debug('CrispChat component mounting');

    if (typeof window === 'undefined') return;

    const initCrispWithUser = async () => {
      try {
        if (!isAuthenticated) {
          return;
        }
        const user = await getCurrentUser();
        if (user) {
          window.$crisp.push(['set', 'user:email', user.attributes.email]);
          window.$crisp.push(['set', 'user:nickname', [
            user.attributes['custom:firstname'] || '',
            user.attributes['custom:lastname'] || ''
          ].filter(Boolean).join(' ')]);
          
          if (user.attributes['custom:business_name']) {
            window.$crisp.push(['set', 'user:company', [
              user.attributes['custom:business_name']
            ]]);
          }
        }
      } catch (error) {
        logger.error('Error setting Crisp user:', error);
      }
    };

    const initializeCrisp = async () => {
      try {
        logger.debug('Initializing Crisp chat');
        setMounted(true);

        // Wait for Crisp to be ready
        if (!window.$crisp || !window.$crisp.push) {
          logger.debug('Waiting for Crisp to be ready...');
          await new Promise(resolve => setTimeout(resolve, 100));
          return initializeCrisp();
        }

        window.$crisp.push(["safe", true]);
        window.$crisp.push(["configure", "position:reverse"]);
        window.$crisp.push(["configure", "hide:on:mobile", false]);
        window.$crisp.push(["configure", "position:reverse", true]);
        window.$crisp.push(["do", "chat:show"]);

        await initCrispWithUser();

        logger.debug('Crisp chat initialized successfully');
      } catch (error) {
        logger.error('Error initializing Crisp:', error);
      }
    };

    try {
      window.$crisp = [];
      const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
      if (!CRISP_WEBSITE_ID) {
        logger.error('CRISP_WEBSITE_ID not found in environment variables');
        return;
      }
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = "https://client.crisp.chat/l.js";
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
        if (!window.$crisp || !window.$crisp.is) {
          initializeCrisp();
        }
      }
    } catch (error) {
      logger.error('Error initializing Crisp:', error);
    }

    return () => {
      if (window.$crisp) {
        window.$crisp.push(["do", "chat:hide"]);
      }
    };
  }, [isAuthenticated]);

  return null;
}
