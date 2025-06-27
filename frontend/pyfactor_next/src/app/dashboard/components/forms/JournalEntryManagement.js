import React, { useState, useEffect } from 'react';
import { journalEntriesApi, chartOfAccountsApi } from '@/services/api/finance';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      <div className="mb-6">
        <h4 className="text-2xl font-semibold mb-2 flex items-center">
          <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Journal Entry Management
        </h4>
        <p className="text-gray-600 text-sm">Record and manage double-entry bookkeeping transactions with automatic balancing and posting controls.</p>
      </div>
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
                  <FieldTooltip text="The effective date for this journal entry. This determines which accounting period the transaction affects." />
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
                  <FieldTooltip text="Enter a clear description of the transaction or adjustment. This helps with audit trails and understanding the purpose of the entry." />
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
                        <FieldTooltip text="Select the general ledger account affected by this line item. Each journal entry must balance with equal debits and credits." />
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
                        <FieldTooltip text="Optional line-item description to provide additional detail about this specific account entry." />
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
                        <FieldTooltip text="Enter the debit amount for this account. Debits increase asset and expense accounts, decrease liability, equity, and revenue accounts." />
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
                        <FieldTooltip text="Enter the credit amount for this account. Credits decrease asset and expense accounts, increase liability, equity, and revenue accounts." />
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