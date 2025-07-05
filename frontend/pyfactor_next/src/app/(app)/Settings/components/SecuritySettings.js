'use client';

import React, { useState } from 'react';
import AuditTrail from '@/app/(app)/dashboard/components/AuditTrail';

const SecuritySettings = () => {
  const [activeTab, setActiveTab] = useState('audit-trail');

  const securityTabs = [
    { id: 'audit-trail', label: 'Audit Trail', icon: '📋' },
    { id: 'access-control', label: 'Access Control', icon: '🔐' },
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'security-logs', label: 'Security Logs', icon: '🛡️' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Settings</h1>
        <p className="text-gray-600">Manage your account security, audit trails, and access controls</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {securityTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center space-x-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'audit-trail' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Activity Audit Trail</h2>
              <p className="text-gray-600">
                View and export a comprehensive log of all activities in your account. 
                Track who did what, when, and from where.
              </p>
            </div>
            <AuditTrail />
          </div>
        )}

        {activeTab === 'access-control' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Control</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
              <p>Access control features coming soon...</p>
              <p className="mt-2 text-sm">
                You'll be able to manage user permissions, roles, and access levels here.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Keys</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
              <p>API key management coming soon...</p>
              <p className="mt-2 text-sm">
                Generate and manage API keys for third-party integrations here.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'security-logs' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Logs</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
              <p>Security logs coming soon...</p>
              <p className="mt-2 text-sm">
                View login attempts, password changes, and other security-related events here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;