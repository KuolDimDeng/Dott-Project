'use client';

import { appCache } from '../utils/appCache';


import { useEffect } from 'react';
import { verifyTenantOwnership } from '@/utils/menuPrivileges';
import { logger } from '@/utils/logger';

/**
 * Component that initializes menu privileges and verifies tenant ownership.
 * This component should be mounted as early as possible in the component tree.
 */
export default function MenuPrivilegeInitializer() {
  useEffect(() => {
    const initMenuPrivileges = async () => {
      try {
        // Check if we're authenticated
        const isAuthenticated = getCacheValue('auth')?.isAuthenticated || 
                               (typeof window !== 'undefined' && appCache.getAll()
        
        if (!isAuthenticated) {
          logger.debug('[MenuPrivilegeInitializer] User not authenticated yet, waiting...');
          return;
        }
        
        logger.info('[MenuPrivilegeInitializer] Starting menu privilege initialization');
        
        // Verify tenant ownership - this will update the cache
        const isOwner = await verifyTenantOwnership();
        
        logger.info(`[MenuPrivilegeInitializer] User is ${isOwner ? '' : 'not '}a tenant owner`);
        
        // Dispatch event to update components that rely on menu privileges
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userMenuPrivilegesLoaded', {
            detail: { 
              menuPrivileges: isOwner ? 'ALL' : getCacheValue('currentUserMenuPrivileges') || [], 
              isOwner 
            }
          }));
        }
        
        logger.info('[MenuPrivilegeInitializer] Menu privileges initialized');
      } catch (error) {
        logger.error('[MenuPrivilegeInitializer] Error initializing menu privileges:', error);
      }
    };
    
    // Initialize immediately
    initMenuPrivileges();
    
    // Also initialize when auth status changes
    const handleAuthChange = () => {
      logger.debug('[MenuPrivilegeInitializer] Auth status changed, reinitializing menu privileges');
      initMenuPrivileges();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('authStatusChanged', handleAuthChange);
      
      // Retry initialization periodically in case first attempt didn't have auth data
      const initInterval = setInterval(() => {
        const isAuthenticated = getCacheValue('auth')?.isAuthenticated || 
                               appCache.getAll()
        
        if (isAuthenticated) {
          initMenuPrivileges();
        }
      }, 5000); // Try every 5 seconds
      
      return () => {
        window.removeEventListener('authStatusChanged', handleAuthChange);
        clearInterval(initInterval);
      };
    }
    
    return () => {}; // Empty cleanup function for SSR
  }, []);
  
  // This component doesn't render anything visible
  return null;
} 