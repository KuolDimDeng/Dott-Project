// src/components/CrispChat/CrispChat.jsx
'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

export default function CrispChat({ session }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    logger.debug('CrispChat component mounting');
    
    if (typeof window === 'undefined') return;

    try {
      // Load Crisp
      window.$crisp = [];
      const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
      if (!CRISP_WEBSITE_ID) {
        logger.error('CRISP_WEBSITE_ID not found in environment variables');
        return;
      }
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
      
      // Create and load script
      const script = document.createElement('script');
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      
      // Configure Crisp after script loads
      const initializeCrisp = () => {
        try {
          logger.debug('Initializing Crisp chat');
          setMounted(true);

          // Initial configuration
          window.$crisp.push(["safe", true]);
          window.$crisp.push(["configure", "position:reverse"]);
          window.$crisp.push(["configure", "hide:on:mobile", false]);
          window.$crisp.push(["configure", "position:reverse", true]);
          window.$crisp.push(["do", "chat:show"]);

          if (session?.user) {
            window.$crisp.push(["set", "user:email", session.user.email]);
            window.$crisp.push(["set", "user:nickname", session.user.name]);
          }

          logger.debug('Crisp chat initialized successfully');
        } catch (error) {
          logger.error('Error initializing Crisp:', error);
        }
      };

      script.onload = initializeCrisp;
      script.onerror = (error) => {
        logger.error('Failed to load Crisp script:', error);
      };

      // Only append if script doesn't exist
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (!existingScript) {
        document.head.appendChild(script);
        logger.debug('Crisp script appended to head');
      } else {
        logger.debug('Crisp script already exists');
        // Trigger configuration even if script exists
        script.onload();
      }

    } catch (error) {
      logger.error('Error initializing Crisp:', error);
    }

    // Cleanup
    return () => {
      if (window.$crisp) {
        window.$crisp.push(["do", "chat:hide"]);
      }
    };
  }, [session]);

  return null;
}
