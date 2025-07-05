'use client';


import React, { useState, useEffect } from 'react';

/**
 * PaySettings Component
 * Allows HR managers and owners to configure company-wide pay settings
 */
const PaySettings = ({ userData, isOwner }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [payPeriods, setPayPeriods] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load pay settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          const sampleSettings = {
            defaultPayFrequency: 'bi-weekly',
            payrollProcessingDay: 'Monday',
            payrollCutoffDay: 'Friday',
            defaultPaymentMethod: 'direct-deposit',
            allowEmployeePaySelection: true,
            automaticPayrollEnabled: true,
            payrollNotificationDays: 3,
            taxWithholdingDefaults: {
              federal: true,
              state: true,
              local: true,
              medicare: true,
              socialSecurity: true
            },
            benefitDeductionSettings: {
              deductBenefitsBeforeTax: true,
              allowEmployeeAdjustments: false
            }
          };
          
          const samplePayPeriods = [
            { id: 1, name: 'Weekly', value: 'weekly', description: 'Employees are paid every week' },
            { id: 2, name: 'Bi-Weekly', value: 'bi-weekly', description: 'Employees are paid every two weeks' },
            { id: 3, name: 'Semi-Monthly', value: 'semi-monthly', description: 'Employees are paid twice per month' },
            { id: 4, name: 'Monthly', value: 'monthly', description: 'Employees are paid once per month' }
          ];
          
          setSettings(sampleSettings);
          setPayPeriods(samplePayPeriods);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PaySettings] Error fetching settings:', error);
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleNestedSettingChange = (parentSetting, childSetting, value) => {
    setSettings(prev => ({
      ...prev,
      [parentSetting]: {
        ...prev[parentSetting],
        [childSetting]: value
      }
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!isOwner) {
      return;
    }
    
    setIsSaving(true);
    
    // Simulate API call to save settings
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Simulated successful save
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[PaySettings] Error saving settings:', error);
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payroll Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure company-wide payroll processing settings.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="default-pay-frequency" className="block text-sm font-medium text-gray-700">
                  Default Pay Frequency
                </label>
                <select
                  id="default-pay-frequency"
                  name="default-pay-frequency"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={settings.defaultPayFrequency}
                  onChange={(e) => handleSettingChange('defaultPayFrequency', e.target.value)}
                  disabled={!isOwner}
                >
                  {payPeriods.map((period) => (
                    <option key={period.id} value={period.value}>
                      {period.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  This will be the default for new employees.
                </p>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="payroll-processing-day" className="block text-sm font-medium text-gray-700">
                  Payroll Processing Day
                </label>
                <select
                  id="payroll-processing-day"
                  name="payroll-processing-day"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={settings.payrollProcessingDay}
                  onChange={(e) => handleSettingChange('payrollProcessingDay', e.target.value)}
                  disabled={!isOwner}
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="default-payment-method" className="block text-sm font-medium text-gray-700">
                  Default Payment Method
                </label>
                <select
                  id="default-payment-method"
                  name="default-payment-method"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={settings.defaultPaymentMethod}
                  onChange={(e) => handleSettingChange('defaultPaymentMethod', e.target.value)}
                  disabled={!isOwner}
                >
                  <option value="direct-deposit">Direct Deposit</option>
                  <option value="check">Paper Check</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="payroll-notification-days" className="block text-sm font-medium text-gray-700">
                  Payroll Notification Days
                </label>
                <input
                  type="number"
                  name="payroll-notification-days"
                  id="payroll-notification-days"
                  min="1"
                  max="10"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={settings.payrollNotificationDays}
                  onChange={(e) => handleSettingChange('payrollNotificationDays', parseInt(e.target.value))}
                  disabled={!isOwner}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Days before payroll to send notification reminders.
                </p>
              </div>
              
              <div className="col-span-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="automatic-payroll"
                      name="automatic-payroll"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={settings.automaticPayrollEnabled}
                      onChange={(e) => handleSettingChange('automaticPayrollEnabled', e.target.checked)}
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="automatic-payroll" className="font-medium text-gray-700">
                      Automatic Payroll Processing
                    </label>
                    <p className="text-gray-500">Process payroll automatically on scheduled dates.</p>
                  </div>
                </div>
              </div>
              
              <div className="col-span-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="allow-employee-pay-selection"
                      name="allow-employee-pay-selection"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={settings.allowEmployeePaySelection}
                      onChange={(e) => handleSettingChange('allowEmployeePaySelection', e.target.checked)}
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="allow-employee-pay-selection" className="font-medium text-gray-700">
                      Allow Employee Payment Method Selection
                    </label>
                    <p className="text-gray-500">Let employees choose their preferred payment method.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Tax & Benefit Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure default tax withholding and benefit deduction settings.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <h4 className="font-medium text-gray-700">Default Tax Withholding</h4>
                <div className="mt-4 space-y-4">
                  {Object.entries(settings.taxWithholdingDefaults).map(([tax, isEnabled]) => (
                    <div key={tax} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`tax-${tax}`}
                          name={`tax-${tax}`}
                          type="checkbox"
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          checked={isEnabled}
                          onChange={(e) => handleNestedSettingChange('taxWithholdingDefaults', tax, e.target.checked)}
                          disabled={!isOwner}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`tax-${tax}`} className="font-medium text-gray-700">
                          {tax.charAt(0).toUpperCase() + tax.slice(1)}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="col-span-6">
                <h4 className="font-medium text-gray-700">Benefit Deduction Settings</h4>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="deduct-benefits-before-tax"
                        name="deduct-benefits-before-tax"
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={settings.benefitDeductionSettings.deductBenefitsBeforeTax}
                        onChange={(e) => handleNestedSettingChange('benefitDeductionSettings', 'deductBenefitsBeforeTax', e.target.checked)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="deduct-benefits-before-tax" className="font-medium text-gray-700">
                        Deduct Benefits Before Tax (Pre-tax)
                      </label>
                      <p className="text-gray-500">Enable pre-tax deductions for eligible benefits.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="allow-employee-adjustments"
                        name="allow-employee-adjustments"
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={settings.benefitDeductionSettings.allowEmployeeAdjustments}
                        onChange={(e) => handleNestedSettingChange('benefitDeductionSettings', 'allowEmployeeAdjustments', e.target.checked)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="allow-employee-adjustments" className="font-medium text-gray-700">
                        Allow Employee Benefit Adjustments
                      </label>
                      <p className="text-gray-500">Let employees adjust their benefit selections and deduction amounts.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isOwner && (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-400 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
            onClick={() => {
              // Reset to initial values (would fetch from API in production)
              setLoading(true);
              setTimeout(() => {
                fetchSettings();
              }, 500);
            }}
          >
            Reset
          </button>
          
          <button
            type="button"
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSaving 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      )}
      
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Settings saved successfully
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaySettings; 