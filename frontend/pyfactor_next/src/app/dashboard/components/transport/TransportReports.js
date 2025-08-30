'use client';

import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const TransportReports = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <ChartBarIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Transport Reports</h1>
        <p className="text-gray-600 mb-6">Earnings reports, route efficiency, and tax documentation</p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="text-gray-700">
            🚧 Reporting feature coming soon! This will provide comprehensive analytics on earnings, fuel efficiency, and tax reporting for drivers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransportReports;