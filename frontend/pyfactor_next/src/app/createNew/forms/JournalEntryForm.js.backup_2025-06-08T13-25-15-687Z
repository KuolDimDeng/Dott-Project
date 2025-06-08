// src/app/dashboard/components/forms/JournalEntryForm.js

// JournalEntryForm.js
import React, { useState, useEffect } from 'react';
import { useApi } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { format } from 'date-fns';

const JournalEntryForm = ({ onClose }) => {
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([
    { account: '', type: 'debit', amount: '' },
    { account: '', type: 'credit', amount: '' },
  ]);
  const [accounts, setAccounts] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const toast = useToast();

  useEffect(() => {
    console.log('JournalEntryForm mounted');
    fetchUserProfile();
    fetchAccounts();
  }, []);

  useEffect(() => {
    console.log('Accounts state updated:', accounts);
  }, [accounts]);

  const fetchUserProfile = async () => {
    try {
      const response = await useApi.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.info('User profile:', response.data);
      logger.info('User database:', response.data.database_name);
      toast.info('User profile loaded successfully');
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      toast.error(`Error fetching user profile: ${error.message}`);
    }
  };

  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await useApi.get('/api/accounts/');
      console.log('API Response:', response);
      console.log('Accounts data:', response.data);
      if (Array.isArray(response.data) && response.data.length > 0) {
        setAccounts(response.data);
      } else {
        console.error('Unexpected or empty accounts data:', response.data);
        toast.error('Unexpected or empty accounts data');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      console.error('Error status:', error.response ? error.response.status : 'No status');
      console.error('Error headers:', error.response ? error.response.headers : 'No headers');
      logger.error('Error fetching accounts:', error);
      toast.error(`Failed to fetch accounts: ${error.message}`);
    }
  };

  const handleAddEntry = () => {
    setEntries([...entries, { account: '', type: 'debit', amount: '' }]);
  };

  const handleRemoveEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement form submission logic here
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-4">
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          id="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          id="description"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      
      {entries.map((entry, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 items-center mb-4">
          <div className="col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={entry.account}
              onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={entry.type}
              onChange={(e) => handleEntryChange(index, 'type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={entry.amount}
              onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="col-span-2 flex items-end justify-center">
            <button 
              type="button" 
              onClick={() => handleRemoveEntry(index)}
              className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      
      <button 
        type="button" 
        onClick={handleAddEntry} 
        className="flex items-center mb-6 text-indigo-600 hover:text-indigo-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Entry
      </button>
      
      <div className="mt-6 flex justify-end space-x-3">
        <button 
          type="button" 
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Save Journal Entry
        </button>
      </div>
    </form>
  );
};

export default JournalEntryForm;
