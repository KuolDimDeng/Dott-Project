'use client';

import React from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';

const TransportCustomers = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <UsersIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Transport Customers</h1>
        <p className="text-gray-600 mb-6">Manage delivery customers and service history</p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-700">
            🚧 Customer Management feature coming soon! This will show your delivery customers, service history, and preferences.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransportCustomers;