'use client';


/**
 * AuthInitializer Component
 * 
 * Ensures AWS Amplify is properly configured on component mount
 * This helps prevent "Auth UserPool not configured" errors
 */

import { useEffect } from 'react';
// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';

export default function AuthInitializer() {
  useEffect(() => {
    try {
      const success = initAmplify();
      if (success) {
        logger.info('[AuthInitializer] Auth configuration applied successfully');
      } else {
        logger.warn('[AuthInitializer] Auth configuration failed, will retry on user interaction');
      }
    } catch (error) {
      logger.error('[AuthInitializer] Error initializing auth:', error);
    }
  }, []);
  
  // This component renders nothing, it just initializes auth
  return null;
}
