'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EmailPasswordSignIn from '@/components/auth/EmailPasswordSignIn';

export default function EmailSignInPage() {
  const searchParams = useSearchParams();
  const [showDebug, setShowDebug] = useState(false);
  
  // Check for debug mode
  useEffect(() => {
    const debug = searchParams.get('debug') === 'true';
    setShowDebug(debug);
  }, [searchParams]);
  
  return (
    <>
      <EmailPasswordSignIn />
      
      {showDebug && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <div className="bg-gray-900 text-white rounded-lg p-4 shadow-lg">
            <h3 className="text-sm font-semibold mb-2">
              Debug Information
            </h3>
            <div className="text-xs space-y-1 font-mono">
              <div>Auth0 Domain: auth.dottapps.com (custom)</div>
              <div>Connection: Username-Password-Authentication</div>
              <div>Grant Type: password (Resource Owner)</div>
              <div>Token Endpoint: https://auth.dottapps.com/oauth/token</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}