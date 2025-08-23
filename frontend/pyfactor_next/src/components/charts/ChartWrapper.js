'use client';

import React, { useEffect, useState } from 'react';
import { registerChartComponents } from '@/lib/chartConfig';

/**
 * Wrapper component for Chart.js based charts
 * Ensures Chart.js is properly initialized before rendering
 */
export const ChartWrapper = ({ children, fallback = null }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const registered = registerChartComponents();
    setIsReady(registered);
  }, []);

  if (!isReady) {
    return fallback || (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ChartWrapper;