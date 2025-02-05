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
        setIsAuthenticated(!!user);
        setIsLoaded(true);
      } catch (error) {
        logger.error('Error checking auth status:', error);
        setIsLoaded(true);
      }
    };

    checkAuth();
  }, []);

  if (!isLoaded) {
    return null;
  }

  return <CrispChat isAuthenticated={isAuthenticated} />;
}
