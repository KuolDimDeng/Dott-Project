'use client';

import React from 'react';
import { 
  UserGroupIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function UserManager({ adminUser }) {
  if (!adminUser.can_view_all_users) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view user management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <UserGroupIcon className="h-6 w-6 mr-2 text-green-600" />
          User Management
        </h2>
        <p className="text-gray-600">View and manage user accounts</p>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            User Management Coming Soon
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            This feature will allow you to view user profiles, manage accounts, 
            and analyze user behavior patterns.
          </p>
        </div>
      </div>
    </div>
  );
}