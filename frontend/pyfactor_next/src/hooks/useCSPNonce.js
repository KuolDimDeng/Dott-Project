'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to get CSP nonce for inline scripts
 * Industry standard approach for secure inline scripts
 */
export function useCSPNonce() {
  const [nonce, setNonce] = useState('');

  useEffect(() => {
    // Get nonce from meta tag or header
    const metaNonce = document.querySelector('meta[name="csp-nonce"]');
    if (metaNonce) {
      setNonce(metaNonce.getAttribute('content'));
    }
  }, []);

  return nonce;
}

/**
 * Helper to create script tags with nonce
 */
export function createNoncedScript(scriptContent, nonce) {
  if (!nonce) return null;
  
  const script = document.createElement('script');
  script.setAttribute('nonce', nonce);
  script.textContent = scriptContent;
  return script;
}