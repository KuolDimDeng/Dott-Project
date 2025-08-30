'use client';

import React from 'react';
import { MapIcon } from '@heroicons/react/24/outline';

const RoutePlanning = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <MapIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Route Planning</h1>
        <p className="text-gray-600 mb-6">Plan optimal routes with Google Maps integration</p>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <p className="text-orange-700">
            🚧 Route Planning feature coming soon! This will provide Google Maps integration for route optimization and fuel cost calculation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanning;