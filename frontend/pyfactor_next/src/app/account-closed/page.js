'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

export default function AccountClosed() {
  const router = useRouter();
  
  // Clear any remaining auth data on mount and set up redirect
  useEffect(() => {
    // Clear any Cognito session
    const clearCognitoSession = async () => {
      try {
        await signOut();
        console.log('Successfully signed out of Cognito');
      } catch (e) {
        console.error('Failed to sign out of Cognito:', e);
      }
    };
    
    clearCognitoSession();
    
    // Redirect to landing page after 5 seconds
    const redirectTimer = setTimeout(() => {
      window.location.href = '/';
    }, 5000);
    
    return () => clearTimeout(redirectTimer);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Closed</h1>
        
        <p className="text-gray-600 mb-6">
          Your account has been closed successfully. We're sorry to see you go.
        </p>
        
        <p className="text-gray-600 mb-6">
          Thank you for being a part of our community. If you change your mind, you can always create a new account.
        </p>
        
        <p className="text-sm text-blue-600 mb-6">
          You will be redirected to the landing page in a few seconds...
        </p>
        
        <div className="flex flex-col space-y-4">
          <Link 
            href="/auth/signin"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Sign In
          </Link>
          
          <a 
            href="/"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    </div>
  );
} 