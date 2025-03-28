import React, { useEffect, useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const CustomerList = ({ onCreateCustomer, onInvoiceSelect, onCustomerSelect, onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchCustomers(userDatabase);
    }
  }, [userDatabase]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError('Error fetching user profile');
      setLoading(false);
    }
  };

  const fetchCustomers = async (database_name) => {
    try {
      console.log('Fetching customers from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/customers/', {
        params: { database: database_name },
      });
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching customers:', error);
      setError('Error fetching customers');
      setLoading(false);
    }
  };

  const handleViewCustomer = (customer) => {
    console.log('Selected customer:', customer);
    onCustomerSelect(customer.id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-main"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          No customers found
        </h2>
        <button 
          className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
          onClick={onCreateCustomer}
        >
          Create a Customer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Customer List
      </h2>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account Number
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customers.map((customer) => (
                <tr 
                  key={customer.id} 
                  onClick={() => handleViewCustomer(customer)} 
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {customer.account_number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
