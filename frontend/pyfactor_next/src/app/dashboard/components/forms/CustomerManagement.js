'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { customerApi } from '@/utils/apiClient';
import { getCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

const CustomerManagement = () => {
  // State management
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    notes: ''
  });

  useEffect(() => {
    isMounted.current = true;
    fetchCustomers();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[CustomerManagement] Fetching customers...');
      
      // Backend handles tenant isolation automatically
      // No need to send tenant ID from frontend
      
      try {
        const data = await customerApi.getAll();
        console.log('[CustomerManagement] Raw API response:', data);
        
        // Handle paginated response from Django REST framework
        let customerList = [];
        if (data?.results && Array.isArray(data.results)) {
          // Paginated response
          customerList = data.results;
          console.log('[CustomerManagement] Fetched customers (paginated):', customerList.length);
          console.log('[CustomerManagement] Pagination info:', { count: data.count, next: data.next, previous: data.previous });
        } else if (Array.isArray(data)) {
          // Direct array response
          customerList = data;
          console.log('[CustomerManagement] Fetched customers (array):', customerList.length);
        } else {
          console.log('[CustomerManagement] Unexpected data format:', data);
        }
        
        if (isMounted.current) {
          setCustomers(customerList);
        }
      } catch (apiError) {
        console.error('[CustomerManagement] API error:', apiError);
        if (isMounted.current) {
          setCustomers([]);
          if (apiError.message?.includes('relation') && apiError.message?.includes('does not exist')) {
            toast.info('Customer database is being initialized.');
          } else {
            toast.error('Failed to load customers.');
          }
        }
      }
    } catch (error) {
      console.error('[CustomerManagement] Error:', error);
      if (isMounted.current) {
        setCustomers([]);
        toast.error('Failed to load customers.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle form changes
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle create customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    console.log('[CustomerManagement] DEBUG: Create button clicked');
    console.log('[CustomerManagement] DEBUG: Form data:', JSON.stringify(formData, null, 2));
    console.log('[CustomerManagement] DEBUG: Form validation:', {
      hasFirstName: !!formData.first_name,
      hasLastName: !!formData.last_name,
      hasEmail: !!formData.email,
      hasBusinessName: !!formData.business_name
    });
    
    try {
      setIsSubmitting(true);
      console.log('[CustomerManagement] DEBUG: Submitting state set to true');
      
      // Backend handles tenant isolation automatically
      // No need to check tenant ID in frontend
      
      console.log('[CustomerManagement] DEBUG: Calling customerApi.create()...');
      const response = await customerApi.create(formData);
      console.log('[CustomerManagement] DEBUG: API response:', response);
      
      const displayName = formData.business_name || `${formData.first_name} ${formData.last_name}`.trim() || formData.email;
      toast.success(`Customer "${displayName}" created successfully!`);
      
      // Reset form and refresh list
      setFormData({
        first_name: '',
        last_name: '',
        business_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        notes: ''
      });
      setIsCreating(false);
      fetchCustomers();
    } catch (error) {
      console.error('[CustomerManagement] DEBUG: Error creating customer:', error);
      console.error('[CustomerManagement] DEBUG: Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(`Failed to create customer: ${error.message || 'Unknown error'}`);
    } finally {
      console.log('[CustomerManagement] DEBUG: Setting submitting to false');
      setIsSubmitting(false);
    }
  };

  // Handle update customer
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    console.log('[CustomerManagement] Updating customer:', selectedCustomer?.id);
    
    try {
      setIsSubmitting(true);
      
      const response = await customerApi.update(selectedCustomer.id, formData);
      console.log('[CustomerManagement] Customer updated:', response);
      
      toast.success('Customer updated successfully!');
      
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? response : c));
      setIsEditing(false);
      setSelectedCustomer(response);
    } catch (error) {
      console.error('[CustomerManagement] Error updating customer:', error);
      toast.error('Failed to update customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    console.log('[CustomerManagement] Deleting customer:', customerToDelete.id);
    
    try {
      await customerApi.delete(customerToDelete.id);
      console.log('[CustomerManagement] Customer deleted successfully');
      
      toast.success('Customer deleted successfully!');
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      
      if (selectedCustomer?.id === customerToDelete.id) {
        setShowCustomerDetails(false);
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error('[CustomerManagement] Error deleting customer:', error);
      toast.error('Failed to delete customer.');
    }
  };

  // Handle view customer details
  const handleViewCustomer = useCallback((customer) => {
    console.log('[CustomerManagement] Viewing customer:', customer);
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
    setIsCreating(false);
    setIsEditing(false);
  }, []);

  // Handle edit customer
  const handleEditCustomer = useCallback((customer) => {
    console.log('[CustomerManagement] Editing customer:', customer);
    setSelectedCustomer(customer);
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      business_name: customer.business_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      country: customer.country || '',
      notes: customer.notes || ''
    });
    setIsEditing(true);
    setShowCustomerDetails(true);
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim().toLowerCase();
    
    return customer.first_name?.toLowerCase().includes(searchLower) ||
           customer.last_name?.toLowerCase().includes(searchLower) ||
           customer.business_name?.toLowerCase().includes(searchLower) ||
           fullName.includes(searchLower) ||
           customer.email?.toLowerCase().includes(searchLower);
  });

  // Render customer form
  const renderCustomerForm = () => {
    const isEditMode = isEditing && selectedCustomer;
    
    return (
      <form onSubmit={isEditMode ? handleUpdateCustomer : handleCreateCustomer} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              name="business_name"
              value={formData.business_name}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company Inc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="customer@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about the customer..."
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setShowCustomerDetails(false);
              setFormData({
                first_name: '',
                last_name: '',
                business_name: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                zip_code: '',
                country: '',
                notes: ''
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span>{isEditMode ? 'Update Customer' : 'Create Customer'}</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render customer details
  const renderCustomerDetails = () => {
    if (!selectedCustomer) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">First Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.first_name || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.last_name || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Business Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.business_name || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.phone || 'Not provided'}</p>
          </div>
          
        </div>
        
        {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.state || selectedCustomer.zip_code || selectedCustomer.country) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <p className="mt-1 text-sm text-gray-900">
              {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip_code, selectedCustomer.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}
        
        {selectedCustomer.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedCustomer.notes}</p>
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Customer Activity</h3>
          <p className="text-sm text-gray-600">Activity tracking coming soon...</p>
        </div>
      </div>
    );
  };

  // Render customers table
  const renderCustomersTable = () => {
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
    
    if (!filteredCustomers || filteredCustomers.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new customer.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowCustomerDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Customer
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Location</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">
                  {customer.business_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{customer.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{customer.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{customer.city || customer.country || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewCustomer(customer)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditCustomer(customer)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setCustomerToDelete(customer);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Delete confirmation dialog
  const renderDeleteDialog = () => (
    <Transition.Root show={deleteDialogOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setDeleteDialogOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c0 1.378 1.068 2.508 2.428 2.574 1.351.066 2.7.103 4.051.103 2.787 0 5.532-.138 8.206-.361M12 9c-2.549 0-5.058.168-7.51.486M12 9l3.75-3.75M12 9l-3.75-3.75m9.344 10.301c1.36-.066 2.428-1.196 2.428-2.574V5.25m0 8.526c0 1.378-1.068 2.508-2.428 2.574M19.594 13.776V5.25m0 0a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v8.526c0 1.378 1.068 2.508 2.428 2.574" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Delete Customer
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete <span className="font-medium">{customerToDelete?.name}</span>? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={handleDeleteCustomer}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">Customer Management</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Customers</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{customers.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Customers</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">{customers.filter(c => c.is_active !== false).length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">New This Month</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">0</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Total Revenue</h2>
          <p className="text-3xl font-bold text-orange-600 mt-2">$0</p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search Customers"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[CustomerManagement] Filter clicked');
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              console.log('[CustomerManagement] Add Customer clicked');
              setIsCreating(true);
              setShowCustomerDetails(false);
              setSelectedCustomer(null);
              setIsEditing(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showCustomerDetails && selectedCustomer ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">
              {selectedCustomer.business_name || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || selectedCustomer.email}
            </h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        first_name: '',
                        last_name: '',
                        business_name: '',
                        email: '',
                        phone: '',
                        address: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        country: '',
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditCustomer(selectedCustomer)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setCustomerToDelete(selectedCustomer);
                      setDeleteDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowCustomerDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderCustomerForm() : renderCustomerDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create New Customer</h2>
          {renderCustomerForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderCustomersTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default CustomerManagement; 