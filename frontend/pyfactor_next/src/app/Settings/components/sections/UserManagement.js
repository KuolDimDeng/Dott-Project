import React from 'react';

const UserManagement = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
      <p className="text-gray-600 mb-6">
        Manage user access, roles, and permissions for your organization.
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          User management features are coming soon. This will include:
        </p>
        <ul className="mt-2 space-y-1 text-yellow-700 text-sm">
          <li>• Invite new users via email</li>
          <li>• Assign roles (Owner, Admin, User)</li>
          <li>• Manage user permissions</li>
          <li>• View user activity logs</li>
          <li>• Remove user access</li>
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;