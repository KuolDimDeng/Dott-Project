// ProcurementManagement.js

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const ProcurementManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [procurements, setProcurements] = useState([]);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [newProcurement, setNewProcurement] = useState({
    vendor: '',
    date: new Date(),
    description: '',
    total_amount: 0,
    status: 'draft',
    items: [],
  });
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchProcurements();
    fetchVendors();
  }, []);

  const fetchProcurements = async () => {
    try {
      const response = await axiosInstance.get('/api/procurements/');
      setProcurements(response.data);
    } catch (error) {
      console.error('Error fetching procurements:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewProcurement((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (event) => {
    const date = new Date(event.target.value);
    setNewProcurement((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleCreateProcurement = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/procurements/create/', newProcurement);
      console.log('Procurement created:', response.data);
      fetchProcurements();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating procurement:', error);
    }
  };

  const handleProcurementSelect = (procurement) => {
    setSelectedProcurement(procurement);
    setActiveTab(1);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Procurement Management
      </h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`py-2 px-4 font-medium text-sm mr-2 ${
              activeTab === 0
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Create
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm mr-2 ${
              activeTab === 1
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Details
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 2
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            List
          </button>
        </nav>
      </div>

      {/* Create Tab */}
      {activeTab === 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Create Procurement
          </h2>
          <form onSubmit={handleCreateProcurement} className="space-y-4">
            {/* Vendor Select */}
            <div className="mb-4">
              <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                id="vendor"
                name="vendor"
                value={newProcurement.vendor}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Picker */}
            <div className="mb-4">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={newProcurement.date instanceof Date ? newProcurement.date.toISOString().substr(0, 10) : ''}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={newProcurement.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Total Amount */}
            <div className="mb-4">
              <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount
              </label>
              <input
                type="number"
                id="total_amount"
                name="total_amount"
                value={newProcurement.total_amount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Status */}
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={newProcurement.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Procurement
            </button>
          </form>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 1 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Procurement Details
          </h2>
          {selectedProcurement ? (
            <div className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procurement Number
                </label>
                <input
                  type="text"
                  value={selectedProcurement.procurement_number}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={selectedProcurement.vendor}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedProcurement.date}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedProcurement.description}
                  disabled
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                <input
                  type="text"
                  value={selectedProcurement.total_amount}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <input
                  type="text"
                  value={selectedProcurement.status}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a procurement from the list to view details</p>
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 2 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Procurement List
          </h2>
          <div className="shadow overflow-hidden border-b border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Procurement Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {procurements.map((procurement) => (
                  <tr 
                    key={procurement.id}
                    onClick={() => handleProcurementSelect(procurement)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {procurement.procurement_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {procurement.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(procurement.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {procurement.total_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {procurement.status}
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

export default ProcurementManagement;
