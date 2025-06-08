'use client';


import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design that detects if a media query matches
 * @param {string} query - CSS media query string (e.g. '(max-width: 768px)')
 * @returns {boolean} True if the media query matches
 */
export function useMediaQuery(query) {
  // Default to false on the server
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      // Create a MediaQueryList object
      const mediaQuery = window.matchMedia(query);
      
      // Set the initial value
      setMatches(mediaQuery.matches);

      // Define a callback to handle changes
      const handleChange = (event) => {
        setMatches(event.matches);
      };

      // Add the listener
      if (mediaQuery.addEventListener) {
        // Modern browsers
        mediaQuery.addEventListener('change', handleChange);
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      } else {
        // Legacy browsers (like IE)
        mediaQuery.addListener(handleChange);
        return () => {
          mediaQuery.removeListener(handleChange);
        };
      }
    }
    
    // No cleanup needed if window is not defined
    return () => {};
  }, [query]);

  return matches;
}