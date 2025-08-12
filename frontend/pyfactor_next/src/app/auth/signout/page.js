'use client';

import { appCache } from '@/utils/appCache';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Auth0 signout is handled via /api/auth/logout
import OAuthLoadingScreen from '@/components/auth/OAuthLoadingScreen';
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
        
        // Redirect to Auth0 logout
        logger.info("[SignOut] Redirecting to Auth0 logout");
        window.location.href = '/api/auth/logout';
        
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
    <OAuthLoadingScreen 
      status="Signing you out..." 
      error={error}
    />
  );
}
