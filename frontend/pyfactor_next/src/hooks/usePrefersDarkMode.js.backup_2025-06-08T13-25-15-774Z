'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user's system prefers dark mode
 * 
 * @returns {boolean} True if the system prefers dark mode
 */
export function usePrefersDarkMode() {
  // Default to false during SSR
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Use CSS media query to detect color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial value
    setPrefersDarkMode(mediaQuery.matches);
    
    // Create handler for changes
    const handleChange = (e) => {
      setPrefersDarkMode(e.matches);
    };
    
    // Add event listener with browser compatibility
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  return prefersDarkMode;
} 