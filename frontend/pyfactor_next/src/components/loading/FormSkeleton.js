import React from 'react';

export default function FormSkeleton({ fields = 4 }) {
  return (
    <div className="animate-pulse bg-white shadow-md rounded-lg p-6">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
      
      <div className="space-y-4">
        {[...Array(fields)].map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}