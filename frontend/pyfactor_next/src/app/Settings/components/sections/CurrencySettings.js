'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getCurrencyForCountry, getAllCurrencies } from '@/utils/currencyMapping';
import { logger } from '@/utils/logger';
import { useProfile } from '@/hooks/useProfile';
import { 
  CurrencyDollarIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CurrencySettings = () => {
  const { notifySuccess, notifyError } = useNotification();
  const { currency: currentCurrency, updateCurrency, refreshCurrency, isLoading } = useCurrency();
  const { profileData } = useProfile();
  
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoDetectedCurrency, setAutoDetectedCurrency] = useState(null);
  
  // Get all available currencies
  const allCurrencies = getAllCurrencies();
  
  // Filter currencies based on search
  const filteredCurrencies = allCurrencies.filter(curr => 
    curr.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    curr.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Initialize with current currency
  useEffect(() => {
    if (currentCurrency?.code) {
      setSelectedCurrency(currentCurrency.code);
      console.log('💰 [CurrencySettings] Current currency:', currentCurrency);
    }
  }, [currentCurrency]);
  
  // Auto-detect currency based on country
  useEffect(() => {
    if (profileData?.country) {
      const detected = getCurrencyForCountry(profileData.country);
      setAutoDetectedCurrency(detected);
      console.log('🌍 [CurrencySettings] Auto-detected currency for', profileData.country, ':', detected);
    }
  }, [profileData]);
  
  const handleCurrencyChange = (currencyCode) => {
    const selected = allCurrencies.find(c => c.code === currencyCode);
    if (selected) {
      setPendingCurrency(selected);
      setShowConfirmDialog(true);
      console.log('🔄 [CurrencySettings] Currency change requested:', selected);
    }
  };
  
  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) return;
    
    setSaving(true);
    console.log('💱 [CurrencySettings] === CURRENCY CHANGE START ===');
    console.log('💱 [CurrencySettings] From:', currentCurrency);
    console.log('💱 [CurrencySettings] To:', pendingCurrency);
    
    try {
      // Call API to update currency
      const response = await fetch('/api/currency/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency_code: pendingCurrency.code,
          currency_name: pendingCurrency.name,
          currency_symbol: pendingCurrency.symbol
        }),
      });
      
      const data = await response.json();
      console.log('💱 [CurrencySettings] API Response:', data);
      
      if (response.ok && data.success) {
        // Update context
        updateCurrency({
          code: pendingCurrency.code,
          name: pendingCurrency.name,
          symbol: pendingCurrency.symbol
        });
        
        setSelectedCurrency(pendingCurrency.code);
        notifySuccess(`Currency changed to ${pendingCurrency.name} (${pendingCurrency.code})`);
        console.log('✅ [CurrencySettings] Currency changed successfully');
        
        // Refresh to get latest from backend
        setTimeout(() => refreshCurrency(), 1000);
      } else {
        throw new Error(data.error || 'Failed to update currency');
      }
    } catch (error) {
      console.error('❌ [CurrencySettings] Error updating currency:', error);
      notifyError('Failed to update currency. Please try again.');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
      setPendingCurrency(null);
      console.log('💱 [CurrencySettings] === CURRENCY CHANGE END ===');
    }
  };
  
  const isAutoDetected = autoDetectedCurrency?.code === currentCurrency?.code;
  
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Currency Settings</h2>
              <p className="text-sm text-gray-500">
                Manage your business currency for invoices, quotes, and reports
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Current Currency Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Current Currency</p>
              <p className="text-lg font-semibold text-blue-900 mt-1">
                {currentCurrency?.name} ({currentCurrency?.code}) - {currentCurrency?.symbol}
              </p>
              {isAutoDetected && (
                <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  Auto-detected based on your country ({profileData?.country})
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Currency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Currency
          </label>
          
          {/* Search Box */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Currency List */}
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredCurrencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => handleCurrencyChange(curr.code)}
                disabled={curr.code === currentCurrency?.code || saving}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0
                  transition-colors flex items-center justify-between
                  ${curr.code === currentCurrency?.code ? 'bg-blue-50' : ''}
                  ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold text-gray-600 w-10">
                    {curr.symbol}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {curr.code} - {curr.name}
                    </p>
                  </div>
                </div>
                {curr.code === currentCurrency?.code && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Current
                  </span>
                )}
                {curr.code === autoDetectedCurrency?.code && curr.code !== currentCurrency?.code && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <GlobeAltIcon className="h-5 w-5 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Important Notes:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Changing currency affects all future transactions</li>
                <li>Historical records maintain their original currency</li>
                <li>All payments are processed in USD regardless of display currency</li>
                <li>Exchange rates are for display purposes only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingCurrency && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Currency Change
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to change your currency from{' '}
                  <span className="font-medium">{currentCurrency?.name}</span> to{' '}
                  <span className="font-medium">{pendingCurrency.name}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will affect all future invoices, quotes, and financial displays.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingCurrency(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCurrencyChange}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySettings;