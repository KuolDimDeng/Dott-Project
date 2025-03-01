// src/components/CrispChat/CrispChatWrapper.jsx
'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import CrispChat from './CrispChat';
import { logger } from '@/utils/logger';

export default function CrispChatWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        // Only set as authenticated if we have a user with attributes
        const hasValidUser = !!user?.attributes;
        setIsAuthenticated(hasValidUser);

        if (user && !user.attributes) {
          logger.warn('User found but attributes not available for Crisp chat');
        } else if (hasValidUser) {
          logger.debug('Valid user with attributes found for Crisp chat');
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

    // Re-check auth status periodically in case attributes become available
    const interval = setInterval(checkAuth, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!isLoaded) {
    logger.debug('Crisp chat wrapper still loading');
    return null;
  }

  return <CrispChat isAuthenticated={isAuthenticated} />;
}
