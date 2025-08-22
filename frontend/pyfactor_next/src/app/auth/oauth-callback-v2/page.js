'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackV2() {
  const router = useRouter();
  
  useEffect(() => {
    // This page just redirects to the exchange API
    // The exchange API will handle everything and redirect appropriately
    const params = new URLSearchParams(window.location.search);
    const exchangeUrl = `/api/auth/exchange-v2?${params.toString()}`;
    
    console.log('[OAuth-Callback-V2] Redirecting to exchange:', exchangeUrl);
    
    // Use window.location for full page navigation to ensure cookies are set
    window.location.href = exchangeUrl;
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-900">Completing Sign In</h2>
        <p className="text-gray-600">Please wait while we authenticate you...</p>
      </div>
    </div>
  );
}