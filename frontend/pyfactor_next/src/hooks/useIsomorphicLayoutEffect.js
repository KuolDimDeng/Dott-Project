'use client';


import { useEffect, useLayoutEffect } from 'react';

/**
 * Custom hook that uses useLayoutEffect on the client and falls back to useEffect during SSR
 * This prevents the "useLayoutEffect does nothing on the server" warning
 */
const useIsomorphicLayoutEffect = 
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect; 