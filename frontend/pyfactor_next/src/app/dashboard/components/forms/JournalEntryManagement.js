import React, { useState, useEffect } from 'react';
import { journalEntriesApi, chartOfAccountsApi } from '@/services/api/finance';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

const JournalEntryManagement = () => {
  const [journalEntries, setJournalEntries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      logger.debug('[JournalEntryManagement] Fetching journal entries for tenant:', getSecureTenantId());
      const response = await journalEntriesApi.getAll();
      setJournalEntries(response.data);
      logger.info('[JournalEntryManagement] Journal entries loaded successfully');
    } catch (error) {
      logger.error('[JournalEntryManagement] Error fetching journal entries:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      logger.debug('[JournalEntryManagement] Fetching chart of accounts for tenant:', getSecureTenantId());
      const response = await chartOfAccountsApi.getAll();
      setAccounts(response.data);
      logger.info('[JournalEntryManagement] Accounts loaded successfully');
    } catch (error) {
      logger.error('[JournalEntryManagement] Error fetching accounts:', error);
    }
  };

  const handleCreateEntry = () => {
    setCurrentEntry({
      date: new Date().toISOString().split('T')[0],
      description: '',
      lines: [{ account: '', description: '', debit_amount: 0, credit_amount: 0 }],
    });
    setOpenDialog(true);
  };

  const handleEditEntry = (entry) => {
    setCurrentEntry(entry);
    setOpenDialog(true);
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await axiosInstance.delete(`/api/journal-entries/${id}/`);
        fetchJournalEntries();
      } catch (error) {
        console.error('Error deleting journal entry:', error);
      }
    }
  };

  const handleSaveEntry = async () => {
    try {
      if (currentEntry.id) {
        await axiosInstance.put(`/api/journal-entries/${currentEntry.id}/`, currentEntry);
      } else {
        await axiosInstance.post('/api/journal-entries/', currentEntry);
      }
      setOpenDialog(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }
  };

  const handleInputChange = (event, index) => {
    const { name, value } = event.target;
    if (name === 'date' || name === 'description') {
      setCurrentEntry({ ...currentEntry, [name]: value });
    } else {
      const newLines = [...currentEntry.lines];
      newLines[index] = { ...newLines[index], [name]: value };
      setCurrentEntry({ ...currentEntry, lines: newLines });
    }
  };

  const addLine = () => {
    setCurrentEntry({
      ...currentEntry,
      lines: [
        ...currentEntry.lines,
        { account: '', description: '', debit_amount: 0, credit_amount: 0 },
      ],
    });
  };

  const removeLine = (index) => {
    const newLines = currentEntry.lines.filter((_, i) => i !== index);
    setCurrentEntry({ ...currentEntry, lines: newLines });
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h4 className="text-2xl font-semibold mb-4">
        Journal Entry Management
      </h4>
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
        onClick={handleCreateEntry}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Journal Entry
      </button>
      
      <div className="mt-4 overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {journalEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{entry.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{entry.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    entry.is_posted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.is_posted ? 'Posted' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEditEntry(entry)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {currentEntry?.id ? 'Edit Journal Entry' : 'Create Journal Entry'}
              </h3>
              <button 
                onClick={() => setOpenDialog(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  value={currentEntry?.date || ''}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  name="description"
                  value={currentEntry?.description || ''}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <h6 className="text-lg font-medium mt-4 mb-2">
                  Journal Entry Lines
                </h6>
                {currentEntry?.lines.map((line, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="w-full md:w-1/4">
                      <label htmlFor={`account-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Account
                      </label>
                      <select
                        id={`account-${index}`}
                        name="account"
                        value={line.account}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-full md:w-1/4">
                      <label htmlFor={`line-desc-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        id={`line-desc-${index}`}
                        type="text"
                        name="description"
                        value={line.description}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="w-full md:w-1/6">
                      <label htmlFor={`debit-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Debit
                      </label>
                      <input
                        id={`debit-${index}`}
                        type="number"
                        name="debit_amount"
                        value={line.debit_amount}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="w-full md:w-1/6">
                      <label htmlFor={`credit-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Credit
                      </label>
                      <input
                        id={`credit-${index}`}
                        type="number"
                        name="credit_amount"
                        value={line.credit_amount}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-end justify-end md:w-1/12">
                      <button 
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-900 p-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  type="button" 
                  onClick={addLine}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Line
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button 
                onClick={() => setOpenDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              <button 
                onClick={handleSaveEntry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryManagement;