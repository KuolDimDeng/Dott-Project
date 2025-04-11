/**
 * Optimized state management utilities to reduce memory usage
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Creates a consolidated state object instead of multiple useState calls
 * This significantly reduces memory overhead when managing many state variables
 * 
 * @param {Object} initialState - Initial state object
 * @returns {[Object, Function]} - State object and update function
 */
export function useConsolidatedState(initialState) {
  const [state, setState] = useState(initialState);
  
  // Memoized update function to prevent unnecessary re-renders
  const updateState = useCallback((updates) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);
  
  return [state, updateState];
}

/**
 * Tracks memory usage and logs warnings when memory usage is high
 * 
 * @param {string} componentName - Name of the component for logging
 * @param {string} action - Current action (mount, update, unmount)
 */
export function trackMemory(componentName, action) {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;
  
  // Log memory usage
  console.log(`[Memory] ${componentName} ${action}: ${performance.memory?.usedJSHeapSize / 1024 / 1024} MB`);
  
  // Check if memory usage is high
  if (performance.memory?.usedJSHeapSize > 500 * 1024 * 1024) {
    console.warn(`[Memory Warning] High memory usage in ${componentName}: ${performance.memory?.usedJSHeapSize / 1024 / 1024} MB`);
  }
}

/**
 * Force garbage collection when possible
 * Note: This only works if the page is run with --expose-gc flag
 */
export function forceGarbageCollection() {
  if (typeof window !== 'undefined' && window.gc) {
    window.gc();
    console.log('[Memory] Forced garbage collection');
  }
}

/**
 * Hook to automatically clean up resources when component unmounts
 * 
 * @param {string} componentName - Name of the component for logging
 */
export function useMemoryCleanup(componentName) {
  useEffect(() => {
    // Track mount
    trackMemory(componentName, 'mount');
    
    return () => {
      // Track unmount and clean up
      trackMemory(componentName, 'unmount');
      forceGarbageCollection();
    };
  }, [componentName]);
}
