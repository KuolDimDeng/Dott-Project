// src/hooks/useLoadingTimeout.js
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export const useLoadingTimeout = (isLoading, onTimeout, timeout = 30000) => {
  useEffect(() => {
    if (!isLoading) return;

    logger.debug('Starting loading timeout timer');
    const timer = setTimeout(() => {
      logger.warn('Loading timeout exceeded');
      onTimeout();
    }, timeout);

    return () => {
      logger.debug('Clearing loading timeout timer');
      clearTimeout(timer);
    };
  }, [isLoading, onTimeout, timeout]);
};