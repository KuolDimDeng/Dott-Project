'use client';


import { useState, useEffect } from 'react';
import { saveUserPreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

/**
 * Custom hook for managing sidebar state
 * Uses Cognito attributes for persistence and AppCache for performance
 * 
 * @param {boolean} defaultIsCollapsed - Default state if no saved preference
 * @returns {Array} [isCollapsed, toggleSidebar, setSidebarCollapsed]
 */
export function useSidebar(defaultIsCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(defaultIsCollapsed);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        // First check AppCache for better performance
        const cachedState = getCacheValue('sidebar_collapsed');
        
        if (cachedState !== null) {
          // Parse boolean value from cache
          setIsCollapsed(cachedState === true || cachedState === 'true');
          setIsLoaded(true);
          return;
        }
        
        // If not in cache, try to fetch from Cognito
        const response = await fetch('/api/user/preferences?key=sidebar_collapsed', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.value !== undefined) {
            // Parse boolean value
            const parsedValue = data.value === true || data.value === 'true';
            setIsCollapsed(parsedValue);
            
            // Update AppCache
            setCacheValue('sidebar_collapsed', parsedValue);
          }
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
        // Fall back to default
        setIsCollapsed(defaultIsCollapsed);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadSidebarState();
  }, [defaultIsCollapsed]);

  // Function to toggle sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    saveSidebarState(newState);
  };

  // Function to directly set sidebar state
  const setSidebarCollapsed = (state) => {
    setIsCollapsed(state);
    saveSidebarState(state);
  };

  // Helper to save sidebar state to Cognito and AppCache
  const saveSidebarState = async (state) => {
    try {
      // Update AppCache immediately for better UX
      setCacheValue('sidebar_collapsed', state);
      
      // Save to Cognito attributes
      await saveUserPreference('custom:sidebar_collapsed', state ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  };

  return [isCollapsed, toggleSidebar, setSidebarCollapsed, isLoaded];
} 