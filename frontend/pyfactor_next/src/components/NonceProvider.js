'use client';

import { createContext, useContext } from 'react';

const NonceContext = createContext(null);

export function NonceProvider({ children, nonce }) {
  return (
    <NonceContext.Provider value={nonce}>
      {children}
    </NonceContext.Provider>
  );
}

export function useNonce() {
  return useContext(NonceContext);
}

// Helper component for inline styles with nonce
export function InlineStyle({ children, ...props }) {
  const nonce = useNonce();
  
  if (typeof window === 'undefined') {
    // Server-side: return style tag with nonce
    return (
      <style 
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: children }}
        {...props}
      />
    );
  }
  
  // Client-side: styles are already loaded
  return null;
}