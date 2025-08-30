'use client';

import React from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

const FuelExpenses = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <CurrencyDollarIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fuel & Expenses</h1>
        <p className="text-gray-600 mb-6">Track fuel costs, tolls, maintenance, and operational expenses</p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <p className="text-indigo-700">
            🚧 Expense Tracking feature coming soon! This will help you track all operational costs with receipt capture and automatic categorization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuelExpenses;