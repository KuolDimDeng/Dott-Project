'use client';

import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const BusinessOverview = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
          Business Overview
        </h1>
        <p className="text-gray-600">Complete snapshot of your business performance</p>
      </div>

      {/* Simple metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">$0.00</p>
          <p className="text-sm text-gray-600 mt-1">Loading data...</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">Loading data...</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Active Customers</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">Loading data...</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Products</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">Loading data...</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm text-gray-700">View Reports</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm text-gray-700">New Order</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm text-gray-700">Add Customer</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm text-gray-700">Add Product</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;