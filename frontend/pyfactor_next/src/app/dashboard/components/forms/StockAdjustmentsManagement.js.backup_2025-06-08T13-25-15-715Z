'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const StockAdjustmentsManagement = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for list, 1 for create new

  // Sample data for demonstration
  const sampleAdjustments = [
    { 
      id: 'ADJ-001', 
      date: '2025-05-15', 
      type: 'Addition', 
      reason: 'Purchase Return', 
      items: 3, 
      quantity: 15, 
      value: '$750.00', 
      status: 'Completed' 
    },
    { 
      id: 'ADJ-002', 
      date: '2025-05-10', 
      type: 'Reduction', 
      reason: 'Damaged Goods', 
      items: 2, 
      quantity: 8, 
      value: '$320.00', 
      status: 'Completed' 
    },
    { 
      id: 'ADJ-003', 
      date: '2025-05-05', 
      type: 'Addition', 
      reason: 'Inventory Count', 
      items: 5, 
      quantity: 12, 
      value: '$480.00', 
      status: 'Completed' 
    },
  ];

  useEffect(() => {
    fetchStockAdjustments();
  }, []);

  const fetchStockAdjustments = async () => {
    try {
      setIsLoading(true);
      console.log('[StockAdjustmentsManagement] Fetching stock adjustments...');
      
      // In a real app, this would be an API call
      // For now, we'll use the sample data
      setTimeout(() => {
        setAdjustments(sampleAdjustments);
        setIsLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error fetching stock adjustments:', error);
      setAdjustments([]);
      toast.error('Failed to load stock adjustments. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCreateAdjustment = (e) => {
    e.preventDefault();
    toast.success('This feature will be implemented soon!');
  };

  const renderAdjustmentsList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading stock adjustments...</p>
          </div>
        </div>
      );
    }
    
    if (!adjustments || adjustments.length === 0) {
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No Stock Adjustments Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't created any stock adjustments yet. Get started by clicking the "Create Adjustment" button.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Your First Adjustment
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
              <th className="text-left">Reason</th>
              <th className="text-left">Items</th>
              <th className="text-left">Quantity</th>
              <th className="text-left">Value</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adjustment, index) => (
              <tr key={adjustment.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{adjustment.id}</td>
                <td>{adjustment.date}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    adjustment.type === 'Addition' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {adjustment.type}
                  </span>
                </td>
                <td>{adjustment.reason}</td>
                <td>{adjustment.items}</td>
                <td>{adjustment.quantity}</td>
                <td>{adjustment.value}</td>
                <td>
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {adjustment.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="text-blue-600 hover:text-blue-800 mr-2"
                    onClick={() => handleViewAdjustment(adjustment)}
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

  const handleViewAdjustment = (adjustment) => {
    console.log('View adjustment:', adjustment);
    toast.info(`Viewing adjustment ${adjustment.id}`);
  };

  const renderCreateAdjustmentForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-medium mb-6">Create New Stock Adjustment</h2>
        
        <form onSubmit={handleCreateAdjustment}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Type</option>
                <option value="addition">Addition</option>
                <option value="reduction">Reduction</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Reason</option>
                <option value="purchase_return">Purchase Return</option>
                <option value="damaged_goods">Damaged Goods</option>
                <option value="inventory_count">Inventory Count</option>
                <option value="theft">Theft or Loss</option>
                <option value="expiration">Expiration</option>
                <option value="other">Other</option>
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
                Reference Number
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Add any relevant notes about this adjustment"
            ></textarea>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Items to Adjust</h3>
            <p className="text-gray-500 mb-4">Select products and specify quantity adjustments</p>
            
            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <p className="text-center text-gray-500">
                Item selection will be implemented in the full version
              </p>
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
              Create Adjustment
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Stock Adjustments Management</h1>
      
      <div className="mb-4">
        <div className="flex border-b">
          <button
            className={`py-2 px-4 ${activeTab === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(0)}
          >
            Adjustments List
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 1 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(1)}
          >
            Create Adjustment
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {activeTab === 0 ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Stock Adjustments</h2>
              <button
                onClick={() => setActiveTab(1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Adjustment
              </button>
            </div>
            {renderAdjustmentsList()}
          </div>
        ) : (
          renderCreateAdjustmentForm()
        )}
      </div>
    </div>
  );
};

export default StockAdjustmentsManagement; 