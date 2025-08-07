'use client';

import React, { useState, useEffect } from 'react';

/**
 * Wrapper component to prevent hydration mismatches
 * Only renders children after hydration is complete
 */
const HydrationSafeWrapper = ({ children, fallback = null }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This effect only runs on the client side after hydration
    setIsHydrated(true);
  }, []);

  // During SSR and before hydration, show fallback or nothing
  if (!isHydrated) {
    return fallback;
  }

  // After hydration, render the actual children
  return children;
};

export default HydrationSafeWrapper;