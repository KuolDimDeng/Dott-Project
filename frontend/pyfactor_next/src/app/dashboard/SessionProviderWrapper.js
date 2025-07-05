'use client';


import React, { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

/**
 * A wrapper component that ensures there's only one SessionProvider
 * in the React component tree by checking for an existing provider
 */
export default function SessionProviderWrapper({ children }) {
  // Use state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render SessionProvider on the client to avoid SSR hydration issues
  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
} 