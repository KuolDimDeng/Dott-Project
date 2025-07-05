'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearCache } from '@/utils/appCache';

export default function ResetPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Resetting application state...');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      // Clear all cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear AppCache
      clearCache();
      
      // Log successful reset
      console.log('Successfully reset application state');
      setMessage('Application state has been reset. Redirecting to home page...');
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/?reset=true');
      }, 2000);
    } catch (err) {
      console.error('Error resetting application state:', err);
      setError(`Error: ${err.message}`);
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Application Reset</h1>
        <p className="mb-4">{message}</p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          This page clears all application state including cookies, local storage, session storage, and AppCache.
        </p>
      </div>
    </div>
  );
} 