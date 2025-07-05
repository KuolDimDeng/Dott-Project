'use client';

import { appCache } from @/utils/appCache';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/config/amplifyUnified';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';

export default function SignOut() {
  const router = useRouter();
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function performSignOut() {
      try {
        logger.info("[SignOut] Starting signout process");
        
        // First, clear all storage regardless of API result
        try {
          // Initialize global app cache if not exists
          if (typeof window !== 'undefined') {
            if (!appCache.getAll()) {
              appCache.init();
            }
            
            // Clear app cache
            appCache.init();
            logger.info("[SignOut] Cleared global app cache");
            
            // Clear sessionStorage for backward compatibility
            sessionStorage.clear();
            
            // Clear cookies using a more modern approach
            if (typeof window !== 'undefined') {
              // Import js-cookie dynamically if needed
              try {
                // Get all cookies and expire them
                const cookies = document.cookie.split(';');
                for (const cookie of cookies) {
                  const [name] = cookie.trim().split('=');
                  // Set expiration to past date, include path, and set secure/samesite as needed
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict`;
                }
                logger.info("[SignOut] Cleared cookies using secure approach");
              } catch (cookieError) {
                logger.error("[SignOut] Error clearing cookies:", cookieError);
              }
            }
            
            logger.info("[SignOut] Cleared session storage and cookies");
          }
        } catch (storageError) {
          logger.error("[SignOut] Error clearing storage:", storageError);
        }
        
        // Try to sign out via Amplify
        try {
          await signOut({ global: true });
          logger.info("[SignOut] Successfully signed out via Amplify");
        } catch (signOutError) {
          // Just log the error but continue - we've already cleared storage
          logger.warn("[SignOut] Error with Amplify signOut:", signOutError);
        }
        
        // Add a slight delay for visual feedback
        setTimeout(() => {
          // Redirect to home page
          router.push('/?signout=success');
        }, 1000);
      } catch (error) {
        logger.error("[SignOut] Unexpected error:", error);
        setError("An error occurred during sign out. Please try again.");
        
        // Redirect anyway after a delay
        setTimeout(() => {
          router.push('/?signout=error');
        }, 3000);
      }
    }
    
    performSignOut();
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="mb-8 bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Signing Out</h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CircularProgress color="primary" size={40} className="mb-4" />
            <p className="text-gray-600">Signing you out...</p>
          </div>
        )}
      </div>
    </div>
  );
}
