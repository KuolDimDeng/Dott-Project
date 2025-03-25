/**
 * Example of an optimized dashboard component using consolidated state
 * This approach significantly reduces memory usage compared to using
 * many individual useState calls
 */

import React, { useEffect } from 'react';
import { useConsolidatedState, useMemoryCleanup } from '../utils/optimizedState';

const OptimizedDashboard = () => {
  // Use a single state object instead of 80+ individual state variables
  const [dashboardState, updateDashboardState] = useConsolidatedState({
    // User data
    user: null,
    profile: null,
    
    // UI state
    isLoading: true,
    activeTab: 'overview',
    sidebarOpen: true,
    
    // Data
    transactions: [],
    accounts: [],
    notifications: [],
    
    // Filters and pagination
    filters: {
      dateRange: 'month',
      category: 'all',
      status: 'all',
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
    },
    
    // Modal states
    modals: {
      createTransaction: false,
      editProfile: false,
      settings: false,
    },
  });
  
  // Clean up memory when component unmounts
  useMemoryCleanup('OptimizedDashboard');
  
  // Example of updating multiple state values at once
  const loadDashboardData = async () => {
    try {
      // Fetch data (simulated)
      const userData = { id: 1, name: 'User' };
      const transactions = Array(20).fill().map((_, i) => ({ id: i, amount: Math.random() * 1000 }));
      
      // Update multiple state values in a single update
      updateDashboardState({
        user: userData,
        transactions,
        isLoading: false,
        pagination: {
          ...dashboardState.pagination,
          total: transactions.length,
        },
      });
    } catch (error) {
      updateDashboardState({
        isLoading: false,
        error: error.message,
      });
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Example of updating a nested state value
  const changeTab = (tab) => {
    updateDashboardState({
      activeTab: tab,
    });
  };
  
  // Example of updating a deeply nested state value
  const updateFilter = (key, value) => {
    updateDashboardState({
      filters: {
        ...dashboardState.filters,
        [key]: value,
      },
    });
  };
  
  // Example of toggling a modal
  const toggleModal = (modalName) => {
    updateDashboardState({
      modals: {
        ...dashboardState.modals,
        [modalName]: !dashboardState.modals[modalName],
      },
    });
  };
  
  return (
    <div>
      <h1>Optimized Dashboard</h1>
      {dashboardState.isLoading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>Welcome, {dashboardState.user?.name}</p>
          
          <div>
            <button onClick={() => changeTab('overview')}>Overview</button>
            <button onClick={() => changeTab('transactions')}>Transactions</button>
            <button onClick={() => changeTab('settings')}>Settings</button>
          </div>
          
          <div>
            <h2>{dashboardState.activeTab}</h2>
            
            {dashboardState.activeTab === 'transactions' && (
              <div>
                <div>
                  <select 
                    value={dashboardState.filters.dateRange}
                    onChange={(e) => updateFilter('dateRange', e.target.value)}
                  >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardState.transactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{transaction.id}</td>
                        <td>${transaction.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {dashboardState.activeTab === 'settings' && (
              <div>
                <button onClick={() => toggleModal('editProfile')}>Edit Profile</button>
                <button onClick={() => toggleModal('settings')}>Account Settings</button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modals */}
      {dashboardState.modals.editProfile && (
        <div className="modal">
          <h2>Edit Profile</h2>
          <button onClick={() => toggleModal('editProfile')}>Close</button>
        </div>
      )}
      
      {dashboardState.modals.settings && (
        <div className="modal">
          <h2>Account Settings</h2>
          <button onClick={() => toggleModal('settings')}>Close</button>
        </div>
      )}
    </div>
  );
};

export default OptimizedDashboard;
