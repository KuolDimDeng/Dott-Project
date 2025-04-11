'use client';

import React, { useEffect } from 'react';
import VerifyEmailPage from './VerifyEmailPage';
import Image from 'next/image';
import Link from 'next/link';
import { logger } from '@/utils/logger';

export default function VerifyEmail() {
  // Set tenant ID cookies when component mounts (client-side only)
  useEffect(() => {
    try {
      // Capture tenant ID for this user if it exists
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        // Set tenant ID cookie for server-side routes
        const maxAge = 60 * 60 * 24 * 7; // 1 week
        document.cookie = `tenantId=${tenantId}; path=/; max-age=${maxAge}; samesite=lax`;
        document.cookie = `businessid=${tenantId}; path=/; max-age=${maxAge}; samesite=lax`;
        logger.debug('Set tenant ID cookies after verification:', tenantId);
      }
    } catch (error) {
      logger.error('Error setting tenant cookies:', error);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/pyfactor-logo.png" 
              alt="PyFactor Logo" 
              width={50} 
              height={50} 
              className="h-12 w-auto"
            />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify Your Email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Check your inbox for a verification code
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <VerifyEmailPage />
        </div>
      </div>
    </div>
  );
}