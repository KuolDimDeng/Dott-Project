'use client';


import React from 'react';
import StandardSpinner from './ui/StandardSpinner';

/**
 * Simple loading screen component with spinner for dashboard
 */
export default function LoadingScreen({ message = 'Loading dashboard...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="mb-4">
        <StandardSpinner size="large" showText={false} />
      </div>
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );
} 