import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/utils/logger';
import crudLogger from '@/utils/crudLogger';
import CustomerService from '@/services/customerService';
// Removed next-auth import - using Auth0 instead
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

const CustomerList = ({ onCustomerSelect, onCreateCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  // Using tenantId from params instead of session
  const params = useParams();
  const tenantId = params?.tenantId;
  const router = useRouter();

  // Fetch customers using CustomerService with in-memory caching
  const fetchCustomers = useCallback(async (forceRefresh = false) => {
    const operationId = crudLogger.logUserAction(
      'FETCH_CUSTOMERS', 
      'CustomerList', 
      {
        tenantId,
        formData: { forceRefresh },
        userEmail: 'current_user@dottapps.com' // Will be updated with real user email
      }
    );

    try {
      setLoading(true);
      logger.info(`[CustomerList] Fetching customers${forceRefresh ? ' (force refresh)' : ''}`);
      
      // Log API request
      crudLogger.logApiRequest(
        operationId,
        'GET',
        '/api/customers',
        { tenantId, forceRefresh },
        { 'X-Tenant-ID': tenantId }
      );
      
      const fetchedCustomers = await CustomerService.getCustomers({ 
        forceRefresh,
        tenantId
      });
      
      // Log API success
      crudLogger.logApiResponse(
        operationId,
        'GET',
        '/api/customers',
        { data: fetchedCustomers, status: 200 }
      );

      // Log database operation (simulated)
      crudLogger.logDatabaseOperation(
        operationId,
        'READ',
        'customers',
        tenantId,
        { where: { tenant_id: tenantId } },
        fetchedCustomers
      );
      
      logger.info(`[CustomerList] Successfully fetched ${fetchedCustomers.length} customers`);
      setCustomers(fetchedCustomers);
      setError(null);

      crudLogger.logOperationComplete(operationId, 'FETCH_CUSTOMERS', true, { count: fetchedCustomers.length });
    } catch (error) {
      // Log API error
      crudLogger.logApiResponse(
        operationId,
        'GET',
        '/api/customers',
        { status: error.response?.status || 500 },
        error
      );

      // Log database error (simulated)
      crudLogger.logDatabaseOperation(
        operationId,
        'READ',
        'customers',
        tenantId,
        { where: { tenant_id: tenantId } },
        null,
        error
      );

      logger.error('[CustomerList] Error fetching customers:', error);
      logger.error('[CustomerList] Error details:', {
        message: error.message,
        responseData: error.response?.data,
        responseStatus: error.response?.status
      });
      setError('Error fetching customers');
      notifyError('Failed to fetch customers');

      crudLogger.logOperationComplete(operationId, 'FETCH_CUSTOMERS', false);
    } finally {
      setLoading(false);
    }
  }, [tenantId, notifyError]);

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
    
    // Setup refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      fetchCustomers(true);
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchCustomers]);

  const handleViewCustomer = (customer) => {
    logger.info('Selected customer:', customer);
    
    // Check if we're in a tenant-specific route and use appropriate navigation
    if (tenantId) {
      // Using tenant-specific route format
      window.location.href = `/${tenantId}/dashboard/customers/${customer.id}`;
    } else {
      // Using regular dashboard route format
      onCustomerSelect(customer.id);
    }
    
    notifyInfo(`Viewing customer: ${customer.customer_name || customer.customerName || `${customer.first_name} ${customer.last_name}`}`);
  };

  const handleEditCustomer = (customer, event) => {
    // Stop propagation to prevent triggering row click (view customer)
    if (event) {
      event.stopPropagation();
    }
    
    logger.info(`[CustomerList] Editing customer ${customer.id}`);
    
    // Use Next.js router to navigate to the edit page
    // This assumes the existence of an edit page at /dashboard/customers/edit/[id]
    router.push(`/dashboard/customers/edit/${customer.id}`);
  };

  const handleDeleteClick = (customer, event) => {
    event.stopPropagation();
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      logger.info(`[CustomerList] Deleting customer with ID: ${selectedCustomer.id}`);
      
      const headers = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
      
      // Use CustomerService to delete with cache invalidation
      await CustomerService.deleteCustomer(selectedCustomer.id, { headers });
      
      // Remove the deleted customer from the local state
      setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
      notifySuccess('Customer deleted successfully');
    } catch (error) {
      logger.error('[CustomerList] Error deleting customer:', error);
      logger.error('[CustomerList] Error details:', {
        message: error.message,
        responseData: error.response?.data,
        responseStatus: error.response?.status
      });
      notifyError('Failed to delete customer');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  // Manually refresh the customer list
  const handleRefresh = () => {
    fetchCustomers(true);
    notifyInfo('Refreshing customer list...');
  };

  // Filter customers based on search query
  const filteredCustomers = searchQuery
    ? customers.filter(customer => {
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
        const businessName = (customer.customer_name || customer.customerName || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        
        return fullName.includes(search) || 
               businessName.includes(search) || 
               email.includes(search) || 
               phone.includes(search);
      })
    : customers;

  if (loading && customers.length === 0) {
    return (
      <div className="w-full">
        <div className="h-2 bg-gray-200">
          <div className="h-2 bg-blue-600 animate-pulse"></div>
        </div>
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={handleRefresh}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar with Refresh Button */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex gap-2 items-center">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={onCreateCustomer}
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => handleViewCustomer(customer)} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.customer_name || customer.customerName || `${customer.first_name || ''} ${customer.last_name || ''}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => handleEditCustomer(customer, e)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(customer, e)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? "No customers match your search" : "No customers found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Loading overlay */}
        {loading && customers.length > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-60 flex justify-center items-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Customer</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this customer? This action cannot be undone.
                      </p>
                      {selectedCustomer && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Name:</span> {selectedCustomer.customer_name || selectedCustomer.customerName || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`}
                          </p>
                          {selectedCustomer.email && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Email:</span> {selectedCustomer.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
