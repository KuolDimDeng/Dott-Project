'use client';


import { useState, useEffect } from 'react';
import { saveUserPreference, getSidebarCollapsedState, saveSidebarCollapsedState, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from @/utils/appCache';
import { logger } from '@/utils/logger';

const CACHE_KEY = 'sidebar_collapsed';

/**
 * Hook for managing sidebar collapsed state
 * Uses Cognito attributes with AppCache for better performance
 * 
 * @param {boolean} defaultCollapsed - Default collapsed state (default: false)
 * @returns {Object} Sidebar state and toggle function
 */
export function useSidebarState(defaultCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load sidebar state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        // First check AppCache for better performance
        const cachedState = getCacheValue(CACHE_KEY);
        
        if (cachedState !== undefined) {
          setIsCollapsed(cachedState === true || cachedState === 'true');
          setIsLoaded(true);
          return;
        }
        
        // If not in cache, fetch from Cognito using our helper
        try {
          const cognitoState = await getSidebarCollapsedState(defaultCollapsed);
          setIsCollapsed(cognitoState);
          setCacheValue(CACHE_KEY, cognitoState);
        } catch (apiError) {
          logger.error('Error fetching sidebar state from Cognito:', apiError);
          // API error, use default
          setIsCollapsed(defaultCollapsed);
        }
      } catch (error) {
        logger.error('Error loading sidebar state:', error);
        setIsCollapsed(defaultCollapsed);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadState();
  }, [defaultCollapsed]);
  
  /**
   * Toggle the sidebar collapsed state
   */
  const toggleSidebar = async () => {
    try {
      // Toggle state
      const newState = !isCollapsed;
      
      // Update state immediately for better UX
      setIsCollapsed(newState);
      
      // Update AppCache
      setCacheValue(CACHE_KEY, newState);
      
      // Save to Cognito using our helper function
      await saveSidebarCollapsedState(newState);
      
      logger.debug(`Sidebar collapsed state updated to: ${newState}`);
    } catch (error) {
      logger.error('Error saving sidebar state:', error);
    }
  };
  
  /**
   * Set the sidebar collapsed state explicitly
   * 
   * @param {boolean} newState - The new collapsed state
   */
  const setSidebarState = async (newState) => {
    if (typeof newState !== 'boolean') return;
    
    // Don't update if no change
    if (newState === isCollapsed) return;
    
    try {
      // Update state immediately for better UX
      setIsCollapsed(newState);
      
      // Update AppCache
      setCacheValue(CACHE_KEY, newState);
      
      // Save to Cognito using our helper function
      await saveSidebarCollapsedState(newState);
      
      logger.debug(`Sidebar collapsed state set to: ${newState}`);
    } catch (error) {
      logger.error('Error saving sidebar state:', error);
    }
  };
  
  return {
    isCollapsed,
    isLoaded,
    toggleSidebar,
    setSidebarState
  };
} 