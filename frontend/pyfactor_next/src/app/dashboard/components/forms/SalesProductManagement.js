'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ProductManagement to ensure proper client-side loading
const ProductManagement = dynamic(
  () => import('./ProductManagement'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Product Management...</p>
        </div>
      </div>
    ),
    ssr: false // Disable server-side rendering for this component
  }
);

/**
 * A wrapper component for product management in sales context.
 * This component ensures proper initialization of the ProductManagement component
 * with the salesContext prop and handles client-side only rendering.
 */
const SalesProductManagement = (props) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Sales Products...</p>
        </div>
      </div>
    }>
      <ProductManagement 
        {...props} 
        salesContext={true} 
      />
    </Suspense>
  );
};

export default SalesProductManagement;