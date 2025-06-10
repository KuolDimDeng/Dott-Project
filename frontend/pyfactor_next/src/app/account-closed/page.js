'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountClosed() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('[ACCOUNT_CLOSED] User reached account-closed page');
    
    // Clear any remaining auth data
    console.log('[ACCOUNT_CLOSED] Performing final cleanup');
    
    // Clear all storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('[ACCOUNT_CLOSED] Cleared all storage');
    } catch (e) {
      console.error('[ACCOUNT_CLOSED] Error clearing storage:', e);
    }
    
    // Clear all accessible cookies
    document.cookie.split(";").forEach(function(c) { 
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.dottapps.com";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    console.log('[ACCOUNT_CLOSED] Cleared all cookies');
    
    // Set up redirect timer
    const timer = setTimeout(() => {
      console.log('[ACCOUNT_CLOSED] Redirecting to home page');
      router.push('/');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Closed Successfully
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been permanently closed and all data has been removed.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You will be redirected to the homepage in 5 seconds...
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signup"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create a New Account
          </Link>
          
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
