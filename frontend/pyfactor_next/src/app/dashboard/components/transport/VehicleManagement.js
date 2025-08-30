'use client';

import React from 'react';
import { TruckIcon } from '@heroicons/react/24/outline';

const VehicleManagement = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <TruckIcon className="w-16 h-16 text-teal-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
        <p className="text-gray-600 mb-6">Manage your fleet vehicles, maintenance schedules, and efficiency tracking</p>
        
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <p className="text-teal-700">
            🚧 Vehicle Management feature coming soon! This will integrate with your existing vehicle database for comprehensive fleet management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagement;