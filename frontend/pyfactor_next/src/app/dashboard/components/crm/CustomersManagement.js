'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { appCache } from '@/utils/awsAppCache';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Dialog } from '@headlessui/react';
import { 
  AddIcon, 
  EditIcon, 
  DeleteIcon,
  SearchIcon,
  FilterListIcon,
  VisibilityIcon
} from '@/app/components/icons';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';

const MOCK_CUSTOMERS = [
  {
    id: 'mock-id-1',
    customerName: 'Acme Corporation',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@acme.com',
    phone: '555-123-4567',
    city: 'New York',
    billingState: 'NY',
    billingCountry: 'USA'
  },
  {
    id: 'mock-id-2',
    customerName: 'Tech Solutions Inc',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@techsolutions.com',
    phone: '555-987-6543',
    city: 'San Francisco',
    billingState: 'CA',
    billingCountry: 'USA'
  },
  {
    id: 'mock-id-3',
    customerName: 'Global Enterprises',
    first_name: 'Robert',
    last_name: 'Johnson',
    email: 'robert@globalenterprises.com',
    phone: '555-456-7890',
    city: 'Chicago',
    billingState: 'IL',
    billingCountry: 'USA'
  }
];

const CustomersManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [showCreateCustomerForm, setShowCreateCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    billingState: '',
    billingCountry: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState(null);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Helper function to get tenant ID from Cognito or AppCache
  const getTenantId = async (operation = 'operation') => {
    let tenantId = null;
    try {
      // Get auth session from Cognito
      const session = await fetchAuthSession();
      
      // Extract tenantId from idToken claims - check all possible cases
      const claims = session.tokens?.idToken?.payload || {};
      console.log('Cognito token claims:', JSON.stringify(claims));
      
      // Check all possible formats of tenant ID in the claims
      tenantId = claims['custom:tenant_id'] || 
               claims['custom:tenant_ID'] || 
               claims['custom:tenantId'] || 
               claims['tenant_id'] ||
               claims['tenantId'] || 
               claims['tenant_ID'] || 
               null;
      
      // Extract from URL if available (this is important for consistency)
      const pathname = window.location.pathname;
      const urlTenantIdMatch = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/i);
      const urlTenantId = urlTenantIdMatch ? urlTenantIdMatch[1] : null;
      
      if (urlTenantId && (!tenantId || tenantId !== urlTenantId)) {
        console.log(`Using tenant ID from URL: ${urlTenantId} (instead of ${tenantId || 'none'} from Cognito)`);
        tenantId = urlTenantId;
      }
      
      // If no tenant ID in claims or URL, try to get from appCache
      if (!tenantId) {
        const cachedTenantId = await appCache.get('current_tenant_id');
        if (cachedTenantId) {
          tenantId = cachedTenantId;
          console.log(`Using tenant ID from cache: ${tenantId}`);
        } else {
          // If we still don't have a tenant ID, log a warning
          console.warn(`No tenant ID found for ${operation}. This may cause visibility issues.`);
        }
      } else {
        // Store the tenant ID in AppCache for future use
        await appCache.set('current_tenant_id', tenantId, { expires: 60 * 60 * 24 }); // 24 hours
      }
      
      console.log(`Performing ${operation} with tenant ID: ${tenantId || 'undefined'}`);
      
      // Return both tenant ID and token
      return {
        tenantId,
        token: session.tokens?.idToken?.toString() || ''
      };
    } catch (error) {
      console.error(`Error extracting tenant ID for ${operation}:`, error);
      
      // Try to extract from URL as fallback
      try {
        const pathname = window.location.pathname;
        const urlTenantIdMatch = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/i);
        if (urlTenantIdMatch) {
          const urlTenantId = urlTenantIdMatch[1];
          console.log(`Fallback to tenant ID from URL: ${urlTenantId}`);
          return { tenantId: urlTenantId, token: '' };
        }
      } catch (urlError) {
        console.error('Error extracting tenant ID from URL:', urlError);
      }
      
      return { tenantId: null, token: '' };
    }
  };

  // Define fetchCustomers before the useEffect that uses it
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tenant ID securely from Cognito only
      const tenantId = await getSecureTenantId();
      
      if (!tenantId) {
        setError(new Error('Authentication error: Unable to verify your organization. Please log out and sign in again.'));
        return;
      }
      
      console.log('[CustomersManagement] Fetching customers with secure Cognito tenant ID:', tenantId);
      
      // Build query parameters for pagination and search
      const queryParams = new URLSearchParams();
      if (page > 1) queryParams.append('page', page);
      queryParams.append('limit', limit);
      if (searchTerm) queryParams.append('search', searchTerm);
      
      // Append the query string to the URL if we have parameters
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Send request with tenant ID in headers
      const response = await fetch(`/api/customers${queryString}`, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.status}`);
      }
      
      const data = await response.json();
      setCustomers(data);
      setTotalPages(Math.ceil(data.length / limit));
    } catch (err) {
      console.error('[CustomersManagement] Error fetching customers:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchTerm]);

  // Fetch customer data when page, limit or search term changes
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  const fetchAndUpdateCustomers = async (retryCount = 0, delay = 1000) => {
    try {
      // Get tenant ID and token using helper
      const { tenantId, token } = await getTenantId('Fetching customers');
      
      // Build query params
      const queryParams = new URLSearchParams({
        page,
        limit,
      });
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      // Include tenant ID in query params if available
      if (tenantId) {
        queryParams.append('tenantId', tenantId);
      }
      
      // Fetch customers from API - Fix the URL to use the correct endpoint
      const response = await fetch(`/api/customers/?${queryParams.toString()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId || '' // Also include in headers for redundancy
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      // Check content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const rawText = await response.text();
        logger.error(`API returned non-JSON response: ${rawText.substring(0, 200)}...`);
        throw new Error(`API returned non-JSON response type: ${contentType || 'unknown'}`);
      }
      
      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If we get here, the content type was application/json but parsing failed
        const rawText = await response.clone().text();
        logger.error(`JSON parse error: ${parseError.message}. Raw response: ${rawText.substring(0, 200)}...`);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
      
      logger.info(`Fetched ${data.results?.length || 0} customers successfully`);
      
      // Store in AppCache for future quick access
      const cacheKey = `crm_customers_${searchTerm}_${page}_${limit}`;
      await appCache.set(cacheKey, JSON.stringify(data), { expires: 60 * 5 }); // 5 minutes cache
      
      setCustomers(data.results || []);
      setTotalPages(data.total_pages || 1);
      setLoading(false);
    } catch (err) {
      logger.error("Error updating customers:", err);
      
      // Implement retry with exponential backoff logic
      const maxRetries = 3;
      if (retryCount < maxRetries) {
        const nextDelay = delay * 2; // Exponential backoff
        const nextRetryCount = retryCount + 1;
        
        logger.info(`Retrying customer fetch (${nextRetryCount}/${maxRetries}) in ${delay}ms...`);
        
        // Show temporary message
        setError(`Temporary network issue. Retrying (${nextRetryCount}/${maxRetries})...`);
        
        // Wait for delay duration then retry
        setTimeout(() => {
          fetchAndUpdateCustomers(nextRetryCount, nextDelay);
        }, delay);
        
        return;
      }
      
      // If we've exhausted retries, show a fallback message and use mock data
      setError(`Unable to fetch customers from server. Showing example data instead.`);
      
      // Set mock data as fallback
      setCustomers(MOCK_CUSTOMERS);
      setTotalPages(1);
      setLoading(false);
    }
  };
    
  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleDeleteClick = (customer) => {
    setSelectedCustomer(customer);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    
    try {
      // Get tenant ID securely from Cognito only
      const tenantId = await getSecureTenantId();
      
      if (!tenantId) {
        console.error('[CustomersManagement] Unable to get secure tenant ID');
        return;
      }
      
      console.log('[CustomersManagement] Deleting customer with secure Cognito tenant ID:', tenantId);
      
      const response = await fetch(`/api/customers/${selectedCustomer.id}/`, {
        method: 'DELETE',
        headers: { 
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Remove deleted customer from the list
        setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
        setTotalPages(Math.ceil((customers.length - 1) / limit));
      } else {
        const errorText = await response.text();
        console.error(`Failed to delete customer: ${errorText}`);
        throw new Error(`Failed to delete customer: ${response.status}`);
      }
    } catch (error) {
      console.error('[CustomersManagement] Error deleting customer:', error);
    } finally {
      setOpenDeleteDialog(false);
      setSelectedCustomer(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setSelectedCustomer(null);
  };

  const handleCreateCustomer = () => {
    setFormError('');
    setFormSuccess(false);
    setNewCustomer({
      customerName: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      website: '',
      city: '',
      billingState: '',
      billingCountry: ''
    });
    setShowCreateCustomerForm(true);
  };

  const handleCreateCustomerCancel = () => {
    setShowCreateCustomerForm(false);
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      setFormError('');
      setFormSuccess(false);
      
      // Get tenant ID securely from Cognito only
      const tenantId = await getSecureTenantId();
      
      if (!tenantId) {
        setFormError('Authentication error: Unable to verify your organization. Please log out and sign in again.');
        return;
      }
      
      console.log('[CustomersManagement] Creating customer with secure Cognito tenant ID:', tenantId);
      
      const customerData = {
        business_name: newCustomer.customerName,
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        website: newCustomer.website,
        city: newCustomer.city,
        billing_state: newCustomer.billingState,
        billing_country: newCustomer.billingCountry,
        tenant_id: tenantId // Add secured tenant ID
      };
      
      // Send request with tenant ID in headers
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create customer: ${errorText || response.status}`);
      }
      
      const data = await response.json();
      
      // Reset form and show success message
      setFormSuccess(true);
      setShowCreateCustomerForm(false);
      
      // Reset form values
      setNewCustomer({
        customerName: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        website: '',
        city: '',
        billingState: '',
        billingCountry: ''
      });
      
      // Refresh customers list
      fetchCustomers();
    } catch (err) {
      console.error('[CustomersManagement] Error creating customer:', err);
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
    return fetchCustomerDetails(customer.id).catch(err => {
      // Already handled in fetchCustomerDetails, just ensure the promise resolves
      console.warn('[CustomersManagement] Error in handleViewCustomer flow:', err);
    });
  };

  const handleCloseCustomerDetails = () => {
    setShowCustomerDetails(false);
    setCustomerDetails(null);
    setSelectedCustomer(null);
    setEditMode(false);
    setEditedCustomer(null);
    setUpdateError('');
    setUpdateSuccess(false);
  };

  const handleEditModeToggle = () => {
    if (!editMode) {
      // Enter edit mode
      setEditMode(true);
      setEditedCustomer({...customerDetails});
      setUpdateError('');
      setUpdateSuccess(false);
    } else {
      // Cancel edit mode
      setEditMode(false);
      setEditedCustomer(null);
      setUpdateError('');
      setUpdateSuccess(false);
    }
  };

  const handleEditedCustomerChange = (e) => {
    const { name, value } = e.target;
    setEditedCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !editedCustomer) return;
    
    try {
      setUpdateSubmitting(true);
      setUpdateError('');
      setUpdateSuccess(false);
      
      // Get tenant ID securely from Cognito only
      const tenantId = await getSecureTenantId();
      
      if (!tenantId) {
        setUpdateError('Authentication error: Unable to verify your organization. Please log out and sign in again.');
        return;
      }
      
      console.log('[CustomersManagement] Updating customer with secure Cognito tenant ID:', tenantId);
      
      // Send request with tenant ID in headers
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedCustomer)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update customer: ${errorText || response.status}`);
      }
      
      const updatedCustomer = await response.json();
      
      // Update the customers list and close the edit mode
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setCustomerDetails(updatedCustomer);
      setEditMode(false);
      setUpdateSuccess(true);
    } catch (err) {
      console.error('[CustomersManagement] Error updating customer:', err);
      setUpdateError(err.message);
    } finally {
      setUpdateSubmitting(false);
    }
  };

  // Fetch customer details with secure tenant ID
  const fetchCustomerDetails = useCallback(async (customerId) => {
    if (!customerId) return;
    
    let retryCount = 0;
    const maxRetries = 2;
    const fetchWithRetry = async () => {
      try {
        setLoadingDetails(true);
        setDetailsError(null);
        
        // Get tenant ID securely from Cognito only
        const tenantId = await getSecureTenantId();
        
        if (!tenantId) {
          setDetailsError(new Error('Authentication error: Unable to verify your organization. Please log out and sign in again.'));
          return;
        }
        
        console.log('[CustomersManagement] Fetching customer details with secure Cognito tenant ID:', tenantId);
        
        // Make sure we're using an absolute URL path with the current origin to avoid any proxy configuration
        const currentOrigin = window.location.origin;
        const apiUrl = `${currentOrigin}/api/customers/${customerId}`;
        console.log(`[CustomersManagement] Using API URL: ${apiUrl}`);
        
        // Send request with tenant ID in headers
        const response = await fetch(apiUrl, {
          headers: {
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
            // Add cache busting to prevent stale responses
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          // Setting a short timeout to prevent long waits on ECONNREFUSED errors
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        // Check if the response is successful
        if (!response.ok) {
          // For all server errors, use the fallback if available
          if (response.status >= 500 && selectedCustomer) {
            console.warn(`[CustomersManagement] Server error (${response.status}) when fetching details, using basic customer data as fallback`);
            
            // Use the list data as a fallback
            setCustomerDetails({
              ...selectedCustomer,
              _isFallback: true,
              _errorStatus: response.status
            });
            
            // Return early
            return;
          }
          
          // For non-500 errors or if no selected customer data to use as fallback
          throw new Error(`Failed to fetch customer details: ${response.status}`);
        }
        
        const data = await response.json();
        setCustomerDetails(data);
      } catch (err) {
        console.error('[CustomersManagement] Error fetching customer details:', err);
        
        // Check for specific network errors, including timeout and ECONNREFUSED (which often manifests as AbortError)
        const errorMsg = err.message || '';
        const isNetworkError = 
          errorMsg.includes('Failed to fetch') || 
          errorMsg.includes('NetworkError') || 
          errorMsg.includes('network') ||
          errorMsg.includes('ECONNREFUSED') || 
          errorMsg.includes('500') || 
          errorMsg.includes('AbortError') ||
          errorMsg.includes('timed out') ||
          err.name === 'AbortError' ||
          err.name === 'TimeoutError';
        
        // For network errors or other retryable errors, attempt retry
        if (retryCount < maxRetries && isNetworkError) {
          retryCount++;
          console.log(`[CustomersManagement] Retrying fetch customer details (${retryCount}/${maxRetries})...`);
          
          // Short delay before retrying, longer for connection refused errors
          const delayTime = err.name === 'AbortError' || errorMsg.includes('ECONNREFUSED') ? 2000 : 1000;
          await new Promise(resolve => setTimeout(resolve, delayTime));
          
          // Try again
          return fetchWithRetry();
        }
        
        // If we have the selected customer, use its data as fallback after all retries
        if (selectedCustomer) {
          console.warn(`[CustomersManagement] Using basic customer data as fallback after fetch errors`);
          
          // Create a detailed error message for debugging
          let detailedError = errorMsg;
          if (err.name === 'AbortError') {
            detailedError = 'Request timed out or was aborted. The API server might be unreachable.';
          } else if (errorMsg.includes('ECONNREFUSED')) {
            detailedError = 'Connection refused. The API server on the specified port is not running.';
          }
          
          setCustomerDetails({
            ...selectedCustomer,
            _isFallback: true,
            _errorMessage: detailedError,
            _errorName: err.name || 'Error'
          });
          
          // Don't set error if we're using fallback, but show a toast
          toast.error("Could not load complete customer details. Using basic information instead.");
        } else {
          setDetailsError(err);
        }
      } finally {
        setLoadingDetails(false);
      }
    };
    
    // Start the fetch process with retry capability
    await fetchWithRetry();
  }, [selectedCustomer]);

  if (loading && customers.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading customer data...</p>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="p-6 bg-gray-50">
        <h1 className="text-2xl font-bold text-black mb-4">Customer Management</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error.message}</span>
          <button 
            className="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={fetchCustomers}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">
        Customer Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Total Customers
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {totalPages * limit}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Active Customers
          </h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {customers.length}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search Customers"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex space-x-2">
          <button 
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
          >
            <FilterListIcon className="h-5 w-5 mr-2" />
            Filter
          </button>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={handleCreateCustomer}
          >
            <AddIcon className="h-5 w-5 mr-2" />
            Add Customer
          </button>
        </div>
      </div>
      
      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Account #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{customer.customerName || `${customer.first_name} ${customer.last_name}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{customer.accountNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{customer.city}, {customer.billingState || customer.billingCountry}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <VisibilityIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => {
                          handleViewCustomer(customer).then(() => {
                            // After loading customer details, enter edit mode
                            setTimeout(() => {
                              if (!loadingDetails && !detailsError) {
                                handleEditModeToggle();
                              }
                            }, 300);
                          });
                        }}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        <EditIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(customer)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-black">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-black">
                Showing <span className="font-medium">{customers.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> to <span className="font-medium">{Math.min(page * limit, totalPages * limit)}</span> of{' '}
                <span className="font-medium">{totalPages * limit}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleChangePage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                      page === i + 1 
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                        : 'bg-white text-black hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-black mb-4">
              Delete Customer
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-black">
                Are you sure you want to delete this customer? This action cannot be undone and all associated data will be permanently removed.
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      
      {/* Create Customer Form Dialog */}
      <Dialog
        open={showCreateCustomerForm}
        onClose={handleCreateCustomerCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-lg bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <Dialog.Title className="text-lg font-medium text-black mb-4">
              Create New Customer
            </Dialog.Title>
            
            {formSuccess ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>Customer created successfully!</p>
              </div>
            ) : null}
            
            {formError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{formError}</p>
              </div>
            ) : null}
            
            <form onSubmit={handleCreateCustomerSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-black mb-1">
                    Business Name
                  </label>
                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.customerName}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.email}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-black mb-1">
                    First Name
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.first_name}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-black mb-1">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.last_name}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-black mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.phone}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-black mb-1">
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.website}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-black mb-1">
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.city}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="billingState" className="block text-sm font-medium text-black mb-1">
                    State/Province
                  </label>
                  <input
                    id="billingState"
                    name="billingState"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.billingState}
                    onChange={handleNewCustomerChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="billingCountry" className="block text-sm font-medium text-black mb-1">
                    Country
                  </label>
                  <input
                    id="billingCountry"
                    name="billingCountry"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newCustomer.billingCountry}
                    onChange={handleNewCustomerChange}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCreateCustomerCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Customer'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
      
      {/* Customer Details Dialog */}
      <Dialog
        open={showCustomerDetails}
        onClose={handleCloseCustomerDetails}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl w-full rounded-lg bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-xl font-medium text-black">
                {editMode ? 'Edit Customer' : 'Customer Details'}
              </Dialog.Title>
              <button
                onClick={handleCloseCustomerDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loadingDetails && (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-600">Loading customer details...</p>
              </div>
            )}
            
            {detailsError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{detailsError.message}</p>
                <button 
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                  onClick={() => handleViewCustomer(selectedCustomer)}
                >
                  Try Again
                </button>
              </div>
            )}
            
            {updateError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{updateError}</p>
              </div>
            )}
            
            {updateSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>Customer updated successfully!</p>
              </div>
            )}
            
            {customerDetails && !editMode && (
              <div>
                {customerDetails._isFallback && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                    <p className="font-medium">Limited Data Available</p>
                    <p className="mt-1">
                      {customerDetails._errorName === 'AbortError' ? 
                        'Request timed out while connecting to the API server.' :
                        `Unable to connect to the customer details API. ${customerDetails._errorStatus ? `(Error ${customerDetails._errorStatus})` : ''}`
                      }
                      {customerDetails._errorMessage && !customerDetails._errorMessage.includes('undefined') && (
                        <span className="block mt-1 text-xs font-mono bg-yellow-50 p-1 rounded">
                          {customerDetails._errorMessage}
                        </span>
                      )}
                    </p>
                    <p className="mt-2">
                      Showing limited customer information from the listing. You can{' '}
                      <button
                        className="text-blue-600 underline font-medium"
                        onClick={() => fetchCustomerDetails(selectedCustomer.id)}
                      >try again</button> or continue with the basic information.
                    </p>
                  </div>
                )}
                
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-black">
                    {customerDetails.customerName || customerDetails.business_name || `${customerDetails.first_name || ''} ${customerDetails.last_name || ''}`}
                  </h2>
                  {(customerDetails.customerName || customerDetails.business_name) && (customerDetails.first_name || customerDetails.last_name) && (
                    <p className="text-gray-600 mt-1">
                      Primary Contact: {customerDetails.first_name || ''} {customerDetails.last_name || ''}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-black mb-3">Contact Information</h3>
                    
                    <div className="space-y-2">
                      {customerDetails.email && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Email:</span>
                          <a href={`mailto:${customerDetails.email}`} className="text-blue-600 hover:underline">{customerDetails.email}</a>
                        </div>
                      )}
                      
                      {customerDetails.phone && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Phone:</span>
                          <a href={`tel:${customerDetails.phone}`} className="text-blue-600 hover:underline">{customerDetails.phone}</a>
                        </div>
                      )}
                      
                      {customerDetails.website && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Website:</span>
                          <a href={customerDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{customerDetails.website}</a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-black mb-3">Location</h3>
                    
                    <div className="space-y-2">
                      {customerDetails.address && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Address:</span>
                          <span>{customerDetails.address}</span>
                        </div>
                      )}
                      
                      {customerDetails.city && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">City:</span>
                          <span>{customerDetails.city}</span>
                        </div>
                      )}
                      
                      {customerDetails.billingState && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">State:</span>
                          <span>{customerDetails.billingState}</span>
                        </div>
                      )}
                      
                      {customerDetails.billingCountry && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Country:</span>
                          <span>{customerDetails.billingCountry}</span>
                        </div>
                      )}
                      
                      {customerDetails.postalCode && (
                        <div className="flex items-start">
                          <span className="text-gray-500 w-24">Postal Code:</span>
                          <span>{customerDetails.postalCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {customerDetails.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-black mb-3">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-line">{customerDetails.notes}</p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleEditModeToggle}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Edit Customer
                  </button>
                  <button
                    onClick={() => {
                      handleCloseCustomerDetails();
                      handleDeleteClick(selectedCustomer);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Customer
                  </button>
                </div>
              </div>
            )}
            
            {customerDetails && editMode && (
              <form onSubmit={handleUpdateCustomer}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="edit-customerName" className="block text-sm font-medium text-black mb-1">
                      Business Name
                    </label>
                    <input
                      id="edit-customerName"
                      name="customerName"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.customerName || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-email" className="block text-sm font-medium text-black mb-1">
                      Email Address
                    </label>
                    <input
                      id="edit-email"
                      name="email"
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.email || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-first_name" className="block text-sm font-medium text-black mb-1">
                      First Name
                    </label>
                    <input
                      id="edit-first_name"
                      name="first_name"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.first_name || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-last_name" className="block text-sm font-medium text-black mb-1">
                      Last Name
                    </label>
                    <input
                      id="edit-last_name"
                      name="last_name"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.last_name || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-black mb-1">
                      Phone Number
                    </label>
                    <input
                      id="edit-phone"
                      name="phone"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.phone || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-website" className="block text-sm font-medium text-black mb-1">
                      Website
                    </label>
                    <input
                      id="edit-website"
                      name="website"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.website || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-address" className="block text-sm font-medium text-black mb-1">
                      Address
                    </label>
                    <input
                      id="edit-address"
                      name="address"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.address || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-city" className="block text-sm font-medium text-black mb-1">
                      City
                    </label>
                    <input
                      id="edit-city"
                      name="city"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.city || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-billingState" className="block text-sm font-medium text-black mb-1">
                      State/Province
                    </label>
                    <input
                      id="edit-billingState"
                      name="billingState"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.billingState || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-billingCountry" className="block text-sm font-medium text-black mb-1">
                      Country
                    </label>
                    <input
                      id="edit-billingCountry"
                      name="billingCountry"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.billingCountry || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-postalCode" className="block text-sm font-medium text-black mb-1">
                      Postal Code
                    </label>
                    <input
                      id="edit-postalCode"
                      name="postalCode"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editedCustomer.postalCode || ''}
                      onChange={handleEditedCustomerChange}
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-notes" className="block text-sm font-medium text-black mb-1">
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    name="notes"
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editedCustomer.notes || ''}
                    onChange={handleEditedCustomerChange}
                  ></textarea>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleEditModeToggle}
                    className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={updateSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                    disabled={updateSubmitting}
                  >
                    {updateSubmitting ? (
                      <>
                        <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default CustomersManagement; 