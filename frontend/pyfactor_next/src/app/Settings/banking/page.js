'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  BuildingLibraryIcon, 
  CreditCardIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { useSession } from '@/hooks/useSession-v2';

// Country codes where Plaid is available
const PLAID_COUNTRIES = [
  'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 'IT', 'PL', 'DK', 'NO', 'SE', 'EE', 'LT', 'LV', 'PT', 'BE'
];

// Common currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' }
];

const BankingSettings = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [bankingMethod, setBankingMethod] = useState(null);
  const [wiseAccount, setWiseAccount] = useState(null);
  const [showWiseForm, setShowWiseForm] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [formData, setFormData] = useState({
    bank_name: '',
    bank_country: '',
    account_holder_name: '',
    currency: 'USD',
    account_number: '',
    routing_number: '',
    sort_code: '',
    iban: '',
    ifsc_code: '',
    swift_code: '',
    bank_code: '',
    branch_code: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBankingMethod();
    fetchWiseAccount();
    fetchSettlements();
  }, []);

  const fetchBankingMethod = async () => {
    try {
      const response = await fetch('/api/banking/method/', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setBankingMethod(data.data);
      }
    } catch (error) {
      console.error('Error fetching banking method:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWiseAccount = async () => {
    try {
      const response = await fetch('/api/banking/wise/account/', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setWiseAccount(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching Wise account:', error);
    }
  };

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/banking/settlements/', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettlements(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitWiseAccount = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/banking/wise/setup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Bank account set up successfully!');
        setWiseAccount(data.data);
        setShowWiseForm(false);
        fetchWiseAccount();
      } else {
        toast.error(data.error || 'Failed to set up bank account');
      }
    } catch (error) {
      console.error('Error setting up Wise account:', error);
      toast.error('Failed to set up bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBankFields = () => {
    const country = formData.bank_country.toUpperCase();

    if (country === 'US') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Routing Number
            </label>
            <input
              type="text"
              name="routing_number"
              value={formData.routing_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </>
      );
    } else if (country === 'GB') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Code
            </label>
            <input
              type="text"
              name="sort_code"
              value={formData.sort_code}
              onChange={handleInputChange}
              placeholder="12-34-56"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </>
      );
    } else if (country === 'IN') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              name="ifsc_code"
              value={formData.ifsc_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </>
      );
    } else {
      // European and other countries - prefer IBAN
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IBAN (if available)
            </label>
            <input
              type="text"
              name="iban"
              value={formData.iban}
              onChange={handleInputChange}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number (if no IBAN)
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SWIFT/BIC Code
            </label>
            <input
              type="text"
              name="swift_code"
              value={formData.swift_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <CenteredSpinner />
      </div>
    );
  }

  const usePlaid = bankingMethod?.plaid_available;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <BuildingLibraryIcon className="h-6 w-6 text-blue-600 mr-2" />
          Banking Settings
        </h1>
        <p className="text-gray-600">
          Connect your bank account to receive payments from your customers
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <LockClosedIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Bank-Level Security</h3>
            <p className="text-sm text-blue-700 mt-1">
              Your sensitive bank details are securely stored with Stripe, our PCI-compliant payment processor. 
              We only store the last 4 digits of your account for display purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Banking Method Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Banking Connection
            </h2>
            <p className="text-sm text-gray-600">
              {usePlaid 
                ? 'Connect your bank account securely with Plaid'
                : 'Set up international banking with Wise for global transfers'}
            </p>
          </div>
          
          {wiseAccount?.is_verified ? (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>

        {/* Show existing Wise account or setup form */}
        {wiseAccount && !showWiseForm ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="text-sm font-medium">{wiseAccount.bank_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Holder</p>
                <p className="text-sm font-medium">{wiseAccount.account_holder_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Country</p>
                <p className="text-sm font-medium">{wiseAccount.bank_country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account</p>
                <p className="text-sm font-medium">****{wiseAccount.account_number_last4 || wiseAccount.iban_last4 || '****'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowWiseForm(true)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Update Bank Details
            </button>
          </div>
        ) : (
          <>
            {!usePlaid && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <GlobeAltIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      International banking is available through Wise. Transfer fees will apply when receiving payments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(showWiseForm || !wiseAccount) && (
              <form onSubmit={handleSubmitWiseAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Country
                    </label>
                    <input
                      type="text"
                      name="bank_country"
                      value={formData.bank_country}
                      onChange={handleInputChange}
                      placeholder="e.g., US, GB, IN, NG"
                      maxLength="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="account_holder_name"
                      value={formData.account_holder_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} - {curr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.bank_country && renderBankFields()}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <CenteredSpinner />
                        <span className="ml-2">Setting up...</span>
                      </>
                    ) : (
                      'Set Up Bank Account'
                    )}
                  </button>
                  
                  {showWiseForm && wiseAccount && (
                    <button
                      type="button"
                      onClick={() => setShowWiseForm(false)}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Recent Settlements */}
      {settlements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Settlements
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    You Receive
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(settlement.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${settlement.original_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(parseFloat(settlement.platform_fee) + parseFloat(settlement.wise_fee)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${settlement.user_receives}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        settlement.status === 'completed' ? 'bg-green-100 text-green-800' :
                        settlement.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        settlement.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {settlement.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingSettings;