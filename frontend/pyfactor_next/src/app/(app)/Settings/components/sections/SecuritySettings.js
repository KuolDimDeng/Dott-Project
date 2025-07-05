'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  LockClosedIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { FieldTooltip } from '@/components/ui/FieldTooltip';
import { logger } from '@/utils/logger';

const SecuritySettings = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(false);
  const [securityData, setSecurityData] = useState({
    mfaEnabled: false,
    mfaMethods: [],
    sessions: [],
    auditLogs: [],
    securitySettings: {
      passwordPolicy: 'standard',
      sessionTimeout: 24,
      ipWhitelisting: false,
      whitelistedIps: [],
      forceLogoutOnPasswordChange: true,
      requireMfaForAdmins: false
    }
  });

  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      setSecurityData({
        mfaEnabled: false,
        mfaMethods: [],
        sessions: [
          {
            id: '1',
            device: 'Chrome on MacOS',
            location: 'San Francisco, CA',
            lastActive: new Date().toISOString(),
            current: true
          },
          {
            id: '2',
            device: 'Safari on iPhone',
            location: 'San Francisco, CA',
            lastActive: new Date(Date.now() - 3600000).toISOString(),
            current: false
          }
        ],
        auditLogs: [
          {
            id: '1',
            action: 'User login',
            user: user?.email || 'user@example.com',
            timestamp: new Date().toISOString(),
            status: 'success'
          },
          {
            id: '2',
            action: 'Updated company profile',
            user: user?.email || 'user@example.com',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'success'
          },
          {
            id: '3',
            action: 'Failed login attempt',
            user: 'unknown@example.com',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            status: 'failed'
          }
        ],
        securitySettings: {
          passwordPolicy: 'standard',
          sessionTimeout: 24,
          ipWhitelisting: false,
          whitelistedIps: [],
          forceLogoutOnPasswordChange: true,
          requireMfaForAdmins: false
        }
      });
    } catch (error) {
      logger.error('[SecuritySettings] Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notifySuccess('MFA setup initiated. Check your email for instructions.');
      setShowMfaSetup(true);
    } catch (error) {
      notifyError('Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSecurityData(prev => ({
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId)
      }));
      notifySuccess('Session revoked successfully');
    } catch (error) {
      notifyError('Failed to revoke session');
    }
  };

  const handleUpdateSecuritySettings = async (settings) => {
    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSecurityData(prev => ({
        ...prev,
        securitySettings: settings
      }));
      notifySuccess('Security settings updated');
    } catch (error) {
      notifyError('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const canManageSecurity = isOwner || isAdmin;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account security and compliance settings
        </p>
      </div>

      {loading && !securityData.sessions.length ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
              Two-Factor Authentication (2FA)
            </h3>
            
            {securityData.mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">2FA is enabled</p>
                      <p className="text-sm text-green-700">Your account is secured with two-factor authentication</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Active Methods:</h4>
                  <div className="space-y-2">
                    {securityData.mfaMethods.map((method, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          {method.type === 'app' ? (
                            <DevicePhoneMobileIcon className="h-5 w-5 text-gray-600 mr-3" />
                          ) : (
                            <KeyIcon className="h-5 w-5 text-gray-600 mr-3" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{method.name}</p>
                            <p className="text-xs text-gray-500">Added {new Date(method.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {}}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <p className="font-medium text-yellow-900">2FA is not enabled</p>
                      <p className="text-sm text-yellow-700">Protect your account with two-factor authentication</p>
                    </div>
                  </div>
                  <button
                    onClick={handleEnableMfa}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={loading}
                  >
                    Enable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ComputerDesktopIcon className="h-5 w-5 text-blue-600 mr-2" />
              Active Sessions
            </h3>
            
            <div className="space-y-3">
              {securityData.sessions.map((session) => {
                const isCurrent = session.current;
                
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ComputerDesktopIcon className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.device}
                          {isCurrent && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.location} • 
                          Last active {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
              
              {securityData.sessions.length === 0 && (
                <p className="text-center text-gray-500 py-4">No active sessions found</p>
              )}
            </div>
          </div>

          {canManageSecurity && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <LockClosedIcon className="h-5 w-5 text-blue-600 mr-2" />
                Security Policies
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Password Policy</span>
                      <FieldTooltip content="Set minimum requirements for user passwords" />
                    </div>
                    <select
                      value={securityData.securitySettings.passwordPolicy}
                      onChange={(e) => handleUpdateSecuritySettings({
                        ...securityData.securitySettings,
                        passwordPolicy: e.target.value
                      })}
                      className="ml-4 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="standard">Standard (8+ chars)</option>
                      <option value="strong">Strong (12+ chars, mixed case, numbers, symbols)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Session Timeout</span>
                      <FieldTooltip content="Automatically log out inactive users after this duration" />
                    </div>
                    <select
                      value={securityData.securitySettings.sessionTimeout}
                      onChange={(e) => handleUpdateSecuritySettings({
                        ...securityData.securitySettings,
                        sessionTimeout: parseInt(e.target.value)
                      })}
                      className="ml-4 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="1">1 hour</option>
                      <option value="4">4 hours</option>
                      <option value="8">8 hours</option>
                      <option value="24">24 hours</option>
                      <option value="168">7 days</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={securityData.securitySettings.requireMfaForAdmins}
                      onChange={(e) => handleUpdateSecuritySettings({
                        ...securityData.securitySettings,
                        requireMfaForAdmins: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Require 2FA for Admins</span>
                      <FieldTooltip content="All admin users must enable 2FA to access the system" />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={securityData.securitySettings.forceLogoutOnPasswordChange}
                      onChange={(e) => handleUpdateSecuritySettings({
                        ...securityData.securitySettings,
                        forceLogoutOnPasswordChange: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Force logout on password change</span>
                      <FieldTooltip content="Log out all sessions when a user changes their password" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                Audit Trail
              </h3>
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showAuditLogs ? 'Hide' : 'View All'}
              </button>
            </div>
            
            <div className="space-y-2">
              {securityData.auditLogs.slice(0, showAuditLogs ? undefined : 3).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">
                        {log.user} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    log.status === 'success' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
              
              {securityData.auditLogs.length === 0 && (
                <p className="text-center text-gray-500 py-4">No audit logs available</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
              Compliance & Certifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">SOC 2 Type II</p>
                  <p className="text-sm text-gray-600">Annual security audit compliance</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">GDPR Compliant</p>
                  <p className="text-sm text-gray-600">EU data protection standards</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">256-bit Encryption</p>
                  <p className="text-sm text-gray-600">Bank-level data encryption</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">99.9% Uptime SLA</p>
                  <p className="text-sm text-gray-600">Guaranteed service availability</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;