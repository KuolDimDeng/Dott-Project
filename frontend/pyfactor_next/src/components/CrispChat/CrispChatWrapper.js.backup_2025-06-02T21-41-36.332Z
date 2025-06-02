// src/components/CrispChat/CrispChatWrapper.js
'use client';

import { useEffect, useState } from 'react';
// Auth0 session check will be done in the CrispChat component
import CrispChat from './CrispChat';
import { logger } from '@/utils/logger';

export default function CrispChatWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Auth0 session
        const response = await fetch('/api/auth/session');
        const hasValidUser = response.ok;
        setIsAuthenticated(hasValidUser);

        if (hasValidUser) {
          const sessionData = await response.json();
          if (sessionData.user) {
            logger.debug('Valid Auth0 user found for Crisp chat');
          }
        } else {
          logger.debug('User not authenticated for Crisp chat');
        }
      } catch (error) {
        logger.error('Error checking auth status for Crisp chat:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoaded(true);
        logger.debug('Crisp chat auth check completed');
      }
    };

    checkAuth();
  }, []);

  if (!isLoaded) {
    logger.debug('Crisp chat wrapper still loading');
    return null;
  }

  return <CrispChat isAuthenticated={isAuthenticated} />;
}
