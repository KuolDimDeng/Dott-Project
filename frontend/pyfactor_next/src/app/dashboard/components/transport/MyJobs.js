'use client';

import React from 'react';
import { TruckIcon } from '@heroicons/react/24/outline';

const MyJobs = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <TruckIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Transport Jobs</h1>
        <p className="text-gray-600 mb-6">Manage your active and pending delivery jobs</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-700">
            🚧 Transport Jobs feature coming soon! This will show your active delivery jobs, route progress, and customer details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyJobs;