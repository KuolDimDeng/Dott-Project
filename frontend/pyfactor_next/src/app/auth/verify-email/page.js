'use client';

import React, { useEffect } from 'react';
import VerifyEmailPage from './VerifyEmailPage';
import Image from 'next/image';
import Link from 'next/link';
import { logger } from '@/utils/logger';

export default function VerifyEmail() {
  // Initialize app cache when component mounts (client-side only)
  useEffect(() => {
    try {
      // Initialize app cache if it doesn't exist
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
        
        // Get tenant ID from app cache or fallback to sessionStorage
        const tenantId = 
          window.__APP_CACHE.tenant.id || 
          window.__APP_CACHE.auth.tenantId || 
          sessionStorage.getItem('tenantId');
        
        if (tenantId) {
          // Store in app cache in multiple locations for backward compatibility
          window.__APP_CACHE.tenant.id = tenantId;
          window.__APP_CACHE.auth.tenantId = tenantId;
          window.__APP_CACHE.tenantId = tenantId; // Legacy location
          
          logger.debug('Stored tenant ID in app cache:', tenantId);
        }
      }
    } catch (error) {
      logger.error('Error initializing app cache:', error);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-8 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={150}
              height={40}
              className="cursor-pointer"
            />
          </Link>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4">
        <VerifyEmailPage />
      </main>
      
      <footer className="py-4 px-8 border-t border-gray-200 text-center text-gray-600 text-sm">
        &copy; {new Date().getFullYear()} PyFactor. All rights reserved.
      </footer>
    </div>
  );
}