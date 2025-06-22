import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { format } from 'date-fns';

const AddExpenseForm = ({ onClose }) => {
  const [date, setDate] = useState(null);
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [amount, setAmount] = useState('');
  const [salesTaxPercentage, setSalesTaxPercentage] = useState('');
  const [calculatedSalesTax, setCalculatedSalesTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (amount && salesTaxPercentage) {
      const taxAmount = (parseFloat(amount) * parseFloat(salesTaxPercentage)) / 100;
      setCalculatedSalesTax(taxAmount.toFixed(2));
    } else {
      setCalculatedSalesTax(0);
    }
  }, [amount, salesTaxPercentage]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/profile');
      setUserDatabase(response.data.database_name);
      logger.info('User profile:', response.data);
      logger.info('User database:', response.data.database_name);
      toast.success('User profile loaded successfully');
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      toast.error(`Error fetching user profile: ${error.message}`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Format date directly from the date object
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

    const formData = new FormData();
    formData.append('date', formattedDate);
    formData.append('account', account);
    formData.append('type', type);
    formData.append('account_type', accountType);
    formData.append('amount', amount);
    formData.append('sales_tax_percentage', salesTaxPercentage);
    formData.append('sales_tax_amount', calculatedSalesTax);
    formData.append('notes', notes);
    if (receipt) {
      formData.append('receipt', receipt);
    }
    formData.append('database', userDatabase);

    logger.info('Form data:', formData);

    try {
      const response = await axiosInstance.post('http://localhost:8000/api/expenses/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        const data = response.data;
        logger.info('Expense record created:', data);
        toast.success('Expense record created successfully');
        onClose();
      }
    } catch (error) {
      logger.error('Error creating expense record:', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
        logger.error('Error response status:', error.response.status);
        logger.error('Error response headers:', error.response.headers);
        toast.error(
          `Error creating expense record: ${error.response.data.message || 'Unknown error'}`
        );
      } else if (error.request) {
        logger.error('Error request:', error.request);
        toast.error('Error creating expense record: No response received from server');
      } else {
        logger.error('Error message:', error.message);
        toast.error(`Error creating expense record: ${error.message}`);
      }
    }
  };

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
          <option value="Cash on Hand">Cash on Hand</option>
          <option value="Checking Account">Checking Account</option>
          <option value="Savings Account">Savings Account</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Accounts Payable">Accounts Payable</option>
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
          <option value="Withdrawal">Withdrawal</option>
          <option value="Deposit">Deposit</option>
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
          <option value="Expense">Expense</option>
          <option value="Accounts Payable">Accounts Payable</option>
          <option value="Utilities">Utilities</option>
          <option value="Rent">Rent</option>
          <option value="Supplies">Supplies</option>
          <option value="Payroll">Payroll</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          type="number"
          id="amount"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="salesTaxPercentage" className="block text-sm font-medium text-gray-700 mb-1">
          Sales Tax Percentage
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="number"
            id="salesTaxPercentage"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-12"
            value={salesTaxPercentage}
            onChange={(e) => setSalesTaxPercentage(e.target.value)}
            step="0.01"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-gray-500">%</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="calculatedSalesTax" className="block text-sm font-medium text-gray-700 mb-1">
          Calculated Sales Tax
        </label>
        <input
          type="text"
          id="calculatedSalesTax"
          className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
          value={calculatedSalesTax}
          readOnly
        />
      </div>

      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={4}
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
    </form>
  );
};

export default AddExpenseForm;
