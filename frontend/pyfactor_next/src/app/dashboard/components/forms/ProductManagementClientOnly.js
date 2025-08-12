'use client';

import { useEffect, useState } from 'react';

// This component ensures ProductManagement only loads on the client
export default function ProductManagementClientOnly() {
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    // Dynamically import the component only on the client side
    import('./ProductManagement').then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Product Management...</p>
        </div>
      </div>
    );
  }

  return <Component />;
}