'use client';

import React from 'react';

/**
 * Simple loading screen component with spinner for dashboard
 */
export default function LoadingScreen({ message = 'Loading dashboard...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );
} 