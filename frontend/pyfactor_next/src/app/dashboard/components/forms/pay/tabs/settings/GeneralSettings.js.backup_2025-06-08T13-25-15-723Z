'use client';

import React, { useState, useEffect } from 'react';

/**
 * GeneralSettings Component
 * Allows configuration of general company-wide payroll settings
 * Used within the PaySettings parent component
 */
const GeneralSettings = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load general settings data
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          const sampleSettings = {
            payrollProcessDay: 'Monday',
            payrollCutoffDay: 'Friday',
            payrollAutoApproval: false,
            approvalRequiredBy: 'HR Manager',
            paymentMethods: {
              directDeposit: true,
              check: true,
              digitalWallet: false
            },
            employeeOptions: {
              allowPayStubAccess: true,
              allowW2Access: true,
              allowDirectDepositChange: true,
              allowTaxWithholdingChange: false
            },
            notifications: {
              sendAdminReminders: true,
              sendEmployeeNotifications: true,
              reminderDaysBefore: 3
            },
            payrollLock: {
              lockPayrollAfterDays: 14,
              allowCorrections: true,
              requireApprovalForCorrections: true
            }
          };
          
          setSettings(sampleSettings);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[GeneralSettings] Error fetching settings:', error);
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleDirectSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[GeneralSettings] Error saving settings:', error);
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Settings updated successfully</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Payroll Processing */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payroll Processing</h3>
          <p className="mt-1 text-sm text-gray-500">General settings for payroll processing</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payroll Processing Day</label>
              <select
                value={settings.payrollProcessDay}
                onChange={(e) => handleDirectSettingChange('payrollProcessDay', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The day of the week when payroll is typically processed
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Payroll Cutoff Day</label>
              <select
                value={settings.payrollCutoffDay}
                onChange={(e) => handleDirectSettingChange('payrollCutoffDay', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The day of the week when time entries are finalized
              </p>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auto-approval"
                  name="auto-approval"
                  type="checkbox"
                  checked={settings.payrollAutoApproval}
                  onChange={(e) => handleDirectSettingChange('payrollAutoApproval', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="auto-approval" className="font-medium text-gray-700">Automatic Payroll Approval</label>
                <p className="text-gray-500">Automatically approve payroll if no issues are detected</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Approval Required By</label>
              <select
                value={settings.approvalRequiredBy}
                onChange={(e) => handleDirectSettingChange('approvalRequiredBy', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="HR Manager">HR Manager</option>
                <option value="Department Head">Department Head</option>
                <option value="Finance Manager">Finance Manager</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Methods */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          <p className="mt-1 text-sm text-gray-500">Configure available payment methods for employees</p>
        </div>
        <div className="px-4 py-5">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="direct-deposit"
                  name="direct-deposit"
                  type="checkbox"
                  checked={settings.paymentMethods.directDeposit}
                  onChange={(e) => handleSettingChange('paymentMethods', 'directDeposit', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="direct-deposit" className="font-medium text-gray-700">Direct Deposit</label>
                <p className="text-gray-500">Allow payment via direct bank deposit</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="check"
                  name="check"
                  type="checkbox"
                  checked={settings.paymentMethods.check}
                  onChange={(e) => handleSettingChange('paymentMethods', 'check', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="check" className="font-medium text-gray-700">Paper Check</label>
                <p className="text-gray-500">Allow payment via physical check</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="digital-wallet"
                  name="digital-wallet"
                  type="checkbox"
                  checked={settings.paymentMethods.digitalWallet}
                  onChange={(e) => handleSettingChange('paymentMethods', 'digitalWallet', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="digital-wallet" className="font-medium text-gray-700">Digital Wallet</label>
                <p className="text-gray-500">Allow payment to digital wallets (PayPal, Venmo, etc.)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Employee Self-Service Options */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employee Self-Service Options</h3>
          <p className="mt-1 text-sm text-gray-500">Configure what employees can view and modify</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="pay-stub-access"
                  name="pay-stub-access"
                  type="checkbox"
                  checked={settings.employeeOptions.allowPayStubAccess}
                  onChange={(e) => handleSettingChange('employeeOptions', 'allowPayStubAccess', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="pay-stub-access" className="font-medium text-gray-700">Pay Stub Access</label>
                <p className="text-gray-500">Allow employees to view their pay stubs</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="w2-access"
                  name="w2-access"
                  type="checkbox"
                  checked={settings.employeeOptions.allowW2Access}
                  onChange={(e) => handleSettingChange('employeeOptions', 'allowW2Access', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="w2-access" className="font-medium text-gray-700">W-2 Access</label>
                <p className="text-gray-500">Allow employees to view their W-2 forms</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="direct-deposit-change"
                  name="direct-deposit-change"
                  type="checkbox"
                  checked={settings.employeeOptions.allowDirectDepositChange}
                  onChange={(e) => handleSettingChange('employeeOptions', 'allowDirectDepositChange', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="direct-deposit-change" className="font-medium text-gray-700">Direct Deposit Changes</label>
                <p className="text-gray-500">Allow employees to update their direct deposit information</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="tax-withholding-change"
                  name="tax-withholding-change"
                  type="checkbox"
                  checked={settings.employeeOptions.allowTaxWithholdingChange}
                  onChange={(e) => handleSettingChange('employeeOptions', 'allowTaxWithholdingChange', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="tax-withholding-change" className="font-medium text-gray-700">Tax Withholding Changes</label>
                <p className="text-gray-500">Allow employees to modify their tax withholding allowances</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notifications */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Configure automatic notifications for payroll events</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="admin-reminders"
                  name="admin-reminders"
                  type="checkbox"
                  checked={settings.notifications.sendAdminReminders}
                  onChange={(e) => handleSettingChange('notifications', 'sendAdminReminders', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="admin-reminders" className="font-medium text-gray-700">Admin Reminders</label>
                <p className="text-gray-500">Send reminders to administrators about upcoming payroll tasks</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="employee-notifications"
                  name="employee-notifications"
                  type="checkbox"
                  checked={settings.notifications.sendEmployeeNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'sendEmployeeNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="employee-notifications" className="font-medium text-gray-700">Employee Notifications</label>
                <p className="text-gray-500">Send notifications to employees about payroll events</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Reminder Days Before</label>
              <select
                value={settings.notifications.reminderDaysBefore}
                onChange={(e) => handleSettingChange('notifications', 'reminderDaysBefore', parseInt(e.target.value))}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {[1, 2, 3, 5, 7].map(days => (
                  <option key={days} value={days}>{days} day{days !== 1 ? 's' : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                How many days before payroll processing to send reminders
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payroll Lock Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payroll Lock Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Configure when payroll data is locked and how corrections are handled</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lock Payroll After (Days)</label>
              <select
                value={settings.payrollLock.lockPayrollAfterDays}
                onChange={(e) => handleSettingChange('payrollLock', 'lockPayrollAfterDays', parseInt(e.target.value))}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {[7, 14, 30, 60, 90].map(days => (
                  <option key={days} value={days}>{days} days</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Number of days after processing when payroll data becomes locked
              </p>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="allow-corrections"
                  name="allow-corrections"
                  type="checkbox"
                  checked={settings.payrollLock.allowCorrections}
                  onChange={(e) => handleSettingChange('payrollLock', 'allowCorrections', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="allow-corrections" className="font-medium text-gray-700">Allow Corrections</label>
                <p className="text-gray-500">Allow corrections to be made to locked payroll data</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="require-approval"
                  name="require-approval"
                  type="checkbox"
                  checked={settings.payrollLock.requireApprovalForCorrections}
                  onChange={(e) => handleSettingChange('payrollLock', 'requireApprovalForCorrections', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="require-approval" className="font-medium text-gray-700">Require Approval for Corrections</label>
                <p className="text-gray-500">Require owner approval for corrections to locked payroll data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings; 