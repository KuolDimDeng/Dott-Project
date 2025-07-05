'use client';


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supplierService } from '@/services/supplierService';
import { logger } from '@/utils/logger';
import { toast } from 'react-hot-toast';
import { getCacheValue } from @/utils/appCache';
import { getSecureTenantId } from '@/utils/tenantUtils';
import axios from 'axios';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // For mobile
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced SupplierManagement Component
 * 
 * A standalone component for managing suppliers with a design that matches
 * the ProductManagement component. Maintains the same CRUD operations with AWS RDS.
 */
function SupplierManagement() {
  // Notification functions
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);

  // Add isMounted ref to track component mounting status
  const isMounted = useRef(true);
  // Add refs for tracking network requests and timeouts
  const fetchRequestRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  // Effect to track component mount status
  useEffect(() => {
    // Set to true on mount (though it's already initialized as true)
    isMounted.current = true;
    // Cleanup function sets to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  // State for managing component behavior
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  // Initialize tenantId from AppCache
  const getTenantId = () => {
    try {
      return typeof window !== 'undefined' ? 
        getCacheValue('tenantId') || getCacheValue('businessid') || 'default' :
        'default';
    } catch (e) {
      console.error('Error accessing AppCache for tenantId:', e);
      return 'default';
    }
  };
  
  const [tenantId, setTenantId] = useState(getTenantId());

  // Fetch suppliers with secure tenant ID
  const fetchSuppliers = useCallback(async (shouldRetry = true, retryCount = 0) => {
    try {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Cancel any in-flight request
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }
      
      // Create a new AbortController
      const controller = new AbortController();
      fetchRequestRef.current = controller;
      
      // Debounce the fetch call
      fetchTimeoutRef.current = setTimeout(async () => {
        if (isMounted.current) {
          setIsLoading(true);
          setFetchError(null);
          
          try {
            // Get tenant ID securely from Cognito
            const tenantId = await getSecureTenantId();
            logger.debug('[SupplierManagement] Fetching suppliers with secure Cognito tenant ID:', tenantId);
            
            if (!tenantId) {
              logger.error('[SupplierManagement] No secure tenant ID found in Cognito, cannot fetch suppliers');
              setFetchError('Authentication error: Unable to verify your organization. Please log out and sign in again.');
              setIsLoading(false);
              return;
            }
            
            const data = await supplierService.getSuppliers();
            
            if (isMounted.current) {
              // Ensure data is an array, otherwise use an empty array
              const supplierArray = Array.isArray(data) ? data : [];
              setSuppliers(supplierArray);
              setIsLoading(false);
            }
          } catch (error) {
            // Handle only if component is still mounted and request wasn't canceled
            if (isMounted.current && !axios.isCancel(error)) {
              logger.error('Error fetching suppliers:', error);
              
              // Check for database initialization error
              if (error.response && error.response.status === 500 && 
                  error.response.data && 
                  (typeof error.response.data === 'string' ? 
                    error.response.data.includes('still initializing') : 
                    error.response.data.message && typeof error.response.data.message === 'string' && 
                    error.response.data.message.includes('still initializing'))) {
                setFetchError('Database is initializing. Please wait a moment...');
                
                // Retry with exponential backoff if needed
                if (shouldRetry && retryCount < 3) {
                  const backoffTime = Math.pow(2, retryCount) * 1000;
                  setTimeout(() => {
                    if (isMounted.current) {
                      fetchSuppliers(true, retryCount + 1);
                    }
                  }, backoffTime);
                }
              } else {
                // Get the most accurate error message available
                const errorMessage = 
                  (error.response && error.response.data && error.response.data.message) ? 
                    error.response.data.message : 
                  (error.response && error.response.data && typeof error.response.data === 'string') ?
                    error.response.data :
                  (error.message) ? 
                    error.message : 
                    'Failed to load suppliers. Please try again.';
                    
                setFetchError(errorMessage);
              }
              
              setIsLoading(false);
            }
          }
        }
      }, 300);
    } catch (error) {
      if (isMounted.current) {
        logger.error('Unexpected error in fetchSuppliers:', error);
        setFetchError('An unexpected error occurred. Please try again.');
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteSupplier = async (supplier) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      try {
        await supplierService.deleteSupplier(supplier.id);
        setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
        notifySuccess('Supplier deleted successfully');
      } catch (error) {
        logger.error('Error deleting supplier:', error);
        notifyError('Error deleting supplier');
      }
    }
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setFormState({ ...supplier });
      setIsEditing(true);
      setIsCreating(false);
      setSelectedSupplier(supplier);
    } else {
      setFormState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
      setIsEditing(false);
      setIsCreating(true);
      setSelectedSupplier(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormState({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
    });
    setIsEditing(false);
    setIsCreating(false);
    setSelectedSupplier(null);
  };

  const handleSubmit = async () => {
    try {
      const isEdit = isEditing && selectedSupplier;
      
      if (isEdit) {
        const updatedSupplier = await supplierService.updateSupplier(
          selectedSupplier.id,
          formState
        );
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
        notifySuccess('Supplier updated successfully');
      } else {
        const newSupplier = await supplierService.createSupplier(formState);
        setSuppliers(prev => [...prev, newSupplier]);
        notifySuccess('Supplier created successfully');
      }
      
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving supplier:', error);
      notifyError('Error saving supplier');
    }
  };

  // Filter suppliers based on search term
  const filteredSuppliers = searchTerm
    ? suppliers.filter(supplier => 
        (supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : suppliers;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-7xl mx-auto">
      {/* Header with title and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-0">Supplier Management</h1>
        <div className="flex flex-col sm:flex-row w-full md:w-auto space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder="Search suppliers..."
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => handleOpenDialog()}
            className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Supplier
          </button>
          <button
            onClick={fetchSuppliers}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading suppliers...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {fetchError && !isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
              <h3 className="text-red-800 dark:text-red-200 font-medium text-lg mb-2">Error Loading Suppliers</h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{fetchError}</p>
              <button 
                onClick={() => fetchSuppliers()} 
                className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && filteredSuppliers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="text-center mb-6">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                />
              </svg>
              <h3 className="text-xl font-medium text-black dark:text-white mb-2">
                {searchTerm ? `No suppliers match "${searchTerm}"` : "No Suppliers Yet"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {searchTerm 
                  ? "Try a different search term or clear the search."
                  : "You haven't added any suppliers yet. Get started by clicking the 'Add New Supplier' button above."}
              </p>
            </div>
            {searchTerm ? (
              <button 
                className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={() => setSearchTerm('')}
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            ) : (
              <button 
                className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={() => handleOpenDialog()}
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Supplier
              </button>
            )}
          </div>
        )}

        {/* Suppliers table */}
        {!isLoading && !fetchError && filteredSuppliers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider">Contact Person</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider">Phone</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-black dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id || `temp-${Math.random()}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black dark:text-white">{supplier.name || 'Unnamed Supplier'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {supplier.address ? 
                          (supplier.address.length > 40 ? 
                            `${supplier.address.substring(0, 40)}...` : 
                            supplier.address) : 
                          'No address'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black dark:text-white">{supplier.contact_person || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black dark:text-white">{supplier.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black dark:text-white">{supplier.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenDialog(supplier)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                        aria-label="Edit supplier"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Delete supplier"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={handleCloseDialog}
            ></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white mb-4">
                  {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center">
                        Name <span className="text-red-500">*</span>
                        <FieldTooltip 
                          text="Enter the official business name of your supplier. This name will appear on purchase orders, invoices, and reports. Be consistent with the name to maintain accurate purchase history and vendor analytics."
                          position="bottom"
                        />
                      </span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formState.name || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center">
                        Contact Person
                        <FieldTooltip 
                          text="Enter the name of your primary contact at this supplier company. This helps personalize communication and ensures you reach the right person for orders, inquiries, or issues. Include their title if known (e.g., 'John Smith - Sales Manager')."
                          position="bottom"
                        />
                      </span>
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      id="contact_person"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formState.contact_person || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center">
                        Email
                        <FieldTooltip 
                          text="Enter the primary email address for business correspondence with this supplier. This email will be used for sending purchase orders, receiving invoices, and general communication. Ensure it's monitored regularly."
                          position="bottom"
                        />
                      </span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formState.email || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center">
                        Phone
                        <FieldTooltip 
                          text="Enter the main business phone number for this supplier. Include country code for international suppliers (e.g., +1-555-123-4567). This number is used for urgent orders, delivery issues, or when email communication isn't sufficient."
                          position="bottom"
                        />
                      </span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formState.phone || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center">
                        Address
                        <FieldTooltip 
                          text="Enter the complete business address of your supplier. This information is important for shipping returns, visiting their facility, and tax documentation. Include street address, city, state/province, postal code, and country. This may differ from their billing address."
                          position="bottom"
                        />
                      </span>
                    </label>
                    <textarea
                      name="address"
                      id="address"
                      rows="3"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formState.address || ''}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  onClick={handleSubmit}
                >
                  {isEditing ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto"
                  onClick={handleCloseDialog}
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
}

export default SupplierManagement; 