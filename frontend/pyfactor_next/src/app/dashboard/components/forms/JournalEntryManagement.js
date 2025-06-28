'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { accountingApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalculatorIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

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

/**
 * Journal Entry Management Component
 * Industry-standard double-entry bookkeeping with backend connectivity
 */
function JournalEntryManagement({ onNavigate }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(null);
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [journalEntries, setJournalEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    draftEntries: 0,
    postedEntries: 0,
    currentMonthEntries: 0,
    totalDebits: 0,
    totalCredits: 0
  });
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    status: 'draft',
    lines: [
      { accountId: '', accountName: '', description: '', debit: '', credit: '' },
      { accountId: '', accountName: '', description: '', debit: '', credit: '' }
    ]
  });
  
  // Validation state
  const [formErrors, setFormErrors] = useState({});

  // Initialize tenant ID
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    if (!tenantId) return;
    
    logger.debug('[JournalEntryManagement] Fetching journal entries for tenant:', tenantId);
    setLoading(true);

    try {
      const response = await accountingApi.journalEntries.getAll().catch(err => {
        logger.warn('[JournalEntryManagement] API error, using demo data:', err);
        return null;
      });

      // Demo data fallback
      const demoEntries = [
        {
          id: 1,
          date: '2025-01-05',
          reference: 'JE-2025-001',
          description: 'Office rent payment for January',
          status: 'posted',
          total: 5000,
          lines: [
            { account: '5100 - Rent Expense', debit: 5000, credit: 0 },
            { account: '1001 - Bank Account', debit: 0, credit: 5000 }
          ]
        },
        {
          id: 2,
          date: '2025-01-04',
          reference: 'JE-2025-002',
          description: 'Customer payment received',
          status: 'posted',
          total: 12000,
          lines: [
            { account: '1001 - Bank Account', debit: 12000, credit: 0 },
            { account: '1200 - Accounts Receivable', debit: 0, credit: 12000 }
          ]
        },
        {
          id: 3,
          date: '2025-01-03',
          reference: 'JE-2025-003',
          description: 'Equipment purchase',
          status: 'draft',
          total: 8500,
          lines: [
            { account: '1500 - Equipment', debit: 8500, credit: 0 },
            { account: '2100 - Accounts Payable', debit: 0, credit: 8500 }
          ]
        }
      ];

      const entries = response?.entries || demoEntries;
      setJournalEntries(entries);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const statsData = entries.reduce((acc, entry) => {
        acc.totalEntries++;
        if (entry.status === 'draft') acc.draftEntries++;
        if (entry.status === 'posted') acc.postedEntries++;
        
        const entryDate = new Date(entry.date);
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          acc.currentMonthEntries++;
        }
        
        // Sum up debits and credits
        entry.lines?.forEach(line => {
          acc.totalDebits += line.debit || 0;
          acc.totalCredits += line.credit || 0;
        });
        
        return acc;
      }, {
        totalEntries: 0,
        draftEntries: 0,
        postedEntries: 0,
        currentMonthEntries: 0,
        totalDebits: 0,
        totalCredits: 0
      });

      setStats(statsData);
      logger.info('[JournalEntryManagement] Journal entries loaded successfully');
    } catch (error) {
      logger.error('[JournalEntryManagement] Error fetching journal entries:', error);
      toast.error('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch chart of accounts
  const fetchAccounts = useCallback(async () => {
    if (!tenantId) return;

    try {
      const response = await accountingApi.chartOfAccounts.getAll().catch(err => {
        logger.warn('[JournalEntryManagement] Accounts API error, using demo data:', err);
        return null;
      });

      // Demo accounts fallback
      const demoAccounts = [
        { id: '1001', code: '1001', name: 'Bank Account', type: 'asset', normalBalance: 'debit' },
        { id: '1200', code: '1200', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit' },
        { id: '1500', code: '1500', name: 'Equipment', type: 'asset', normalBalance: 'debit' },
        { id: '2100', code: '2100', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
        { id: '3000', code: '3000', name: 'Owner\'s Equity', type: 'equity', normalBalance: 'credit' },
        { id: '4000', code: '4000', name: 'Sales Revenue', type: 'revenue', normalBalance: 'credit' },
        { id: '5100', code: '5100', name: 'Rent Expense', type: 'expense', normalBalance: 'debit' },
        { id: '5200', code: '5200', name: 'Utilities Expense', type: 'expense', normalBalance: 'debit' }
      ];

      setAccounts(response?.accounts || demoAccounts);
    } catch (error) {
      logger.error('[JournalEntryManagement] Error fetching accounts:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchJournalEntries();
      fetchAccounts();
    }
  }, [tenantId, fetchJournalEntries, fetchAccounts]);

  // Calculate if journal entry is balanced
  const isBalanced = useMemo(() => {
    const totalDebits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  }, [formData.lines]);

  // Calculate totals
  const totals = useMemo(() => {
    const debits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const credits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { debits, credits, difference: Math.abs(debits - credits) };
  }, [formData.lines]);

  // Filtered journal entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [journalEntries, searchTerm]);

  // Handle form field changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    setFormErrors(prev => ({
      ...prev,
      [field]: null
    }));
  };

  // Handle line item changes
  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-populate account name when account is selected
    if (field === 'accountId') {
      const account = accounts.find(acc => acc.id === value);
      if (account) {
        newLines[index].accountName = `${account.code} - ${account.name}`;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      lines: newLines
    }));
  };

  // Add new line
  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', accountName: '', description: '', debit: '', credit: '' }]
    }));
  };

  // Remove line
  const removeLine = (index) => {
    if (formData.lines.length > 2) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    } else {
      toast.error('Journal entry must have at least 2 lines');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.date) errors.date = 'Date is required';
    if (!formData.description) errors.description = 'Description is required';
    
    // Validate lines
    let hasValidLine = false;
    formData.lines.forEach((line, index) => {
      if (line.accountId || line.debit || line.credit) {
        hasValidLine = true;
        if (!line.accountId) {
          errors[`line_${index}_account`] = 'Account is required';
        }
        if (!line.debit && !line.credit) {
          errors[`line_${index}_amount`] = 'Either debit or credit is required';
        }
        if (line.debit && line.credit) {
          errors[`line_${index}_amount`] = 'Cannot have both debit and credit';
        }
      }
    });

    if (!hasValidLine) {
      errors.lines = 'At least one line item is required';
    }

    if (!isBalanced) {
      errors.balance = 'Journal entry must balance (debits = credits)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create
  const handleCreate = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      status: 'draft',
      lines: [
        { accountId: '', accountName: '', description: '', debit: '', credit: '' },
        { accountId: '', accountName: '', description: '', debit: '', credit: '' }
      ]
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  // Handle edit
  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      date: entry.date,
      reference: entry.reference,
      description: entry.description,
      status: entry.status,
      lines: entry.lines.map(line => ({
        accountId: line.accountId || '',
        accountName: line.account || '',
        description: line.description || '',
        debit: line.debit || '',
        credit: line.credit || ''
      }))
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Handle view
  const handleView = (entry) => {
    setSelectedEntry(entry);
    setIsViewModalOpen(true);
  };

  // Handle delete
  const handleDelete = (entry) => {
    if (entry.status === 'posted') {
      toast.error('Cannot delete posted journal entries');
      return;
    }
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  // Handle save (create/update)
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      const entryData = {
        ...formData,
        lines: formData.lines.filter(line => line.accountId) // Only include non-empty lines
      };

      if (selectedEntry) {
        await accountingApi.journalEntries.update(selectedEntry.id, entryData);
        toast.success('Journal entry updated successfully');
      } else {
        await accountingApi.journalEntries.create(entryData);
        toast.success('Journal entry created successfully');
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      fetchJournalEntries();
    } catch (error) {
      logger.error('[JournalEntryManagement] Error saving journal entry:', error);
      toast.error('Failed to save journal entry');
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    try {
      await accountingApi.journalEntries.delete(selectedEntry.id);
      toast.success('Journal entry deleted successfully');
      setIsDeleteModalOpen(false);
      fetchJournalEntries();
    } catch (error) {
      logger.error('[JournalEntryManagement] Error deleting journal entry:', error);
      toast.error('Failed to delete journal entry');
    }
  };

  // Handle post entry
  const handlePost = async (entry) => {
    if (!isBalanced) {
      toast.error('Cannot post unbalanced journal entry');
      return;
    }

    try {
      await accountingApi.journalEntries.update(entry.id, { ...entry, status: 'posted' });
      toast.success('Journal entry posted successfully');
      fetchJournalEntries();
    } catch (error) {
      logger.error('[JournalEntryManagement] Error posting journal entry:', error);
      toast.error('Failed to post journal entry');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (!tenantId || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Journal Entry Management</h1>
          <p className="text-gray-600 mt-1">Record and manage double-entry bookkeeping transactions with automatic balancing and posting controls</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Entries</h3>
            <DocumentTextIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalEntries}</div>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Draft Entries</h3>
            <ClockIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">{stats.draftEntries}</div>
          <p className="text-sm text-gray-500 mt-1">Pending posting</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Posted Entries</h3>
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.postedEntries}</div>
          <p className="text-sm text-gray-500 mt-1">Finalized</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">This Month</h3>
            <CalculatorIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600">{stats.currentMonthEntries}</div>
          <p className="text-sm text-gray-500 mt-1">Current period</p>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search journal entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Journal Entry
        </button>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.reference}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(entry.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.status === 'posted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status === 'posted' ? 'Posted' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleView(entry)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="View"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {entry.status !== 'posted' && (
                      <>
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handlePost(entry)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Post"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Transition appear show={isCreateModalOpen || isEditModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {selectedEntry ? 'Edit Journal Entry' : 'Create Journal Entry'}
                  </Dialog.Title>
                  
                  <div className="mt-6 space-y-4">
                    {/* Date and Reference */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                          <FieldTooltip text="The effective date for this journal entry. This determines which accounting period the transaction affects." />
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleFormChange('date', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.date ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.date && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.date}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reference
                          <FieldTooltip text="Optional reference number or code for this journal entry. Useful for tracking and auditing." />
                        </label>
                        <input
                          type="text"
                          value={formData.reference}
                          onChange={(e) => handleFormChange('reference', e.target.value)}
                          placeholder="JE-2025-001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                        <FieldTooltip text="Enter a clear description of the transaction or adjustment. This helps with audit trails and understanding the purpose of the entry." />
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        placeholder="Enter journal entry description"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                      )}
                    </div>

                    {/* Journal Entry Lines */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Journal Entry Lines</h4>
                      <div className="space-y-3">
                        {formData.lines.map((line, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Account
                                  <FieldTooltip text="Select the general ledger account affected by this line item." />
                                </label>
                                <select
                                  value={line.accountId}
                                  onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formErrors[`line_${index}_account`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select account</option>
                                  {accounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                      {account.code} - {account.name}
                                    </option>
                                  ))}
                                </select>
                                {formErrors[`line_${index}_account`] && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors[`line_${index}_account`]}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Debit
                                  <FieldTooltip text="Enter the debit amount. Debits increase assets and expenses, decrease liabilities, equity, and revenue." />
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={line.debit}
                                  onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                                  placeholder="0.00"
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formErrors[`line_${index}_amount`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Credit
                                  <FieldTooltip text="Enter the credit amount. Credits decrease assets and expenses, increase liabilities, equity, and revenue." />
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={line.credit}
                                  onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                                  placeholder="0.00"
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formErrors[`line_${index}_amount`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {formErrors[`line_${index}_amount`] && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors[`line_${index}_amount`]}</p>
                                )}
                              </div>
                              <div className="flex items-end">
                                {formData.lines.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLine(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                placeholder="Line description (optional)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={addLine}
                        className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <PlusIcon className="h-5 w-5 mr-1" />
                        Add Line
                      </button>
                    </div>

                    {/* Balance Status */}
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Total Debits: {formatCurrency(totals.debits)}</p>
                          <p className="text-sm text-gray-600">Total Credits: {formatCurrency(totals.credits)}</p>
                        </div>
                        <div className={`text-lg font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                          {isBalanced ? (
                            <span className="flex items-center">
                              <CheckCircleIcon className="h-5 w-5 mr-1" />
                              Balanced
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <ExclamationCircleIcon className="h-5 w-5 mr-1" />
                              Difference: {formatCurrency(totals.difference)}
                            </span>
                          )}
                        </div>
                      </div>
                      {formErrors.balance && (
                        <p className="mt-2 text-sm text-red-600">{formErrors.balance}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                      }}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!isBalanced}
                      className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
                        isBalanced
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {selectedEntry ? 'Update' : 'Create'} Journal Entry
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Modal */}
      <Transition appear show={isViewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Journal Entry Details
                  </Dialog.Title>
                  
                  {selectedEntry && (
                    <div className="mt-6">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="font-medium">{new Date(selectedEntry.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Reference</p>
                          <p className="font-medium">{selectedEntry.reference || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedEntry.status === 'posted' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedEntry.status === 'posted' ? 'Posted' : 'Draft'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="font-medium">{formatCurrency(selectedEntry.total)}</p>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <p className="text-sm text-gray-500">Description</p>
                        <p className="font-medium">{selectedEntry.description}</p>
                      </div>

                      <div>
                        <h4 className="text-md font-medium mb-3">Journal Lines</h4>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedEntry.lines.map((line, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm">{line.account}</td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsViewModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Journal Entry
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this journal entry? This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="inline-flex justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default JournalEntryManagement;