'use client';

import { useEffect } from 'react';
import { setupChunkErrorHandler } from '@/utils/chunkErrorHandler';

/**
 * Component to initialize chunk error handling
 * Should be mounted once in the app layout
 */
const ChunkErrorHandler = () => {
  useEffect(() => {
    setupChunkErrorHandler();
  }, []);

  // This component doesn't render anything
  return null;
};

export default ChunkErrorHandler;