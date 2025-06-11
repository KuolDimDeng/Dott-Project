'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the ServicesList component with no SSR
const ServicesList = dynamic(
  () => import('./components/ServicesList'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
);

export default function ServicesPage() {
  return (
    <div className="h-full">
      <ServicesList />
    </div>
  );
}