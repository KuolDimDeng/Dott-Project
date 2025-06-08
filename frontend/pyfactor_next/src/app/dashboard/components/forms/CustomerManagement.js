'use client';


import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { customerApi } from '@/utils/apiClient';
import { getCacheValue } from '@/utils/appCache';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      console.log('[CustomerManagement] Fetching customers...');
      
      // Use tenantId from AppCache
      const tenantId = getCacheValue('tenantId') || 'default';
      
      try {
        const data = await customerApi.getAll();
        console.log('[CustomerManagement] Customers data:', data);
        setCustomers(Array.isArray(data) ? data : []);
      } catch (apiError) {
        // Handle errors in API client
        console.error('[CustomerManagement] Error in API call:', apiError);
        setCustomers([]);
        
        if (apiError.message?.includes('relation') && 
            apiError.message?.includes('does not exist')) {
          toast.info('Your customer database is being set up. This should only happen once.');
        } else {
          toast.error('Failed to load customers. Please try again.');
        }
      }
    } catch (error) {
      console.error('[CustomerManagement] Error fetching customers:', error);
      setCustomers([]);
      toast.error('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCustomersList = () => {
    // Show loading state
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading customers...</p>
          </div>
        </div>
      );
    }
    
    // Show empty state with helpful message
    if (!customers || customers.length === 0) {
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No Customers Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't added any customers to your database yet. Get started by clicking the "Add Customer" button above.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Your First Customer
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8">
              <th className="text-left pl-4">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Phone</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.id || index} className="h-16 border-gray-300 border-b">
                <td className="pl-4">{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>
                  <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => handleViewCustomer(customer)}
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

  const handleViewCustomer = (customer) => {
    console.log('View customer:', customer);
    // Implement view customer functionality
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Customer Management</h1>
      
      <div className="mb-4">
        <div className="flex border-b">
          <button
            className={`py-2 px-4 ${activeTab === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(0)}
          >
            Add Customer
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 1 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(1)}
          >
            Customer List
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        {activeTab === 0 ? (
          <div>
            <h2 className="text-xl font-medium mb-4">Add New Customer</h2>
            <p className="text-gray-500 mb-4">Customer form will be implemented here</p>
            <div className="text-center py-8">
              <p>Coming Soon</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-medium mb-4">Customer List</h2>
            {renderCustomersList()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement; 