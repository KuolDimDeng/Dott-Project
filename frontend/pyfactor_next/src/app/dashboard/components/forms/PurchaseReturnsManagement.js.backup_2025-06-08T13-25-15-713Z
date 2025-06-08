// PurchaseReturnsManagement.js

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
// Note: You'll need to use a different date picker library compatible with Tailwind
// For example: react-datepicker

const PurchaseReturnsManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [selectedPurchaseReturn, setSelectedPurchaseReturn] = useState(null);

  const [newPurchaseReturn, setNewPurchaseReturn] = useState({
    purchase_order: '',
    date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD for the date input
    reason: '',
    total_amount: 0,
    status: 'pending',
    items: [],
  });

  useEffect(() => {
    fetchPurchaseReturns();
  }, []);

  const fetchPurchaseReturns = async () => {
    try {
      const response = await axiosInstance.get('/api/purchase-returns/');
      setPurchaseReturns(response.data);
    } catch (error) {
      console.error('Error fetching purchase returns:', error);
    }
  };

  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewPurchaseReturn((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreatePurchaseReturn = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/purchase-returns/', newPurchaseReturn);
      console.log('Purchase return created:', response.data);
      fetchPurchaseReturns();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating purchase return:', error);
    }
  };

  const handlePurchaseReturnSelect = (purchaseReturn) => {
    setSelectedPurchaseReturn(purchaseReturn);
    setActiveTab(1);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Purchase Returns Management
      </h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button 
            onClick={() => handleTabChange(0)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-selected={activeTab === 0}
          >
            Create
          </button>
          <button 
            onClick={() => handleTabChange(1)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-selected={activeTab === 1}
          >
            Details
          </button>
          <button 
            onClick={() => handleTabChange(2)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-selected={activeTab === 2}
          >
            List
          </button>
        </nav>
      </div>

      {/* Create Tab */}
      {activeTab === 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Create Purchase Return
          </h3>
          <form onSubmit={handleCreatePurchaseReturn} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="purchase_order" className="block text-sm font-medium text-gray-700">
                Purchase Order
              </label>
              <input
                type="text"
                id="purchase_order"
                name="purchase_order"
                value={newPurchaseReturn.purchase_order}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={newPurchaseReturn.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                value={newPurchaseReturn.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <input
                type="number"
                id="total_amount"
                name="total_amount"
                value={newPurchaseReturn.total_amount}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={newPurchaseReturn.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="mt-6 w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Create Purchase Return
            </button>
          </form>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 1 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Purchase Return Details
          </h3>
          {selectedPurchaseReturn ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Return Number
                </label>
                <input
                  type="text"
                  value={selectedPurchaseReturn.return_number}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Order
                </label>
                <input
                  type="text"
                  value={selectedPurchaseReturn.purchase_order}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="text"
                  value={new Date(selectedPurchaseReturn.date).toLocaleDateString()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <textarea
                  value={selectedPurchaseReturn.reason}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Total Amount
                </label>
                <input
                  type="text"
                  value={selectedPurchaseReturn.total_amount}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <input
                  type="text"
                  value={selectedPurchaseReturn.status}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  disabled
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Select a purchase return from the list to view details</p>
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 2 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Purchase Returns List
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseReturns.map((purchaseReturn) => (
                  <tr 
                    key={purchaseReturn.id}
                    onClick={() => handlePurchaseReturnSelect(purchaseReturn)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchaseReturn.return_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchaseReturn.purchase_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(purchaseReturn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchaseReturn.total_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${purchaseReturn.status === 'pending' && 'bg-yellow-100 text-yellow-800'}
                        ${purchaseReturn.status === 'approved' && 'bg-green-100 text-green-800'}
                        ${purchaseReturn.status === 'completed' && 'bg-blue-100 text-blue-800'}
                        ${purchaseReturn.status === 'rejected' && 'bg-red-100 text-red-800'}
                      `}>
                        {purchaseReturn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReturnsManagement;
