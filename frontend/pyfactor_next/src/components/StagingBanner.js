'use client';

import { useEffect, useState } from 'react';

export default function StagingBanner() {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    // Only show in staging environment
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || 
        process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === 'true' ||
        window.location.hostname.includes('staging')) {
      setIsStaging(true);
    }
  }, []);

  if (!isStaging) return null;

  return (
    <div className="bg-yellow-500 text-black text-center py-2 px-4 text-sm font-medium">
      <div className="flex items-center justify-center space-x-2">
        <span className="animate-pulse">⚠️</span>
        <span>STAGING ENVIRONMENT - Test Data Only</span>
        <span className="animate-pulse">⚠️</span>
      </div>
    </div>
  );
}