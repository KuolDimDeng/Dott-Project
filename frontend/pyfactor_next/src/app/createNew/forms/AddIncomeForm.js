// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/AddIncomeForm.js

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import UnpaidInvoicesList from '../../dashboard/components/lists/UnpaidInvoicesList'; // Adjust the import path as needed
import { format } from 'date-fns';

const AddIncomeForm = ({ onClose }) => {
  const [date, setDate] = useState(null);
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const [showUnpaidInvoices, setShowUnpaidInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [error, setError] = useState(null);

  const toast = useToast();

  const accountOptions = [
    'Cash on Hand',
    'Checking Account',
    'Savings Account',
    'Accounts Receivable',
    'Other Current Assets',
    'Fixed Assets',
    'Other Assets',
  ];

  const accountTypeOptions = ['Sales', 'Accounts Receivable', 'Owner Investment', 'Other Income'];

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (account === 'Cash on Hand' && type === 'Deposit' && accountType === 'Accounts Receivable') {
      fetchUnpaidInvoices();
    } else {
      setShowUnpaidInvoices(false);
      setSelectedInvoice(null);
    }
  }, [account, type, accountType]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
      toast.success('User profile loaded successfully');
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      toast.error(`Error fetching user profile: ${error.message}`);
      setError('Failed to load user profile');
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const response = await axiosInstance.get('/api/unpaid-invoices/');
      if (Array.isArray(response.data)) {
        setUnpaidInvoices(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setUnpaidInvoices([]);
      }
      setShowUnpaidInvoices(true);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      toast.error(`Error fetching unpaid invoices: ${error.message}`);
      setError('Failed to load unpaid invoices');
      setUnpaidInvoices([]);
    }
  };

  const handleAccountChange = (e) => {
    setAccount(e.target.value);
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  const handleAccountTypeChange = (e) => {
    setAccountType(e.target.value);
  };

  const handleReceiptChange = (e) => {
    setReceipt(e.target.files[0]);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setAmount(invoice.amount);
    setShowUnpaidInvoices(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date || !account || !type || !accountType || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    // Format date directly from the date object
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

    const formData = new FormData();
    formData.append('date', formattedDate);
    formData.append('account', account);
    formData.append('type', type);
    formData.append('account_type', accountType);
    formData.append('amount', amount);
    formData.append('notes', notes);
    if (receipt) {
      formData.append('receipt', receipt);
    }
    formData.append('database', userDatabase);
    if (selectedInvoice) {
      formData.append('invoice_id', selectedInvoice.id);
    }

    try {
      const response = await axiosInstance.post('http://localhost:8000/api/incomes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        const data = response.data;
        logger.log('Income record created:', data);
        toast.success('Income record created successfully');
        onClose();
      }
    } catch (error) {
      logger.error('Error creating income record:', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
        logger.error('Error response status:', error.response.status);
        logger.error('Error response headers:', error.response.headers);
        toast.error(
          `Error creating income record: ${error.response.data.message || 'Unknown error'}`
        );
      } else if (error.request) {
        logger.error('Error request:', error.request);
        toast.error('Error creating income record: No response received from server');
      } else {
        logger.error('Error message:', error.message);
        toast.error(`Error creating income record: ${error.message}`);
      }
      setError('Failed to create income record');
    }
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          id="date"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={date ? format(date, 'yyyy-MM-dd') : ''}
          onChange={(e) => setDate(new Date(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
          Account
        </label>
        <select
          id="account"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={account}
          onChange={handleAccountChange}
        >
          <option value="">Select an account</option>
          {accountOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          id="type"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={type}
          onChange={handleTypeChange}
        >
          <option value="">Select a type</option>
          <option value="Deposit">Deposit</option>
          <option value="Withdrawal">Withdrawal</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
          Account Type
        </label>
        <select
          id="accountType"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={accountType}
          onChange={handleAccountTypeChange}
        >
          <option value="">Select an account type</option>
          {accountTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">$</span>
          </div>
          <input
            type="number"
            id="amount"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-7"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </div>
      </div>

      {selectedInvoice && (
        <p className="text-sm text-gray-600 mt-1">
          Selected Invoice: #{selectedInvoice.id} - ${selectedInvoice.amount}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <input
          accept="image/*,application/pdf"
          className="hidden"
          id="receipt-upload"
          type="file"
          onChange={handleReceiptChange}
        />
        <label htmlFor="receipt-upload">
          <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            Upload Receipt
          </span>
        </label>
        {receipt && <span className="ml-2 text-sm text-gray-600">{receipt.name}</span>}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save
        </button>
      </div>

      {showUnpaidInvoices && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-medium mb-4">Select Unpaid Invoice</h2>
            <UnpaidInvoicesList onSelect={handleInvoiceSelect} />
            <button
              type="button"
              className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowUnpaidInvoices(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default AddIncomeForm;
