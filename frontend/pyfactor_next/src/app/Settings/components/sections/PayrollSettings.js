'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { logger } from '@/utils/logger';
import FieldTooltip from '@/components/ui/FieldTooltip';
import StandardSpinner from '@/components/ui/StandardSpinner';
import api from '@/utils/api';

const PayrollSettings = ({ user, notifySuccess, notifyError }) => {
  const { profileData, refreshSession } = useSessionContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    pay_frequency: 'BIWEEKLY',
    pay_days: [],
    pay_weekday: 5, // Friday
    enable_direct_deposit: true,
    enable_bonuses: true,
    enable_commissions: false,
    enable_recurring_allowances: false,
    enable_overtime: true,
    overtime_rate: 1.5,
    processing_lead_time: 3,
    notify_employees_on_payday: true,
    notify_payroll_admins_before_processing: true,
    admin_notification_days: 2
  });

  const PAY_FREQUENCIES = [
    { value: 'DAILY', label: 'Daily', description: 'Pay every working day' },
    { value: 'WEEKLY', label: 'Weekly', description: 'Pay once a week' },
    { value: 'BIWEEKLY', label: 'Bi-Weekly', description: 'Pay every two weeks' },
    { value: 'SEMIMONTHLY', label: 'Semi-Monthly', description: 'Pay twice a month on specific dates' },
    { value: 'MONTHLY', label: 'Monthly', description: 'Pay once a month' },
    { value: 'QUARTERLY', label: 'Quarterly', description: 'Pay every three months' }
  ];

  const WEEKDAYS = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' }
  ];

  // Load payroll settings
  useEffect(() => {
    fetchPayrollSettings();
  }, []);

  const fetchPayrollSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/payroll/settings/');
      
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      logger.error('Error fetching payroll settings:', error);
      notifyError('Failed to load payroll settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await api.post('/api/payroll/settings/', settings);
      
      if (response.data) {
        setSettings(response.data);
        notifySuccess('Payroll settings saved successfully');
        
        // Refresh session to ensure settings are synced
        if (refreshSession) {
          await refreshSession();
        }
      }
    } catch (error) {
      logger.error('Error saving payroll settings:', error);
      notifyError('Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePayDaysChange = (day) => {
    const days = [...(settings.pay_days || [])];
    const index = days.indexOf(day);
    
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    
    setSettings({
      ...settings,
      pay_days: days.sort((a, b) => a - b)
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Payroll Settings</h2>
        <p className="text-sm text-gray-600">
          Configure pay periods, schedules, and payroll processing options for your business.
        </p>
      </div>

      {/* Pay Period Configuration */}
      <div className="space-y-6">
        <h3 className="text-base font-medium text-gray-900">Pay Period Configuration</h3>
        
        {/* Pay Frequency */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Pay Frequency
            <FieldTooltip content="How often employees are paid. This affects timesheet periods and payroll processing." />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAY_FREQUENCIES.map((freq) => (
              <button
                key={freq.value}
                onClick={() => setSettings({ ...settings, pay_frequency: freq.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  settings.pay_frequency === freq.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{freq.label}</div>
                <div className="text-xs text-gray-500 mt-1">{freq.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pay Day Selection */}
        {settings.pay_frequency === 'WEEKLY' || settings.pay_frequency === 'BIWEEKLY' ? (
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Pay Day
              <FieldTooltip content="The day of the week when payments are made." />
            </label>
            <select
              value={settings.pay_weekday}
              onChange={(e) => setSettings({ ...settings, pay_weekday: parseInt(e.target.value) })}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        ) : settings.pay_frequency === 'SEMIMONTHLY' ? (
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Pay Days (Select 2)
              <FieldTooltip content="Select two days of the month for semi-monthly payments (e.g., 15th and last day)." />
            </label>
            <div className="grid grid-cols-7 gap-2">
              {[...Array(31)].map((_, i) => {
                const day = i + 1;
                const isSelected = settings.pay_days?.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => handlePayDaysChange(day)}
                    disabled={!isSelected && settings.pay_days?.length >= 2}
                    className={`p-2 rounded text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${
                      !isSelected && settings.pay_days?.length >= 2
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {settings.pay_days?.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Selected days: {settings.pay_days.join(', ')}
              </p>
            )}
          </div>
        ) : null}

        {/* Processing Lead Time */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Processing Lead Time (Days)
            <FieldTooltip content="Number of days before payday to start processing payroll." />
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={settings.processing_lead_time}
            onChange={(e) => setSettings({ ...settings, processing_lead_time: parseInt(e.target.value) || 3 })}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Payroll processing will begin {settings.processing_lead_time} days before each pay date.
          </p>
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Payment Options</h3>
        
        <div className="space-y-3">
          {/* Direct Deposit */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enable_direct_deposit}
              onChange={(e) => setSettings({ ...settings, enable_direct_deposit: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Direct Deposit</span>
            <FieldTooltip content="Allow employees to receive payments directly to their bank accounts." />
          </label>

          {/* Bonuses */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enable_bonuses}
              onChange={(e) => setSettings({ ...settings, enable_bonuses: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Bonus Payments</span>
            <FieldTooltip content="Allow managers to award bonus payments to employees." />
          </label>

          {/* Commissions */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enable_commissions}
              onChange={(e) => setSettings({ ...settings, enable_commissions: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Commissions</span>
            <FieldTooltip content="Track and pay sales commissions to employees." />
          </label>

          {/* Recurring Allowances */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enable_recurring_allowances}
              onChange={(e) => setSettings({ ...settings, enable_recurring_allowances: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Recurring Allowances</span>
            <FieldTooltip content="Set up recurring allowances like housing or transportation." />
          </label>
        </div>
      </div>

      {/* Overtime Settings */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Overtime Settings</h3>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enable_overtime}
            onChange={(e) => setSettings({ ...settings, enable_overtime: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Enable Overtime Calculations</span>
          <FieldTooltip content="Automatically calculate overtime pay for hours worked beyond regular hours." />
        </label>

        {settings.enable_overtime && (
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Overtime Rate Multiplier
              <FieldTooltip content="Rate multiplier for overtime hours (e.g., 1.5 for time-and-a-half)." />
            </label>
            <input
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={settings.overtime_rate}
              onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) || 1.5 })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Overtime hours will be paid at {settings.overtime_rate}x the regular rate.
            </p>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Notification Settings</h3>
        
        <div className="space-y-3">
          {/* Employee Notifications */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notify_employees_on_payday}
              onChange={(e) => setSettings({ ...settings, notify_employees_on_payday: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Notify employees on payday</span>
            <FieldTooltip content="Send payment notifications to employees when payroll is processed." />
          </label>

          {/* Admin Notifications */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notify_payroll_admins_before_processing}
              onChange={(e) => setSettings({ ...settings, notify_payroll_admins_before_processing: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Notify admins before processing</span>
            <FieldTooltip content="Send reminders to payroll administrators before payroll processing begins." />
          </label>

          {settings.notify_payroll_admins_before_processing && (
            <div className="ml-6">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Notification Lead Time (Days)
                <FieldTooltip content="How many days before processing to notify administrators." />
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={settings.admin_notification_days}
                onChange={(e) => setSettings({ ...settings, admin_notification_days: parseInt(e.target.value) || 2 })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <StandardSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default PayrollSettings;