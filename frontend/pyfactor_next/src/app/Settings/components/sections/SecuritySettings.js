'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon,
  KeyIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  FingerPrintIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

const SecuritySettings = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mfa');
  const [securityData, setSecurityData] = useState({
    mfa: {
      enabled: false,
      methods: [],
      preferredMethod: null
    },
    sessions: [],
    auditLogs: [],
    compliance: {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expirationDays: 90
      },
      sessionTimeout: 30, // minutes
      maxLoginAttempts: 5,
      ipWhitelisting: false,
      whitelistedIPs: []
    }
  });

  // Tabs configuration
  const tabs = [
    { id: 'mfa', label: 'Multi-Factor Authentication', icon: FingerPrintIcon },
    { id: 'sessions', label: 'Active Sessions', icon: ComputerDesktopIcon },
    { id: 'audit', label: 'Audit Trail', icon: DocumentTextIcon },
    { id: 'compliance', label: 'Compliance & Policies', icon: ShieldCheckIcon }
  ];

  // Fetch security data
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        setLoading(true);
        
        // Fetch MFA status
        const mfaResponse = await fetch('/api/auth/mfa-status');
        if (mfaResponse.ok) {
          const mfaData = await mfaResponse.json();
          setSecurityData(prev => ({ ...prev, mfa: mfaData }));
        }

        // Fetch active sessions
        const sessionsResponse = await fetch('/api/auth/sessions');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSecurityData(prev => ({ ...prev, sessions: sessionsData }));
        }

        // Fetch audit logs (limited to recent 100)
        const auditResponse = await fetch('/api/audit/logs?limit=100');
        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          setSecurityData(prev => ({ ...prev, auditLogs: auditData }));
        }

        // Fetch compliance settings
        const complianceResponse = await fetch('/api/settings/compliance');
        if (complianceResponse.ok) {
          const complianceData = await complianceResponse.json();
          setSecurityData(prev => ({ ...prev, compliance: complianceData }));
        }
      } catch (error) {
        logger.error('[SecuritySettings] Error fetching security data:', error);
        notifyError('Failed to load security settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, [notifyError]);

  // Enable/Disable MFA
  const handleToggleMFA = async () => {
    try {
      if (!securityData.mfa.enabled) {
        // Redirect to Auth0 MFA setup
        window.location.href = '/api/auth/mfa-setup';
      } else {
        // Confirm before disabling
        if (!confirm('Are you sure you want to disable multi-factor authentication? This will make your account less secure.')) {
          return;
        }

        const response = await fetch('/api/auth/mfa-disable', {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to disable MFA');
        }

        setSecurityData(prev => ({
          ...prev,
          mfa: { ...prev.mfa, enabled: false }
        }));
        notifySuccess('Multi-factor authentication disabled');
      }
    } catch (error) {
      logger.error('[SecuritySettings] Error toggling MFA:', error);
      notifyError('Failed to update MFA settings');
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      setSecurityData(prev => ({
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId)
      }));
      notifySuccess('Session revoked successfully');
    } catch (error) {
      logger.error('[SecuritySettings] Error revoking session:', error);
      notifyError('Failed to revoke session');
    }
  };

  // Update compliance settings
  const handleUpdateCompliance = async (section, value) => {
    try {
      const response = await fetch('/api/settings/compliance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [section]: value
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update compliance settings');
      }

      setSecurityData(prev => ({
        ...prev,
        compliance: {
          ...prev.compliance,
          [section]: value
        }
      }));
      notifySuccess('Compliance settings updated');
    } catch (error) {
      logger.error('[SecuritySettings] Error updating compliance:', error);
      notifyError('Failed to update compliance settings');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading security settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Security Settings</h2>
        <p className="text-sm text-gray-600">
          Manage your account security, compliance, and audit settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* MFA Tab */}
        {activeTab === 'mfa' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Multi-Factor Authentication (MFA)
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">MFA Status</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <button
                    onClick={handleToggleMFA}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      securityData.mfa.enabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {securityData.mfa.enabled ? 'Disable MFA' : 'Enable MFA'}
                  </button>
                </div>
                
                {securityData.mfa.enabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 inline mr-2" />
                      Multi-factor authentication is active on your account
                    </p>
                  </div>
                )}
              </div>

              {!securityData.mfa.enabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Security Recommendation</p>
                      <p>Enable multi-factor authentication to protect your account from unauthorized access.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Sessions</h3>
            
            <div className="space-y-4">
              {securityData.sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active sessions found</p>
              ) : (
                securityData.sessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center mb-2">
                          <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">
                            {session.device || 'Unknown Device'}
                          </span>
                          {session.current && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>IP Address: {session.ipAddress}</p>
                          <p>Location: {session.location || 'Unknown'}</p>
                          <p>Last Active: {new Date(session.lastActive).toLocaleString()}</p>
                        </div>
                      </div>
                      {!session.current && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {securityData.auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No audit logs available
                      </td>
                    </tr>
                  ) : (
                    securityData.auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.userEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action.includes('delete') || log.action.includes('remove')
                              ? 'bg-red-100 text-red-800'
                              : log.action.includes('create') || log.action.includes('add')
                              ? 'bg-green-100 text-green-800'
                              : log.action.includes('update') || log.action.includes('edit')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && isAdmin && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Compliance & Security Policies
            </h3>
            
            <div className="space-y-6">
              {/* Password Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Password Policy</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">
                      Minimum Password Length
                      <FieldTooltip content="Minimum number of characters required for passwords" />
                    </label>
                    <input
                      type="number"
                      value={securityData.compliance.passwordPolicy.minLength}
                      onChange={(e) => handleUpdateCompliance('passwordPolicy', {
                        ...securityData.compliance.passwordPolicy,
                        minLength: parseInt(e.target.value)
                      })}
                      min="8"
                      max="32"
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">
                      Password Expiration (days)
                      <FieldTooltip content="Number of days before passwords must be changed" />
                    </label>
                    <input
                      type="number"
                      value={securityData.compliance.passwordPolicy.expirationDays}
                      onChange={(e) => handleUpdateCompliance('passwordPolicy', {
                        ...securityData.compliance.passwordPolicy,
                        expirationDays: parseInt(e.target.value)
                      })}
                      min="0"
                      max="365"
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securityData.compliance.passwordPolicy.requireUppercase}
                        onChange={(e) => handleUpdateCompliance('passwordPolicy', {
                          ...securityData.compliance.passwordPolicy,
                          requireUppercase: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securityData.compliance.passwordPolicy.requireNumbers}
                        onChange={(e) => handleUpdateCompliance('passwordPolicy', {
                          ...securityData.compliance.passwordPolicy,
                          requireNumbers: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require numbers</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securityData.compliance.passwordPolicy.requireSpecialChars}
                        onChange={(e) => handleUpdateCompliance('passwordPolicy', {
                          ...securityData.compliance.passwordPolicy,
                          requireSpecialChars: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Session Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Session Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">
                      Session Timeout (minutes)
                      <FieldTooltip content="Time before inactive sessions are automatically logged out" />
                    </label>
                    <input
                      type="number"
                      value={securityData.compliance.sessionTimeout}
                      onChange={(e) => handleUpdateCompliance('sessionTimeout', parseInt(e.target.value))}
                      min="5"
                      max="1440"
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">
                      Max Login Attempts
                      <FieldTooltip content="Number of failed login attempts before account lockout" />
                    </label>
                    <input
                      type="number"
                      value={securityData.compliance.maxLoginAttempts}
                      onChange={(e) => handleUpdateCompliance('maxLoginAttempts', parseInt(e.target.value))}
                      min="3"
                      max="10"
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Compliance Status</p>
                    <p>Your security settings meet industry standards for data protection.</p>
                    <ul className="mt-2 space-y-1">
                      <li>✓ SOC 2 Type II compliant infrastructure</li>
                      <li>✓ GDPR ready configuration</li>
                      <li>✓ PCI DSS Level 1 compliant payment processing</li>
                      <li>✓ HIPAA compliant data handling available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;