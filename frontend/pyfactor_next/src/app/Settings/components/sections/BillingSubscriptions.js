import React from 'react';

const BillingSubscriptions = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing & Subscriptions</h2>
      <p className="text-gray-600 mb-6">
        Manage your subscription plan and billing information.
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          Billing management features are coming soon. This will include:
        </p>
        <ul className="mt-2 space-y-1 text-blue-700 text-sm">
          <li>• View current subscription plan</li>
          <li>• Upgrade or downgrade plans</li>
          <li>• View billing history</li>
          <li>• Update payment methods</li>
          <li>• Download invoices</li>
        </ul>
      </div>
    </div>
  );
};

export default BillingSubscriptions;