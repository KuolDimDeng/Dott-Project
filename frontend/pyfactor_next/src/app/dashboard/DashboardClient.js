'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically load DashboardWrapper with SSR disabled to avoid hydration errors
const DashboardWrapper = dynamic(
  () => import('./DashboardWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-main"></div>
          <p className="mt-4 text-gray-600">Setting up your dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment for new accounts</p>
        </div>
      </div>
    )
  }
);

// Client component that wraps the dynamic import
export default function DashboardClient() {
  return <DashboardWrapper />;
} 