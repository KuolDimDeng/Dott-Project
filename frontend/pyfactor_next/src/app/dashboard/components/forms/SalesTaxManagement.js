'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';

const SalesTaxManagement = () => {
  const [loading, setLoading] = useState(true);
  const [salesTaxRates, setSalesTaxRates] = useState([]);
  const [taxTransactions, setTaxTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [showAddRateModal, setShowAddRateModal] = useState(false);
  const [newRate, setNewRate] = useState({
    state: '',
    rate: '',
    effective_date: '',
    description: ''
  });

  useEffect(() => {
    fetchSalesTaxData();
  }, [selectedPeriod]);

  const fetchSalesTaxData = async () => {
    try {
      setLoading(true);
      
      // Fetch sales tax rates
      const ratesResponse = await taxesApi.salesTax.getRates();
      if (ratesResponse.data) {
        setSalesTaxRates(ratesResponse.data);
      }
      
      // Fetch tax transactions
      const transactionsResponse = await taxesApi.salesTax.getTransactions({ period: selectedPeriod });
      if (transactionsResponse.data) {
        setTaxTransactions(transactionsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching sales tax data:', error);
      toast.error('Failed to load sales tax data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = async () => {
    try {
      await taxesApi.salesTax.createRate(newRate);
      toast.success('Sales tax rate added successfully');
      setShowAddRateModal(false);
      setNewRate({ state: '', rate: '', effective_date: '', description: '' });
      fetchSalesTaxData();
    } catch (error) {
      console.error('Error adding sales tax rate:', error);
      toast.error('Failed to add sales tax rate');
    }
  };

  const handleDeleteRate = async (id) => {
    if (window.confirm('Are you sure you want to delete this tax rate?')) {
      try {
        await taxesApi.salesTax.deleteRate(id);
        toast.success('Sales tax rate deleted successfully');
        fetchSalesTaxData();
      } catch (error) {
        console.error('Error deleting sales tax rate:', error);
        toast.error('Failed to delete sales tax rate');
      }
    }
  };

  const calculateTotalTax = () => {
    return taxTransactions.reduce((total, transaction) => total + (transaction.tax_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Tax Management</h1>
        <button
          onClick={() => setShowAddRateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Tax Rate
        </button>
      </div>

      {/* Tax Rates Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sales Tax Rates</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State/Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesTaxRates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{rate.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{rate.rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(rate.effective_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">{rate.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteRate(rate.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Transactions Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sales Tax Transactions</h2>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="current_year">Current Year</option>
          </select>
        </div>
        
        <div className="mb-4">
          <div className="text-lg font-semibold">
            Total Tax Collected: ${calculateTotalTax().toFixed(2)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxable Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.invoice_number}</td>
                  <td className="px-6 py-4">{transaction.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${transaction.taxable_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.tax_rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${transaction.tax_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rate Modal */}
      {showAddRateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add Sales Tax Rate</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">State/Region</label>
                <input
                  type="text"
                  value={newRate.state}
                  onChange={(e) => setNewRate({ ...newRate, state: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                <input
                  type="date"
                  value={newRate.effective_date}
                  onChange={(e) => setNewRate({ ...newRate, effective_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newRate.description}
                  onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowAddRateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTaxManagement;