import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  CheckIcon,
  InformationCircleIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '@/context/NotificationContext';

const AccountingStandards = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [standardInfo, setStandardInfo] = useState({
    accounting_standard: 'IFRS',
    accounting_standard_display: 'IFRS (International)',
    country: '',
    allows_dual_standard: false,
    inventory_valuation_method: 'WEIGHTED_AVERAGE',
    financial_statement_names: {
      balance_sheet: 'Statement of Financial Position',
      income_statement: 'Statement of Comprehensive Income',
      equity_statement: 'Statement of Changes in Equity'
    }
  });

  useEffect(() => {
    fetchAccountingStandards();
  }, []);

  const fetchAccountingStandards = async () => {
    console.log('📊 [AccountingStandards] Fetching current standards...');
    try {
      const response = await fetch('/api/backend/api/business/settings/');
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 [AccountingStandards] Current settings:', data);
        setStandardInfo(data);
      }
    } catch (error) {
      console.error('📊 [AccountingStandards] Error fetching standards:', error);
    }
  };

  const handleStandardChange = async (standard) => {
    console.log('📊 [AccountingStandards] === CHANGE START ===');
    console.log('📊 [AccountingStandards] New standard:', standard);
    
    setLoading(true);
    try {
      const response = await fetch('/api/backend/api/business/settings/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accounting_standard: standard,
        }),
      });

      const data = await response.json();
      console.log('📊 [AccountingStandards] Response:', data);
      
      if (data.success) {
        setStandardInfo(data);
        notifySuccess(`Accounting standard updated to ${data.accounting_standard_display}`);
      } else {
        notifyError(data.error || 'Failed to update accounting standard');
      }
    } catch (error) {
      console.error('📊 [AccountingStandards] Error:', error);
      notifyError('Failed to update accounting standard');
    }
    setLoading(false);
  };

  const handleInventoryMethodChange = async (method) => {
    console.log('📦 [InventoryMethod] Changing to:', method);
    
    setLoading(true);
    try {
      const response = await fetch('/api/backend/api/business/settings/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory_valuation_method: method,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStandardInfo(data);
        notifySuccess(`Inventory valuation method updated to ${method}`);
      } else {
        notifyError(data.error || 'Failed to update inventory method');
      }
    } catch (error) {
      console.error('📦 [InventoryMethod] Error:', error);
      notifyError('Failed to update inventory method');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <BookOpenIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Accounting Standards</h2>
            <p className="text-gray-600">Configure your financial reporting standards</p>
          </div>
        </div>
      </div>

      {/* Current Standard Display */}
      <div className="mb-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900 font-medium mb-1">
              Your Current Accounting Standard
            </p>
            <p className="text-lg font-semibold text-blue-900">
              {standardInfo.accounting_standard_display || 'IFRS (International)'}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Based on your business country: {standardInfo.country || 'International'}
            </p>
          </div>
        </div>
      </div>

      {/* Accounting Standard Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Select Accounting Standard</h3>
        <div className="space-y-4">
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="accounting_standard"
              value="IFRS"
              checked={standardInfo.accounting_standard === 'IFRS'}
              onChange={() => handleStandardChange('IFRS')}
              disabled={loading}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">IFRS (International Financial Reporting Standards)</div>
              <div className="text-sm text-gray-600 mt-1">
                Used by 166+ countries worldwide. Required for public companies in most countries outside the US.
              </div>
              <div className="text-sm text-gray-500 mt-2">
                • Statement of Financial Position (Balance Sheet)<br />
                • Statement of Comprehensive Income<br />
                • Allows asset revaluation<br />
                • No LIFO inventory method
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="accounting_standard"
              value="GAAP"
              checked={standardInfo.accounting_standard === 'GAAP'}
              onChange={() => handleStandardChange('GAAP')}
              disabled={loading}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">US GAAP (Generally Accepted Accounting Principles)</div>
              <div className="text-sm text-gray-600 mt-1">
                Required for US public companies. Commonly used by US private companies.
              </div>
              <div className="text-sm text-gray-500 mt-2">
                • Balance Sheet<br />
                • Income Statement<br />
                • No asset revaluation allowed<br />
                • LIFO inventory method available
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Inventory Valuation Method */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Inventory Valuation Method</h3>
        <div className="space-y-3">
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="inventory_method"
              value="FIFO"
              checked={standardInfo.inventory_valuation_method === 'FIFO'}
              onChange={() => handleInventoryMethodChange('FIFO')}
              disabled={loading}
              className="mr-3"
            />
            <div>
              <div className="font-medium">FIFO (First In, First Out)</div>
              <div className="text-sm text-gray-600">Oldest inventory items are sold first</div>
            </div>
          </label>

          {standardInfo.accounting_standard === 'GAAP' && (
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="inventory_method"
                value="LIFO"
                checked={standardInfo.inventory_valuation_method === 'LIFO'}
                onChange={() => handleInventoryMethodChange('LIFO')}
                disabled={loading}
                className="mr-3"
              />
              <div>
                <div className="font-medium">LIFO (Last In, First Out)</div>
                <div className="text-sm text-gray-600">Newest inventory items are sold first (US GAAP only)</div>
              </div>
            </label>
          )}

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="inventory_method"
              value="WEIGHTED_AVERAGE"
              checked={standardInfo.inventory_valuation_method === 'WEIGHTED_AVERAGE'}
              onChange={() => handleInventoryMethodChange('WEIGHTED_AVERAGE')}
              disabled={loading}
              className="mr-3"
            />
            <div>
              <div className="font-medium">Weighted Average</div>
              <div className="text-sm text-gray-600">Average cost of all inventory items</div>
            </div>
          </label>
        </div>
      </div>

      {/* Financial Statement Names */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Financial Statement Names</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Balance Sheet:</span>
              <span className="font-medium">{standardInfo.financial_statement_names?.balance_sheet || 'Statement of Financial Position'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Income Statement:</span>
              <span className="font-medium">{standardInfo.financial_statement_names?.income_statement || 'Statement of Comprehensive Income'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Equity Statement:</span>
              <span className="font-medium">{standardInfo.financial_statement_names?.equity_statement || 'Statement of Changes in Equity'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Flow Statement:</span>
              <span className="font-medium">Statement of Cash Flows</span>
            </div>
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Changing accounting standards affects how your financial reports are formatted</li>
              <li>LIFO inventory method is only available under US GAAP</li>
              <li>Consult with your accountant before changing standards</li>
              <li>All existing transactions remain unchanged</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingStandards;