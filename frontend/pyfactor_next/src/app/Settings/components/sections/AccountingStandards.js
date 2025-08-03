import React, { useState, useEffect } from 'react';
import { 
  BookOpenIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '@/context/NotificationContext';

// Countries that primarily use GAAP (very short list)
const GAAP_COUNTRIES = [
  'US', // United States
  'USA', // Alternative code for US
  'United States',
  'United States of America'
];

const AccountingStandards = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState('IFRS');
  const [businessCountry, setBusinessCountry] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStandard, setPendingStandard] = useState(null);
  const [hasManuallySelected, setHasManuallySelected] = useState(false);

  // Load current settings on mount
  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/backend/users/api/business/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Set the country
          const country = data.country || '';
          setBusinessCountry(country);
          
          // Check if user has manually selected a standard
          if (data.accounting_standard) {
            setSelectedStandard(data.accounting_standard);
            setHasManuallySelected(true);
          } else {
            // Auto-detect based on country
            const autoDetectedStandard = getDefaultStandardForCountry(country);
            setSelectedStandard(autoDetectedStandard);
          }
        }
      }
    } catch (error) {
      console.error('Error loading accounting standard:', error);
    }
  };

  // Determine default accounting standard based on country
  const getDefaultStandardForCountry = (country) => {
    if (!country) return 'IFRS';
    
    // Check if country uses GAAP
    const countryUpper = country.toUpperCase();
    const usesGAAP = GAAP_COUNTRIES.some(gaapCountry => 
      countryUpper === gaapCountry.toUpperCase() ||
      countryUpper.includes('UNITED STATES') ||
      countryUpper === 'USA' ||
      countryUpper === 'US'
    );
    
    return usesGAAP ? 'GAAP' : 'IFRS';
  };

  const handleStandardSelect = (standard) => {
    if (standard === selectedStandard) return;
    
    // Show confirmation modal
    setPendingStandard(standard);
    setShowConfirmModal(true);
  };

  const confirmStandardChange = async () => {
    if (!pendingStandard) return;

    setLoading(true);
    try {
      // Save to database
      const response = await fetch('/api/backend/users/api/business/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accounting_standard: pendingStandard,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setSelectedStandard(pendingStandard);
          setHasManuallySelected(true);
          
          // Close modal and show success
          setShowConfirmModal(false);
          notifySuccess(`Accounting standard changed to ${pendingStandard === 'IFRS' ? 'IFRS' : 'US GAAP'}`);
        } else {
          notifyError(data.error || 'Failed to update accounting standard');
        }
      } else {
        let errorMessage = 'Failed to update accounting standard';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            if (response.status === 404) {
              errorMessage = 'Settings API endpoint not found. Please try again in a moment.';
            }
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }
        notifyError(errorMessage);
      }
    } catch (error) {
      console.error('Error updating accounting standard:', error);
      notifyError('Failed to update accounting standard. Please try again.');
    } finally {
      setLoading(false);
      setPendingStandard(null);
    }
  };

  const ConfirmationModal = () => {
    if (!showConfirmModal || !pendingStandard) return null;

    const currentName = selectedStandard === 'IFRS' ? 'IFRS' : 'US GAAP';
    const newName = pendingStandard === 'IFRS' ? 'IFRS' : 'US GAAP';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3" />
            <h3 className="text-lg font-semibold">Confirm Accounting Standard Change</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            Change accounting standard from <strong>{currentName}</strong> to <strong>{newName}</strong>?
          </p>

          <div className="bg-yellow-50 p-3 rounded-lg mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This will affect how your financial reports are formatted. 
              Consult with your accountant before changing standards.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setPendingStandard(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={confirmStandardChange}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Get the auto-detected standard for display
  const autoDetectedStandard = getDefaultStandardForCountry(businessCountry);
  const isUsingAutoDetected = !hasManuallySelected && selectedStandard === autoDetectedStandard;

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <BookOpenIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold">Accounting Standards</h3>
      </div>

      {/* Current Standard Display */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900">Current Accounting Standard</h4>
            <p className="text-blue-800">
              {selectedStandard === 'IFRS' ? 'IFRS (International)' : 'US GAAP'}
            </p>
            {businessCountry && (
              <p className="text-xs text-blue-600 mt-1">
                {isUsingAutoDetected 
                  ? `Auto-selected based on your country: ${businessCountry}`
                  : `Manually selected (Country default: ${autoDetectedStandard === 'IFRS' ? 'IFRS' : 'US GAAP'})`
                }
              </p>
            )}
          </div>
          <div className="text-2xl">
            {selectedStandard === 'IFRS' ? '🌍' : '🇺🇸'}
          </div>
        </div>
      </div>

      {/* Standard Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Accounting Standard
        </label>
        
        <div className="space-y-3">
          {/* IFRS Option */}
          <div 
            onClick={() => handleStandardSelect('IFRS')}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedStandard === 'IFRS' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start">
              <input
                type="radio"
                checked={selectedStandard === 'IFRS'}
                onChange={() => {}}
                className="mt-1 mr-3"
                disabled={loading}
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  IFRS (International Financial Reporting Standards)
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Used by 160+ countries worldwide. Required for public companies in most countries outside the US. 
                  Provides a global framework for financial reporting with principle-based standards.
                </p>
              </div>
            </div>
          </div>

          {/* US GAAP Option */}
          <div 
            onClick={() => handleStandardSelect('GAAP')}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedStandard === 'GAAP' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start">
              <input
                type="radio"
                checked={selectedStandard === 'GAAP'}
                onChange={() => {}}
                className="mt-1 mr-3"
                disabled={loading}
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  US GAAP (Generally Accepted Accounting Principles)
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Required for US public companies and commonly used by US private companies. 
                  Provides detailed, rule-based guidance for financial reporting in the United States.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-gray-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-1">
              About Accounting Standards
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              Your accounting standard is automatically selected based on your business country, 
              but you can change it if needed. Most countries use IFRS, while the United States primarily uses US GAAP.
            </p>
            <p className="text-sm text-gray-700">
              This choice affects how financial statements are named and formatted. 
              Both standards ensure accurate financial reporting but have different approaches and requirements.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal />
    </div>
  );
};

export default AccountingStandards;