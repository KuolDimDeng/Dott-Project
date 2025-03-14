'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Dashboard from './DashboardContent';
import { startMemoryMonitoring, stopMemoryMonitoring } from '@/utils/memoryDebugger';

// Dynamically import the MemoryDebugger component to avoid SSR issues
const MemoryDebugger = dynamic(() => import('@/components/Debug/MemoryDebugger'), {
  ssr: false
});

/**
 * Dashboard Wrapper Component
 * 
 * This component wraps the main Dashboard component and adds memory debugging
 * capabilities in development mode. It helps identify memory leaks and performance
 * issues in the dashboard.
 */
const DashboardWrapper = () => {
  // Start memory monitoring when the component mounts
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log('[Memory] Starting dashboard memory monitoring');
    
    // Start monitoring with a 10-second interval
    const monitoringInterval = startMemoryMonitoring(10000);
    
    return () => {
      // Stop monitoring when the component unmounts
      if (monitoringInterval) {
        stopMemoryMonitoring(monitoringInterval);
      }
    };
  }, []);
  
  return (
    <>
      <Dashboard />
      {/* Only show the memory debugger in development mode */}
      {process.env.NODE_ENV === 'development' && <MemoryDebugger />}
    </>
  );
};

export default DashboardWrapper;