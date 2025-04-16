import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Updated import for Next.js 14
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import ModernFormLayout from '@/app/components/ModernFormLayout';
import { getCacheValue } from '@/utils/appCache';
import { getTenantId } from '@/utils/tenantUtils';

const initialState = {
  customerName: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  website: '',
  notes: '',
  currency: 'USD',
  billingCountry: '',
  billingState: '',
  shipToName: '',
  shippingCountry: '',
  shippingState: '',
  shippingPhone: '',
  deliveryInstructions: '',
  street: '',
  postcode: '',
  city: '',
  address: '',
};

// Supported modes: 'create' (new customer) or 'edit' (update existing customer)
const CustomerForm = ({ mode = 'create', customerId, onBackToList, onCustomerCreated, onCustomerUpdated }) => {
  const router = useRouter(); // Using the Next.js 14 App Router
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(mode === 'edit');
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    // Get tenant ID on component mount
    const fetchTenantId = async () => {
      try {
        // First try to get from cache for better performance
        let tid = getCacheValue('tenantId');
        
        // If not in cache, use the utility function
        if (!tid) {
          tid = await getTenantId();
        }
        
        if (tid) {
          setTenantId(tid);
          logger.info('[CustomerForm] Got tenant ID:', tid);
        } else {
          logger.warn('[CustomerForm] No tenant ID found');
        }
      } catch (err) {
        logger.error('[CustomerForm] Error getting tenant ID:', err);
      }
    };
    
    fetchTenantId();
  }, []);

  // Load customer data if we're in edit mode
  useEffect(() => {
    if (mode === 'edit' && customerId) {
      const fetchCustomer = async () => {
        setIsLoadingCustomer(true);
        try {
          const response = await axiosInstance.get(`/api/customers/${customerId}`);
          const customerData = response.data;
          logger.info('[CustomerForm] Loaded customer data for editing:', customerData);
          
          // Map database fields to form fields
          setFormData({
            ...initialState,
            customerName: customerData.customer_name || '',
            first_name: customerData.first_name || '',
            last_name: customerData.last_name || '',
            email: customerData.email || '',
            phone: customerData.phone || '',
            website: customerData.website || '',
            notes: customerData.notes || '',
            address: customerData.address || '',
            city: customerData.city || '',
            billingCountry: customerData.billing_country || customerData.billingCountry || '',
            billingState: customerData.billing_state || customerData.billingState || '',
            postcode: customerData.postcode || '',
          });
        } catch (error) {
          logger.error('[CustomerForm] Error loading customer data:', error);
          toast.error('Failed to load customer data');
          setError('Failed to load customer data');
        } finally {
          setIsLoadingCustomer(false);
        }
      };
      
      fetchCustomer();
    }
  }, [mode, customerId, toast]);

  useEffect(() => {
    logger.info(`[CustomerForm] Component mounted in ${mode} mode`);
  }, [router, mode]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      
      // The backend API uses Row Level Security (RLS) to automatically associate
      // the customer with the correct tenant using the JWT token
      logger.info(`[CustomerForm] Submitting customer data for RLS-secured API in ${mode} mode`);
      
      try {
        // Format customer data for the API
        const customerData = {
          ...formData,
          // Format object_name to match database field if needed
          customer_name: formData.customerName || `${formData.first_name} ${formData.last_name}`,
          // Add tenant_id explicitly to ensure it's available in the request
          tenant_id: tenantId
        };
        
        logger.info(`Creating customer with tenant ID: ${tenantId}`);
        
        let response;
        
        if (mode === 'edit' && customerId) {
          // Update existing customer
          response = await axiosInstance.put(`/api/customers/${customerId}`, customerData);
          
          const updatedCustomer = response.data;
          logger.info('[CustomerForm] Customer updated successfully through RLS:', updatedCustomer);
          toast.success('Customer updated successfully');
          
          // Call the callback with the updated customer data if it exists
          if (typeof onCustomerUpdated === 'function') {
            onCustomerUpdated(updatedCustomer);
          } else if (typeof onCustomerCreated === 'function') {
            // Fallback to onCustomerCreated for backward compatibility
            onCustomerCreated(updatedCustomer);
          } else {
            // Legacy behavior: Navigate to the dashboard or customer details
            router.push('/dashboard/customers');
          }
        } else {
          // Create new customer
          response = await axiosInstance.post('/api/customers', customerData);
          
          const newCustomer = response.data;
          logger.info('[CustomerForm] Customer created successfully through RLS:', newCustomer);
          toast.success('Customer created successfully');
          
          // Call the callback with the new customer data if it exists
          if (typeof onCustomerCreated === 'function') {
            onCustomerCreated(newCustomer);
          } else {
            // Legacy behavior: Navigate to the dashboard or customer details
            router.push('/dashboard/customers');
          }
        }
      } catch (error) {
        logger.error(`[CustomerForm] Error ${mode === 'edit' ? 'updating' : 'creating'} customer:`, error);
        let errorMessage = `Failed to ${mode === 'edit' ? 'update' : 'create'} customer`;
        
        if (error.response) {
          logger.error('[CustomerForm] Error response:', error.response.status, error.response.data);
          errorMessage += ` (${error.response.status})`;
          if (error.response.data && error.response.data.detail) {
            errorMessage += `: ${error.response.data.detail}`;
          }
        }
        
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, mode, customerId, router, toast, onCustomerCreated, onCustomerUpdated, tenantId]
  );

  const handleCancel = () => {
    if (onBackToList && typeof onBackToList === 'function') {
      onBackToList();
    } else {
      router.back();
    }
  };

  // Basic Info Tab Content
  const renderBasicInfoTab = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2H4v-1h16v1h-1z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="Enter business name"
              required
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="w-full mt-8 mb-4">
        <h3 className="text-base font-semibold text-gray-700">
          Primary Contact
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Enter first name"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Enter last name"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </span>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              required
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </span>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(123) 456-7890"
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="www.example.com"
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="w-full mt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
          </span>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
            placeholder="Enter any additional notes about this customer"
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
      </div>
    </>
  );

  // Billing Tab Content
  const renderBillingTab = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Invoices for this customer will default to this currency.
          </p>
        </div>
      </div>
      
      <div className="w-full mt-8 mb-4">
        <h3 className="text-base font-semibold text-gray-700">
          Billing Address
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-700 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            id="billingCountry"
            name="billingCountry"
            value={formData.billingCountry}
            onChange={handleChange}
            placeholder="Enter country"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="billingState" className="block text-sm font-medium text-gray-700 mb-1">
            Province/State/Region <span className="text-red-500">*</span>
          </label>
          <input
            id="billingState"
            name="billingState"
            value={formData.billingState}
            onChange={handleChange}
            placeholder="Enter state or province"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="w-full mt-8 mb-4">
        <h3 className="text-base font-semibold text-gray-700">
          Shipping Information
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="shipToName" className="block text-sm font-medium text-gray-700 mb-1">
            Ship To Name
          </label>
          <input
            id="shipToName"
            name="shipToName"
            value={formData.shipToName}
            onChange={handleChange}
            placeholder="Enter recipient name"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            id="shippingCountry"
            name="shippingCountry"
            value={formData.shippingCountry}
            onChange={handleChange}
            placeholder="Enter country"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="shippingState" className="block text-sm font-medium text-gray-700 mb-1">
            Province/State/Region
          </label>
          <input
            id="shippingState"
            name="shippingState"
            value={formData.shippingState}
            onChange={handleChange}
            placeholder="Enter state or province"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="shippingPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Shipping Phone
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </span>
            <input
              id="shippingPhone"
              name="shippingPhone"
              value={formData.shippingPhone}
              onChange={handleChange}
              placeholder="(123) 456-7890"
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="w-full mt-6">
        <label htmlFor="deliveryInstructions" className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Instructions
        </label>
        <textarea
          id="deliveryInstructions"
          name="deliveryInstructions"
          value={formData.deliveryInstructions}
          onChange={handleChange}
          rows="4"
          placeholder="Enter special delivery instructions, if any"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
    </>
  );

  // Address Tab Content
  const renderAddressTab = () => (
    <>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </span>
            <input
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Enter street address"
              required
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Enter city"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
            Postal/ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            id="postcode"
            name="postcode"
            value={formData.postcode}
            onChange={handleChange}
            placeholder="Enter postal code"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </>
  );

  return (
    <ModernFormLayout title={mode === 'edit' ? "Edit Customer" : "New Customer"}>
      {isLoadingCustomer ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Loading customer data...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-4 py-6 bg-white rounded-lg shadow-sm">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {/* Tabs navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex w-full">
              {["Basic Information", "Billing & Shipping", "Address"].map((label, index) => (
                <button
                  key={index}
                  type="button" 
                  onClick={(e) => handleTabChange(e, index)}
                  className={`flex-1 py-4 px-4 text-center font-semibold text-base ${
                    activeTab === index
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tabs Content */}
          <div className="mt-4">
            {activeTab === 0 && renderBasicInfoTab()}
            {activeTab === 1 && renderBillingTab()}
            {activeTab === 2 && renderAddressTab()}
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end mt-8 space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {mode === 'edit' ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      )}
    </ModernFormLayout>
  );
};

export default CustomerForm;
