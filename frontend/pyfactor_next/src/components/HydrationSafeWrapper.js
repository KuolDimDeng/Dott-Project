'use client';

import { useState, useEffect } from 'react';

export default function HydrationSafeWrapper({ children, fallback = null }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return fallback || <div className="min-h-screen" />;
  }

  return children;
}
