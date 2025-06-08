// src/components/CrispChat/CrispChatWrapper.js
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import CrispChat from './CrispChat';
import { logger } from '@/utils/logger';

export default function CrispChatWrapper() {
  const { user, isLoading } = useUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Auth0 to finish loading
    if (!isLoading) {
      logger.debug('[CrispChatWrapper] Auth0 loading complete', { 
        hasUser: !!user,
        userEmail: user?.email 
      });
      setIsReady(true);
    }
  }, [isLoading, user]);

  // Don't render until Auth0 is ready
  if (!isReady) {
    logger.debug('[CrispChatWrapper] Waiting for Auth0...');
    return null;
  }

  logger.debug('[CrispChatWrapper] Rendering CrispChat', { isAuthenticated: !!user });
  return <CrispChat isAuthenticated={!!user} user={user} />;
}