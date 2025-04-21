// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signup/page.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignUpForm from '../components/SignUpForm';
import { logger } from '@/utils/logger';
import { clearAllAuthData } from '@/utils/authUtils';
import Image from 'next/image';
import Link from 'next/link';

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  
  // Clear any existing auth session on mount
  useEffect(() => {
    const ensureNoExistingSession = async () => {
      try {
        // Check if we need to force a fresh start
        const freshStart = searchParams.get('freshstart') === 'true';
        
        if (freshStart) {
          logger.debug('[SignUpPage] Fresh start requested, ensuring no auth session exists');
          await clearAllAuthData();
        }
        
        setIsReady(true);
      } catch (error) {
        logger.error('[SignUpPage] Error clearing auth session:', error);
        setIsReady(true);
      }
    };
    
    ensureNoExistingSession();
  }, [searchParams]);
  
  if (!isReady) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/">
            <Image 
              className="h-12 w-auto"
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
            />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}