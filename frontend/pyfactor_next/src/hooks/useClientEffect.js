'use client';


import { useEffect, useLayoutEffect } from 'react';

/**
 * Custom hook that uses useLayoutEffect on the client and falls back to useEffect during SSR
 * 
 * This prevents the "useLayoutEffect does nothing on the server" warning while preserving
 * the benefits of useLayoutEffect on the client side.
 * 
 * - useLayoutEffect: Fires synchronously after DOM mutations but before browser paint
 * - useEffect: Fires asynchronously after paint, which may cause visual flickering
 * 
 * @param {Function} effect - Function to run after DOM mutations
 * @param {Array} deps - Dependency array that determines when the effect should re-run
 */
const useClientEffect = typeof window !== 'undefined' 
  ? useLayoutEffect 
  : (effect, deps) => {
      // Skip execution entirely during SSR to prevent warnings
      if (typeof window === 'undefined') {
        // Server-side - no-op to avoid warnings
        return () => {};
      }
      
      // Run useEffect on client 
      return useEffect(effect, deps);
    };

export default useClientEffect;