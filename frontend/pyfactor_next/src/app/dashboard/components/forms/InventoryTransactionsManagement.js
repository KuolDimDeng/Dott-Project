'use client';


import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const InventoryTransactionsManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for list, 1 for create new
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    location: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sample data for demonstration
  const sampleTransactions = [
    { 
      id: 'TR-001', 
      date: '2025-05-18', 
      type: 'Inbound', 
      source: 'Purchase Order #PO-2583', 
      destination: 'Main Warehouse',
      items: 12,
      value: '$3,450.00', 
      status: 'Completed',
      createdBy: 'John Smith'
    },
    { 
      id: 'TR-002', 
      date: '2025-05-17', 
      type: 'Outbound', 
      source: 'Main Warehouse', 
      destination: 'Sales Order #SO-4921',
      items: 5,
      value: '$875.50', 
      status: 'Completed',
      createdBy: 'Sarah Johnson' 
    },
    { 
      id: 'TR-003', 
      date: '2025-05-15', 
      type: 'Transfer', 
      source: 'Main Warehouse', 
      destination: 'East Coast Distribution',
      items: 8,
      value: '$1,200.00', 
      status: 'In Transit',
      createdBy: 'David Williams'
    },
    { 
      id: 'TR-004', 
      date: '2025-05-14', 
      type: 'Adjustment', 
      source: 'Inventory Count', 
      destination: 'Main Warehouse',
      items: 3,
      value: '$320.00', 
      status: 'Completed',
      createdBy: 'Michael Chen'
    },
    { 
      id: 'TR-005', 
      date: '2025-05-10', 
      type: 'Return', 
      source: 'Customer Return #CR-194', 
      destination: 'Main Warehouse',
      items: 1,
      value: '$149.99', 
      status: 'Completed',
      createdBy: 'John Smith'
    },
  ];

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      console.log('[InventoryTransactionsManagement] Fetching transactions...');
      
      // In a real app, this would be an API call with filters
      // For now, we'll use the sample data
      setTimeout(() => {
        setTransactions(sampleTransactions);
        setIsLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('[InventoryTransactionsManagement] Error fetching transactions:', error);
      setTransactions([]);
      toast.error('Failed to load transactions. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    // In a real app, this would trigger a filtered API call
    toast.success('Filters applied! (Would fetch filtered data from API)');
    // For demo, we'll simulate filtering
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      location: '',
      status: ''
    });
    toast.success('Filters cleared');
    fetchTransactions();
  };

  const handleCreateTransaction = (e) => {
    e.preventDefault();
    toast.success('Transaction created successfully!');
    setActiveTab(0); // Return to list view
  };

  const renderFilters = () => {
    return (
      <div className={`bg-gray-50 p-4 rounded-md mb-4 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Types</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Locations</option>
              <option value="main">Main Warehouse</option>
              <option value="east">East Coast Distribution</option>
              <option value="west">West Retail Store</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in-transit">In Transit</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleClearFilters}
            className="px-3 py-1 border border-gray-300 rounded-md mr-2 hover:bg-gray-100"
          >
            Clear
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    );
  };

  const renderTransactionsList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </div>
      );
    }
    
    if (!transactions || transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-gray-300 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't recorded any inventory transactions yet. Get started by clicking the "Create Transaction" button.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Your First Transaction
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Date</th>
              <th className="text-left">Type</th>
              <th className="text-left">Source</th>
              <th className="text-left">Destination</th>
              <th className="text-left">Items</th>
              <th className="text-left">Value</th>
              <th className="text-left">Status</th>
              <th className="text-left">Created By</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={transaction.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{transaction.id}</td>
                <td>{transaction.date}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    transaction.type === 'Inbound' ? 'bg-green-100 text-green-800' : 
                    transaction.type === 'Outbound' ? 'bg-orange-100 text-orange-800' :
                    transaction.type === 'Transfer' ? 'bg-blue-100 text-blue-800' :
                    transaction.type === 'Adjustment' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {transaction.type}
                  </span>
                </td>
                <td className="max-w-xs truncate">{transaction.source}</td>
                <td className="max-w-xs truncate">{transaction.destination}</td>
                <td>{transaction.items}</td>
                <td>{transaction.value}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    transaction.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                    transaction.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                    transaction.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {transaction.status}
                  </span>
                </td>
                <td>{transaction.createdBy}</td>
                <td>
                  <button 
                    className="text-blue-600 hover:text-blue-800 mr-2"
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleViewTransaction = (transaction) => {
    console.log('View transaction:', transaction);
    toast.info(`Viewing transaction ${transaction.id}`);
  };

  const renderCreateTransactionForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-medium mb-6">Create New Inventory Transaction</h2>
        
        <form onSubmit={handleCreateTransaction}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Type</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Source</option>
                <option value="main-warehouse">Main Warehouse</option>
                <option value="east-coast">East Coast Distribution</option>
                <option value="purchase-order">Purchase Order</option>
                <option value="customer-return">Customer Return</option>
                <option value="inventory-count">Inventory Count</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Destination</option>
                <option value="main-warehouse">Main Warehouse</option>
                <option value="east-coast">East Coast Distribution</option>
                <option value="west-retail">West Retail Store</option>
                <option value="sales-order">Sales Order</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PO-123, SO-456, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="completed">Completed</option>
                <option value="in-transit">In Transit</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Additional transaction details"
            ></textarea>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Transaction Items</h3>
            <p className="text-gray-500 mb-4">Add the items included in this transaction</p>
            
            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Item</option>
                    <option value="item-1">Widget A</option>
                    <option value="item-2">Widget B</option>
                    <option value="item-3">Widget C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Cost
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="$ 0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actions
                  </label>
                  <button
                    type="button"
                    className="w-full p-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Another Item
            </button>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Transaction
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Inventory Transactions</h1>
      
      <div className="mb-4">
        <div className="flex border-b">
          <button
            className={`py-2 px-4 ${activeTab === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(0)}
          >
            Transactions List
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 1 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(1)}
          >
            Create Transaction
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {activeTab === 0 ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Inventory Transactions</h2>
              <div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 border border-gray-300 rounded-md mr-2 hover:bg-gray-50"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  onClick={() => setActiveTab(1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Transaction
                </button>
              </div>
            </div>
            
            {renderFilters()}
            {renderTransactionsList()}
          </div>
        ) : (
          renderCreateTransactionForm()
        )}
      </div>
    </div>
  );
};

export default InventoryTransactionsManagement; 