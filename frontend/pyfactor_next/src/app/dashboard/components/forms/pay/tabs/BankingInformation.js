'use client';

import React, { useState, useEffect } from 'react';
import { BanknotesIcon, DevicePhoneMobileIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Country-specific routing field names
const ROUTING_FIELD_NAMES = {
  'US': 'Routing Number',
  'GB': 'Sort Code', 
  'UK': 'Sort Code',
  'AU': 'BSB Code',
  'CA': 'Transit Number',
  'IN': 'IFSC Code',
  'ZA': 'Branch Code',
  'NZ': 'Bank/Branch Number',
  'SG': 'Bank/Branch Code',
  'KE': 'Bank Code',
  'NG': 'Bank Code',
  'GH': 'Branch Code',
  'UG': 'Branch Code',
  'TZ': 'Branch Code',
  'RW': 'Branch Code',
  'ET': 'Branch Code'
};

// Mobile money providers by country
const MOBILE_MONEY_PROVIDERS = {
  'KE': ['M-Pesa', 'Airtel Money', 'Equitel'],
  'NG': ['MTN Mobile Money', 'Airtel Money', 'OPay', 'PalmPay'],
  'GH': ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money'],
  'UG': ['MTN Mobile Money', 'Airtel Money'],
  'TZ': ['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Halotel'],
  'RW': ['MTN Mobile Money', 'Airtel Money'],
  'ZA': ['FNB eWallet', 'Standard Bank Instant Money', 'Nedbank Send-iMali'],
  'ZM': ['MTN Mobile Money', 'Airtel Money', 'Zamtel Money'],
  'ZW': ['EcoCash', 'OneMoney', 'Telecash'],
  'CM': ['MTN Mobile Money', 'Orange Money'],
  'CI': ['MTN Mobile Money', 'Orange Money', 'Moov Money'],
  'SN': ['Orange Money', 'Free Money', 'Wave'],
  'ML': ['Orange Money', 'Moov Money'],
  'BF': ['Orange Money', 'Moov Money'],
  'BJ': ['MTN Mobile Money', 'Moov Money'],
  'TG': ['Flooz', 'T-Money'],
  'NE': ['Orange Money', 'Airtel Money'],
  'MG': ['Orange Money', 'Airtel Money', 'MVola'],
  'MW': ['Airtel Money', 'TNM Mpamba']
};

const BankingInformation = ({ employeeId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userCountry, setUserCountry] = useState('US');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountNumberLast4: '',
    routingNumberLast4: '',
    // Mobile money fields
    mobileMoneyProvider: '',
    mobileMoneyNumber: '',
    preferMobileMoney: false
  });

  const routingFieldName = ROUTING_FIELD_NAMES[userCountry] || 'Bank Code';
  const hasMobileMoney = MOBILE_MONEY_PROVIDERS[userCountry];

  useEffect(() => {
    fetchBankingInfo();
    fetchUserCountry();
  }, [employeeId]);

  const fetchUserCountry = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        // Get country from user's business
        const country = data.business?.country || data.businessCountry || 'US';
        setUserCountry(country);
      }
    } catch (error) {
      console.error('Error fetching user country:', error);
    }
  };

  const fetchBankingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/employees/${employeeId}/banking`);
      
      if (response.ok) {
        const data = await response.json();
        setBankDetails({
          accountName: data.bank_account_name || '',
          bankName: data.bank_name || '',
          accountNumber: '', // Don't show full number
          routingNumber: '', // Don't show full number
          accountNumberLast4: data.account_number_last4 || '',
          routingNumberLast4: data.routing_number_last4 || '',
          mobileMoneyProvider: data.mobile_money_provider || '',
          mobileMoneyNumber: data.mobile_money_number || '',
          preferMobileMoney: data.prefer_mobile_money || false
        });
      }
    } catch (error) {
      console.error('Error fetching banking info:', error);
      toast.error('Failed to load banking information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Only send fields that have been filled
      const dataToSend = {};
      
      if (bankDetails.accountName) dataToSend.bank_account_name = bankDetails.accountName;
      if (bankDetails.bankName) dataToSend.bank_name = bankDetails.bankName;
      if (bankDetails.accountNumber) dataToSend.account_number = bankDetails.accountNumber;
      if (bankDetails.routingNumber) dataToSend.routing_number = bankDetails.routingNumber;
      
      // Mobile money fields
      if (bankDetails.mobileMoneyProvider) dataToSend.mobile_money_provider = bankDetails.mobileMoneyProvider;
      if (bankDetails.mobileMoneyNumber) dataToSend.mobile_money_number = bankDetails.mobileMoneyNumber;
      dataToSend.prefer_mobile_money = bankDetails.preferMobileMoney;

      const response = await fetch(`/api/hr/employees/${employeeId}/banking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        toast.success('Banking information updated successfully');
        // Refresh to show updated last 4 digits
        await fetchBankingInfo();
      } else {
        throw new Error('Failed to update banking information');
      }
    } catch (error) {
      console.error('Error saving banking info:', error);
      toast.error('Failed to save banking information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Banking Information</h2>
        <div className="flex items-center text-sm text-gray-500">
          <ShieldCheckIcon className="h-4 w-4 mr-1" />
          Secured by Stripe
        </div>
      </div>

      {/* Traditional Banking Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <BanknotesIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium">Bank Account Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={bankDetails.accountName}
              onChange={(e) => handleInputChange('accountName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chase Bank"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={bankDetails.accountNumberLast4 ? `••••••••${bankDetails.accountNumberLast4}` : 'Enter account number'}
              />
              {bankDetails.accountNumberLast4 && !bankDetails.accountNumber && (
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  ••••{bankDetails.accountNumberLast4}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {routingFieldName}
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankDetails.routingNumber}
                onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={bankDetails.routingNumberLast4 ? `•••••${bankDetails.routingNumberLast4}` : `Enter ${routingFieldName.toLowerCase()}`}
              />
              {bankDetails.routingNumberLast4 && !bankDetails.routingNumber && (
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  •••{bankDetails.routingNumberLast4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Money Section (conditional) */}
      {hasMobileMoney && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <DevicePhoneMobileIcon className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium">Mobile Money</h3>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bankDetails.preferMobileMoney}
                onChange={(e) => handleInputChange('preferMobileMoney', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Prefer to receive salary via mobile money
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                value={bankDetails.mobileMoneyProvider}
                onChange={(e) => handleInputChange('mobileMoneyProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select provider</option>
                {MOBILE_MONEY_PROVIDERS[userCountry]?.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={bankDetails.mobileMoneyNumber}
                onChange={(e) => handleInputChange('mobileMoneyNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={userCountry === 'KE' ? '07XXXXXXXX' : 'Enter mobile number'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Banking Information'}
        </button>
      </div>

      {/* Security Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">Your information is secure</h4>
            <p className="text-sm text-blue-700 mt-1">
              All sensitive banking information is encrypted and securely stored using Stripe's PCI-compliant infrastructure. 
              We only display the last 4 digits of your account numbers for your protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankingInformation;