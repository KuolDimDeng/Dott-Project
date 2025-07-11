'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  UserGroupIcon,
  KeyIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function AdminSettings({ adminUser }) {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Only super admins can access settings
  if (adminUser.admin_role !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Only super administrators can access system settings</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/proxy/admin/settings', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/proxy/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
        setHasChanges(false);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Name
            </label>
            <input
              type="text"
              value={settings?.general?.system_name || ''}
              onChange={(e) => handleSettingChange('general', 'system_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={settings?.general?.support_email || ''}
              onChange={(e) => handleSettingChange('general', 'support_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Timezone
            </label>
            <select
              value={settings?.general?.default_timezone || 'UTC'}
              onChange={(e) => handleSettingChange('general', 'default_timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Mode
            </label>
            <div className="flex items-center">
              <button
                onClick={() => handleSettingChange('general', 'maintenance_mode', !settings?.general?.maintenance_mode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings?.general?.maintenance_mode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings?.general?.maintenance_mode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm text-gray-600">
                {settings?.general?.maintenance_mode ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {settings?.general?.maintenance_mode && (
              <textarea
                value={settings?.general?.maintenance_message || ''}
                onChange={(e) => handleSettingChange('general', 'maintenance_message', e.target.value)}
                placeholder="Maintenance message..."
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Security Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings?.security?.session_timeout || 60}
              onChange={(e) => handleSettingChange('security', 'session_timeout', parseInt(e.target.value))}
              min="5"
              max="1440"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Requirements
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings?.security?.password_require_uppercase || false}
                  onChange={(e) => handleSettingChange('security', 'password_require_uppercase', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Require uppercase letters</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings?.security?.password_require_numbers || false}
                  onChange={(e) => handleSettingChange('security', 'password_require_numbers', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Require numbers</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings?.security?.password_require_special || false}
                  onChange={(e) => handleSettingChange('security', 'password_require_special', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Require special characters</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Two-Factor Authentication
            </label>
            <select
              value={settings?.security?.two_factor_auth || 'optional'}
              onChange={(e) => handleSettingChange('security', 'two_factor_auth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="disabled">Disabled</option>
              <option value="optional">Optional</option>
              <option value="required">Required for all users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Whitelist (Admin Portal)
            </label>
            <textarea
              value={settings?.security?.admin_ip_whitelist?.join('\n') || ''}
              onChange={(e) => handleSettingChange('security', 'admin_ip_whitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
              placeholder="One IP address per line..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="4"
            />
            <p className="mt-1 text-sm text-gray-500">Leave empty to allow all IPs</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Provider
            </label>
            <select
              value={settings?.notifications?.email_provider || 'sendgrid'}
              onChange={(e) => handleSettingChange('notifications', 'email_provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sendgrid">SendGrid</option>
              <option value="ses">Amazon SES</option>
              <option value="mailgun">Mailgun</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Sender Email
            </label>
            <input
              type="email"
              value={settings?.notifications?.sender_email || ''}
              onChange={(e) => handleSettingChange('notifications', 'sender_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Sender Name
            </label>
            <input
              type="text"
              value={settings?.notifications?.sender_name || ''}
              onChange={(e) => handleSettingChange('notifications', 'sender_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Retention (days)
            </label>
            <input
              type="number"
              value={settings?.notifications?.retention_days || 90}
              onChange={(e) => handleSettingChange('notifications', 'retention_days', parseInt(e.target.value))}
              min="7"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Limiting
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={settings?.notifications?.rate_limit_count || 100}
                onChange={(e) => handleSettingChange('notifications', 'rate_limit_count', parseInt(e.target.value))}
                placeholder="Count"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                value={settings?.notifications?.rate_limit_window || 3600}
                onChange={(e) => handleSettingChange('notifications', 'rate_limit_window', parseInt(e.target.value))}
                placeholder="Window (seconds)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Integration Settings</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Sensitive Information</h4>
                <p className="mt-1 text-sm text-yellow-700">
                  API keys and secrets are masked for security. Enter new values to update.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stripe API Key
            </label>
            <input
              type="password"
              placeholder="sk_live_..."
              value={settings?.integrations?.stripe_api_key || ''}
              onChange={(e) => handleSettingChange('integrations', 'stripe_api_key', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth0 Domain
            </label>
            <input
              type="text"
              value={settings?.integrations?.auth0_domain || ''}
              onChange={(e) => handleSettingChange('integrations', 'auth0_domain', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crisp Website ID
            </label>
            <input
              type="text"
              value={settings?.integrations?.crisp_website_id || ''}
              onChange={(e) => handleSettingChange('integrations', 'crisp_website_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Analytics ID
            </label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={settings?.integrations?.google_analytics_id || ''}
              onChange={(e) => handleSettingChange('integrations', 'google_analytics_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('general')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'general'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CogIcon className="h-5 w-5 mr-3" />
              General
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'security'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShieldCheckIcon className="h-5 w-5 mr-3" />
              Security
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'notifications'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BellIcon className="h-5 w-5 mr-3" />
              Notifications
            </button>
            <button
              onClick={() => setActiveSection('integrations')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'integrations'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <GlobeAltIcon className="h-5 w-5 mr-3" />
              Integrations
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6">
            {activeSection === 'general' && renderGeneralSettings()}
            {activeSection === 'security' && renderSecuritySettings()}
            {activeSection === 'notifications' && renderNotificationSettings()}
            {activeSection === 'integrations' && renderIntegrationSettings()}
            
            {/* Save Button */}
            {hasChanges && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSaving ? (
                    <>
                      <StandardSpinner size="small" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}