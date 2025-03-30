import React, { useState, useEffect } from 'react';
import AddIncomeForm from './AddIncomeForm';
import AddExpenseForm from './AddExpenseForm';
import SalesForm from './SalesForm';
import RefundForm from './RefundForm';
import { axiosInstance as useApi } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useNotification } from '@/context/NotificationContext';
import { format } from 'date-fns';
import ModernFormLayout from '@/app/components/ModernFormLayout';

// SVG icon components
const AccountBalanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const RemoveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const PointOfSaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const AssignmentReturnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PaymentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const SavingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowUpwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowDownwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const TransactionForm = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openModal, setOpenModal] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } = useNotification();
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    logger.info('[TransactionForm] Component mounted');
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchAccounts(userDatabase);
      fetchTransactions(userDatabase);
    }
  }, [userDatabase]);

  const handleTabChange = (newValue) => {
    logger.debug('[TransactionForm] Tab changed to:', newValue);
    setActiveTab(newValue);
  };

  const fetchUserProfile = async () => {
    try {
      logger.info('[TransactionForm] Fetching user profile');
      const response = await useApi.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.info('[TransactionForm] User profile fetched:', response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching user profile:', error);
      notifyError('Failed to fetch user profile');
    }
  };

  const fetchAccounts = async (database_name) => {
    try {
      logger.info('[TransactionForm] Fetching accounts from database:', database_name);
      const response = await useApi.get('/api/accounts/', {
        params: { database: database_name },
      });
      logger.info('[TransactionForm] Accounts fetched successfully:', response.data.length);
      setAccounts(response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching accounts:', error);
      notifyError('Failed to fetch accounts');
    }
  };

  const fetchTransactions = async (database_name) => {
    setLoading(true);
    try {
      logger.info('[TransactionForm] Fetching transactions from database:', database_name);
      const response = await useApi.get('/api/transactions/', {
        params: { database: database_name },
      });
      logger.info('[TransactionForm] Transactions fetched successfully:', response.data.length);
      setTransactions(response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching transactions:', error);
      notifyError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modalName) => {
    logger.debug('[TransactionForm] Opening modal:', modalName);
    setOpenModal(modalName);
  };
  
  const handleCloseModal = () => {
    logger.debug('[TransactionForm] Closing modal');
    setOpenModal(null);
    // Refresh transactions after modal closes
    if (userDatabase) {
      fetchTransactions(userDatabase);
    }
  };

  const handleRefresh = () => {
    logger.info('[TransactionForm] Manually refreshing transactions');
    if (userDatabase) {
      fetchTransactions(userDatabase);
    }
  };

  const handleFilterChange = (type) => {
    logger.debug('[TransactionForm] Filter changed to:', type);
    setFilterType(type);
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply type filter
    let matchesType = true;
    if (filterType !== 'all') {
      matchesType = transaction.type === filterType;
    }
    
    return matchesSearch && matchesType;
  });

  const renderModal = () => {
    switch (openModal) {
      case 'sales':
        return (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-auto ${isMobile ? 'w-[90%]' : ''}`}>
              <h2 className="text-xl font-semibold mb-4">Create Sale</h2>
              <SalesForm onClose={handleCloseModal} accounts={accounts} userDatabase={userDatabase} />
            </div>
          </div>
        );
      case 'refund':
        return (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-auto ${isMobile ? 'w-[90%]' : ''}`}>
              <h2 className="text-xl font-semibold mb-4">Create Refund</h2>
              <RefundForm onClose={handleCloseModal} accounts={accounts} userDatabase={userDatabase} />
            </div>
          </div>
        );
      case 'income':
        return (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-auto ${isMobile ? 'w-[90%]' : ''}`}>
              <h2 className="text-xl font-semibold mb-4">Add Income</h2>
              <AddIncomeForm onClose={handleCloseModal} accounts={accounts} userDatabase={userDatabase} />
            </div>
          </div>
        );
      case 'expense':
        return (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-auto ${isMobile ? 'w-[90%]' : ''}`}>
              <h2 className="text-xl font-semibold mb-4">Add Expense</h2>
              <AddExpenseForm onClose={handleCloseModal} accounts={accounts} userDatabase={userDatabase} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render the Quick Actions tab
  const renderQuickActionsTab = () => (
    <div>
      {/* Quick Actions Content */}
      <h2 className="text-lg font-medium mb-6">Quick Transaction Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {/* Sale Card */}
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all transform hover:-translate-y-1">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <PointOfSaleIcon />
            </div>
            <h3 className="text-lg font-medium mb-2">Create Sale</h3>
            <p className="text-gray-500 mb-4">Record a new sale transaction</p>
            <button
              onClick={() => handleOpenModal('sales')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Sale
            </button>
          </div>
        </div>

        {/* Refund Card */}
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all transform hover:-translate-y-1">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <AssignmentReturnIcon />
            </div>
            <h3 className="text-lg font-medium mb-2">Process Refund</h3>
            <p className="text-gray-500 mb-4">Handle customer returns</p>
            <button
              onClick={() => handleOpenModal('refund')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Process Refund
            </button>
          </div>
        </div>

        {/* Income Card */}
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all transform hover:-translate-y-1">
          <div className="flex flex-col items-center text-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <ArrowUpwardIcon />
            </div>
            <h3 className="text-lg font-medium mb-2">Add Income</h3>
            <p className="text-gray-500 mb-4">Record other income sources</p>
            <button
              onClick={() => handleOpenModal('income')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add Income
            </button>
          </div>
        </div>

        {/* Expense Card */}
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all transform hover:-translate-y-1">
          <div className="flex flex-col items-center text-center">
            <div className="bg-orange-100 p-3 rounded-full mb-4">
              <ArrowDownwardIcon />
            </div>
            <h3 className="text-lg font-medium mb-2">Add Expense</h3>
            <p className="text-gray-500 mb-4">Record business expenses</p>
            <button
              onClick={() => handleOpenModal('expense')}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render the Recent Transactions tab
  const renderTransactionsTab = () => (
    <div>
      {/* Transactions Tab Content */}
      {/* This would include filtering, searching, and table of transactions */}
    </div>
  );

  // Render the Account Summary Tab
  const renderAccountSummaryTab = () => (
    <div>
      {/* Account Summary Tab Content */}
      {/* This would include charts and account balances */}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Quick Actions
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 1
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Transactions
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 2
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            Account Summary
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 0 && renderQuickActionsTab()}
        {activeTab === 1 && renderTransactionsTab()}
        {activeTab === 2 && renderAccountSummaryTab()}
      </div>

      {/* Modal Rendering */}
      {renderModal()}
    </div>
  );
};

export default TransactionForm;
