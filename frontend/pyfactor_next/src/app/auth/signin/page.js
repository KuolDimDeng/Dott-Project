'use client';

import React from 'react';
import SignInForm from '../components/SignInForm';
import Image from 'next/image';
import Link from 'next/link';

export default function SignInPage() {
  // Add this function to clear all app cache on sign-in
  const clearAllAppCache = () => {
    if (typeof window === 'undefined' || !window.__APP_CACHE) return;
    
    // Log the cache clearing
    console.debug('[SignIn] Clearing all app cache to prevent data leakage');
    
    try {
      // Clear all categories
      Object.keys(window.__APP_CACHE).forEach(category => {
        window.__APP_CACHE[category] = {};
      });
      
      // Specifically ensure tenant data is cleared
      window.__APP_CACHE.tenant = {};
      window.__APP_CACHE.tenants = {};
      
      // Clear any legacy cache
      localStorage.removeItem('appCache');
      
      console.debug('[SignIn] App cache cleared successfully');
    } catch (error) {
      console.warn('[SignIn] Error clearing app cache:', error);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    // Clear app cache first to prevent any potential data leakage
    clearAllAppCache();
    
    try {
      // ... rest of sign-in code ...
    } catch (error) {
      // ... error handling ...
    }
  };

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
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
