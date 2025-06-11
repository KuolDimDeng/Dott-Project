'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the CustomersList component with no SSR
const CustomersList = dynamic(
  () => import('./components/CustomersList'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
);

export default function CustomersPage() {
  return (
    <div className="h-full">
      <CustomersList />
    </div>
  );
}