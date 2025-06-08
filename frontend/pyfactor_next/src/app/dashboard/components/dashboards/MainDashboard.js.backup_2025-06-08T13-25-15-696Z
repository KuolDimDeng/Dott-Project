'use client';

import React from 'react';

/**
 * Main Dashboard Component
 * A simplified dashboard component that doesn't make heavy API calls
 */
function MainDashboard({ userData }) {
  // Generate a proper greeting with the user's name
  const displayName = () => {
    if (userData?.first_name) {
      return userData.first_name;
    } else if (userData?.email) {
      const username = userData.email.split('@')[0];
      // Capitalize first letter of username
      return username.charAt(0).toUpperCase() + username.slice(1);
    } else if (userData?.name) {
      return userData.name;
    }
    return 'there'; // More friendly than 'User'
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Main Dashboard
      </h1>
      
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Welcome to your main dashboard, {displayName()}!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Simple dashboard cards that don't require API calls */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col h-full">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Recent Activity
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            No recent activity to display.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col h-full">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Notifications
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            No new notifications.
          </p>
        </div>
        
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 p-4 rounded text-center cursor-pointer hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition-colors">
              <p className="font-medium">Add Customer</p>
            </div>
            
            <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-4 rounded text-center cursor-pointer hover:bg-green-600 hover:text-white dark:hover:bg-green-700 transition-colors">
              <p className="font-medium">Create Invoice</p>
            </div>
            
            <div className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 p-4 rounded text-center cursor-pointer hover:bg-amber-600 hover:text-white dark:hover:bg-amber-700 transition-colors">
              <p className="font-medium">Add Product</p>
            </div>
            
            <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 p-4 rounded text-center cursor-pointer hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-700 transition-colors">
              <p className="font-medium">View Reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainDashboard;