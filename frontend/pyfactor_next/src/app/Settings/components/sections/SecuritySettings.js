import React from 'react';

const SecuritySettings = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
      <p className="text-gray-600 mb-6">
        Manage security settings for your account.
      </p>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">
          Security features are coming soon. This will include:
        </p>
        <ul className="mt-2 space-y-1 text-green-700 text-sm">
          <li>• Two-factor authentication (2FA)</li>
          <li>• Session management</li>
          <li>• Audit logs</li>
          <li>• Compliance settings</li>
          <li>• Security alerts</li>
        </ul>
      </div>
    </div>
  );
};

export default SecuritySettings;