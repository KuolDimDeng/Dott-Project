'use client';

import dynamic from 'next/dynamic';

// Dynamically import ProductManagement with no SSR to avoid hydration issues
const ProductManagement = dynamic(
  () => import('./ProductManagement'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

export default ProductManagement;