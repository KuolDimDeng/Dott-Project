'use client';

import { useEffect } from 'react';
import { useCSPNonce } from '@/hooks/useCSPNonce';

/**
 * Secure authentication form component
 * Handles inline scripts properly with CSP nonces
 */
export default function SecureAuthForm({ children, onSubmit }) {
  const nonce = useCSPNonce();

  useEffect(() => {
    // Any inline scripts needed for auth should use the nonce
    if (nonce && onSubmit) {
      const script = document.createElement('script');
      script.setAttribute('nonce', nonce);
      script.textContent = `
        // Authentication form handler
        window.handleAuthSubmit = function(event) {
          event.preventDefault();
          const formData = new FormData(event.target);
          const data = Object.fromEntries(formData);
          window.postMessage({ type: 'AUTH_SUBMIT', data }, '*');
        };
      `;
      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [nonce, onSubmit]);

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(e);
      }}
      className="auth-form"
    >
      {children}
    </form>
  );
}