'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the VendorsList component with no SSR
const VendorsList = dynamic(
  () => import('./components/VendorsList'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
);

export default function VendorsPage() {
  return (
    <div className="h-full">
      <VendorsList />
    </div>
  );
}