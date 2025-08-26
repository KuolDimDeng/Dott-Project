'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { toast } from 'react-hot-toast';
import { customerApi } from '@/utils/apiClient';
import { getCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import DeleteConfirmationDialog from '@/components/ui/DeleteConfirmationDialog';
import { canDeleteItem } from '@/utils/accountingRestrictions';

import StandardSpinner, { ButtonSpinner, CenteredSpinner } from '@/components/ui/StandardSpinner';
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
    const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
    const [isSendingPaymentLink, setIsSendingPaymentLink] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [autopayEnabled, setAutopayEnabled] = useState(false);
    const [isUpdatingAutopay, setIsUpdatingAutopay] = useState(false);
    
    // Location dropdown states
    const [countries, setCountries] = useState([]);
    const [billingStates, setBillingStates] = useState([]);
    const [billingCounties, setBillingCounties] = useState([]);
    const [shippingStates, setShippingStates] = useState([]);
    const [shippingCounties, setShippingCounties] = useState([]);
    const [locationLoading, setLocationLoading] = useState(false);
  
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
    billing_county: '',
    zip_code: '',
    country: '',
    notes: '',
    // Tax exemption fields
    is_tax_exempt: false,
    tax_exempt_certificate: '',
    tax_exempt_expiry: '',
    // Shipping address fields
    shipping_street: '',
    shipping_city: '',
    shipping_state: '',
    shipping_county: '',
    shipping_postcode: '',
    shipping_country: ''
  });

  useEffect(() => {
    isMounted.current = true;
    fetchCustomers();
    fetchCountries();
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

  // Fetch countries for dropdown
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/taxes/location/countries/', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('[CustomerManagement] Error fetching countries:', error);
    }
  };

  // Fetch states for a country
  const fetchStates = async (country, type = 'billing') => {
    if (!country) return;
    
    try {
      setLocationLoading(true);
      const response = await fetch(`/api/taxes/location/states/?country=${country}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (type === 'billing') {
          setBillingStates(data.states || []);
          setBillingCounties([]); // Reset counties when country changes
        } else {
          setShippingStates(data.states || []);
          setShippingCounties([]); // Reset counties when country changes
        }
      }
    } catch (error) {
      console.error('[CustomerManagement] Error fetching states:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle sending payment setup link
  const handleSendPaymentSetupLink = async (customer) => {
    if (!customer.email) {
      toast.error('Customer email is required to send payment setup link');
      return;
    }

    setIsSendingPaymentLink(true);
    try {
      const response = await fetch('/api/payments/send-setup-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customer.id,
          customer_email: customer.email,
          customer_name: customer.business_name || `${customer.first_name} ${customer.last_name}`,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send payment setup link');
      }

      const data = await response.json();
      toast.success('Payment setup link sent successfully!');
      
      // Optionally show the link in a dialog for manual sharing
      if (data.payment_link_url) {
        console.log('[CustomerManagement] Payment link created:', data.payment_link_url);
      }
    } catch (error) {
      console.error('[CustomerManagement] Error sending payment setup link:', error);
      toast.error(error.message || 'Failed to send payment setup link');
    } finally {
      setIsSendingPaymentLink(false);
    }
  };

  // Fetch customer payment methods
  const fetchPaymentMethods = async (customerId) => {
    try {
      const response = await fetch(`/api/payments/customer/${customerId}/payment-methods`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (error) {
      console.error('[CustomerManagement] Error fetching payment methods:', error);
    }
  };

  // Handle autopay toggle
  const handleAutopayToggle = async (customer) => {
    setIsUpdatingAutopay(true);
    const newAutopayStatus = !autopayEnabled;
    
    try {
      const response = await fetch(`/api/customers/${customer.id}/autopay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          autopay_enabled: newAutopayStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update autopay setting');
      }

      setAutopayEnabled(newAutopayStatus);
      toast.success(`Autopay ${newAutopayStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('[CustomerManagement] Error updating autopay:', error);
      toast.error('Failed to update autopay setting');
    } finally {
      setIsUpdatingAutopay(false);
    }
  };

  // Fetch counties for a state
  const fetchCounties = async (country, state, type = 'billing') => {
    if (!country || !state) return;
    
    try {
      setLocationLoading(true);
      const response = await fetch(`/api/taxes/location/counties/?country=${country}&state=${state}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (type === 'billing') {
          setBillingCounties(data.counties || []);
        } else {
          setShippingCounties(data.counties || []);
        }
      }
    } catch (error) {
      console.error('[CustomerManagement] Error fetching counties:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle country change
  const handleCountryChange = (e, type = 'billing') => {
    const { name, value } = e.target;
    handleFormChange(e);
    
    // Fetch states for the selected country
    fetchStates(value, type);
    
    // Reset state and county when country changes
    if (type === 'billing') {
      setFormData(prev => ({ ...prev, state: '', billing_county: '' }));
    } else {
      setFormData(prev => ({ ...prev, shipping_state: '', shipping_county: '' }));
    }
  };

  // Handle state change
  const handleStateChange = (e, type = 'billing') => {
    const { name, value } = e.target;
    handleFormChange(e);
    
    // Fetch counties for the selected state
    const country = type === 'billing' ? formData.country : formData.shipping_country;
    fetchCounties(country, value, type);
    
    // Reset county when state changes
    if (type === 'billing') {
      setFormData(prev => ({ ...prev, billing_county: '' }));
    } else {
      setFormData(prev => ({ ...prev, shipping_county: '' }));
    }
  };

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

  // Handle activate/deactivate customer
  const handleToggleCustomerStatus = async (customer) => {
    const newStatus = !customer.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    console.log(`[CustomerManagement] ${action}ing customer:`, customer.id);
    
    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} customer: ${response.status}`);
      }
      
      const updatedCustomer = await response.json();
      console.log(`[CustomerManagement] Customer ${action}d:`, updatedCustomer);
      
      toast.success(`Customer ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      
      // Update the customer in the list
      setCustomers(customers.map(c => 
        c.id === customer.id ? { ...c, is_active: newStatus } : c
      ));
      
      // Update selected customer if it's the same
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, is_active: newStatus });
      }
    } catch (error) {
      console.error(`[CustomerManagement] Error ${action}ing customer:`, error);
      toast.error(`Failed to ${action} customer.`);
    }
  };

  // Handle delete customer (kept for critical cases, but prefer deactivation)
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    console.log('[CustomerManagement] Deleting customer:', customerToDelete.id);
    
    setIsDeletingCustomer(true);
    try {
      await customerApi.delete(customerToDelete.id);
      console.log('[CustomerManagement] Customer deleted successfully');
      
      toast.success('Customer deleted successfully and archived in audit trail!');
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
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Handle view customer details
  const handleViewCustomer = useCallback((customer) => {
    console.log('[CustomerManagement] Viewing customer:', customer);
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
    setIsCreating(false);
    setIsEditing(false);
    // Fetch payment methods when viewing customer
    if (customer.id) {
      fetchPaymentMethods(customer.id);
    }
  }, []);

  // Handle edit customer
  const handleEditCustomer = useCallback(async (customer) => {
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
      billing_county: customer.billing_county || '',
      zip_code: customer.zip_code || '',
      country: customer.country || '',
      notes: customer.notes || '',
      // Tax exemption fields
      is_tax_exempt: customer.is_tax_exempt || false,
      tax_exempt_certificate: customer.tax_exempt_certificate || '',
      tax_exempt_expiry: customer.tax_exempt_expiry || '',
      // Shipping address fields
      shipping_street: customer.shipping_street || '',
      shipping_city: customer.shipping_city || '',
      shipping_state: customer.shipping_state || '',
      shipping_county: customer.shipping_county || '',
      shipping_postcode: customer.shipping_postcode || '',
      shipping_country: customer.shipping_country || ''
    });
    
    // Pre-fetch states for selected countries
    if (customer.country) {
      await fetchStates(customer.country, 'billing');
      if (customer.state) {
        await fetchCounties(customer.country, customer.state, 'billing');
      }
    }
    
    if (customer.shipping_country) {
      await fetchStates(customer.shipping_country, 'shipping');
      if (customer.shipping_state) {
        await fetchCounties(customer.shipping_country, customer.shipping_state, 'shipping');
      }
    }
    
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <select
                name="state"
                value={formData.state}
                onChange={(e) => handleStateChange(e, 'billing')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.country || locationLoading}
              >
                <option value="">Select State</option>
                {billingStates.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                County
              </label>
              <select
                name="billing_county"
                value={formData.billing_county}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.state || locationLoading}
              >
                <option value="">Select County</option>
                {billingCounties.map(county => (
                  <option key={county.code} value={county.code}>
                    {county.name}
                  </option>
                ))}
              </select>
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
              <select
                name="country"
                value={formData.country}
                onChange={(e) => handleCountryChange(e, 'billing')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Country</option>
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
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

        {/* Tax Exemption Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Exemption</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_tax_exempt"
                name="is_tax_exempt"
                checked={formData.is_tax_exempt}
                onChange={(e) => setFormData({...formData, is_tax_exempt: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_tax_exempt" className="ml-2 block text-sm text-gray-900">
                Customer is tax exempt
              </label>
            </div>
            
            {formData.is_tax_exempt && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Exemption Certificate
                  </label>
                  <input
                    type="text"
                    name="tax_exempt_certificate"
                    value={formData.tax_exempt_certificate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Certificate number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exemption Expiry Date
                  </label>
                  <input
                    type="date"
                    name="tax_exempt_expiry"
                    value={formData.tax_exempt_expiry}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h3>
          <p className="text-sm text-gray-500 mb-4">If different from billing address</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                name="shipping_street"
                value={formData.shipping_street}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Shipping street address"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  name="shipping_state"
                  value={formData.shipping_state}
                  onChange={(e) => handleStateChange(e, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.shipping_country || locationLoading}
                >
                  <option value="">Select State</option>
                  {shippingStates.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County
                </label>
                <select
                  name="shipping_county"
                  value={formData.shipping_county}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.shipping_state || locationLoading}
                >
                  <option value="">Select County</option>
                  {shippingCounties.map(county => (
                    <option key={county.code} value={county.code}>
                      {county.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="shipping_postcode"
                  value={formData.shipping_postcode}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  name="shipping_country"
                  value={formData.shipping_country}
                  onChange={(e) => handleCountryChange(e, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
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
                billing_county: '',
                zip_code: '',
                country: '',
                notes: '',
                // Tax exemption fields
                is_tax_exempt: false,
                tax_exempt_certificate: '',
                tax_exempt_expiry: '',
                // Shipping address fields
                shipping_street: '',
                shipping_city: '',
                shipping_state: '',
                shipping_county: '',
                shipping_postcode: '',
                shipping_country: ''
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
                <ButtonSpinner />
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
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedCustomer.is_active !== false
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedCustomer.is_active !== false ? 'Active' : 'Inactive'}
            </span>
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
          <h3 className="text-sm font-medium text-gray-500 mb-4">Payment Methods</h3>
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {method.type === 'card' && (
                      <svg className="h-5 w-5 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                    {method.type === 'bank_account' && (
                      <svg className="h-5 w-5 mr-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {method.type === 'card' ? `${method.brand} •••• ${method.last4}` : `Bank Account •••• ${method.last4}`}
                      </p>
                      {method.exp_month && method.exp_year && (
                        <p className="text-xs text-gray-500">Expires {method.exp_month}/{method.exp_year}</p>
                      )}
                    </div>
                  </div>
                  {method.is_default && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Default</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="mt-2 text-sm text-gray-900">No payment methods on file</p>
              <p className="mt-1 text-xs text-gray-500">Send a payment setup link to add payment methods</p>
              <button
                onClick={() => handleSendPaymentSetupLink(selectedCustomer)}
                disabled={isSendingPaymentLink}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSendingPaymentLink ? (
                  <>
                    <ButtonSpinner />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
                    </svg>
                    Send Payment Setup Link
                  </>
                )}
              </button>
            </div>
          )}
          {paymentMethods.length > 0 && (
            <>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Automatic Payments</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically charge customer for recurring services
                    </p>
                  </div>
                  <button
                    onClick={() => handleAutopayToggle(selectedCustomer)}
                    disabled={isUpdatingAutopay}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      autopayEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        autopayEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {autopayEnabled && (
                  <div className="mt-3 text-xs text-gray-600">
                    ✓ Customer will be automatically charged for recurring services
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleSendPaymentSetupLink(selectedCustomer)}
                  disabled={isSendingPaymentLink}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSendingPaymentLink ? (
                    <>
                      <ButtonSpinner />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Payment Method
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
        
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
      return <CenteredSpinner size="large" text="Loading customers..." showText={true} minHeight="h-screen" />;
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
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
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
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  customer.is_active !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {customer.is_active !== false ? 'Active' : 'Inactive'}
                </span>
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
                  onClick={() => handleToggleCustomerStatus(customer)}
                  className={`${
                    customer.is_active !== false
                      ? 'text-orange-600 hover:text-orange-900'
                      : 'text-green-600 hover:text-green-900'
                  }`}
                  title={customer.is_active !== false ? 'Deactivate Customer' : 'Activate Customer'}
                >
                  {customer.is_active !== false ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Delete confirmation dialog
  const renderDeleteDialog = () => {
    if (!customerToDelete) return null;
    
    // Check if customer has related transactions
    // Use default values of 0 if the fields are not present
    const invoicesCount = customerToDelete.invoices_count || 0;
    const estimatesCount = customerToDelete.estimates_count || 0;
    const paymentsCount = customerToDelete.payments_count || 0;
    
    const customerWithTransactions = {
      ...customerToDelete,
      has_transactions: invoicesCount > 0 || estimatesCount > 0 || paymentsCount > 0
    };
    
    const deletionCheck = canDeleteItem('customers', customerWithTransactions);
    
    // Build related records message
    let relatedRecordsMessage = '';
    const relatedRecords = [];
    if (invoicesCount > 0) {
      relatedRecords.push(`${invoicesCount} invoice(s)`);
    }
    if (estimatesCount > 0) {
      relatedRecords.push(`${estimatesCount} estimate(s)`);
    }
    if (paymentsCount > 0) {
      relatedRecords.push(`${paymentsCount} payment(s)`);
    }
    
    if (relatedRecords.length > 0) {
      relatedRecordsMessage = `This customer has ${relatedRecords.join(', ')}. These records will be archived but not deleted.`;
    }
    
    const customerDisplayName = customerToDelete.business_name || 
                               `${customerToDelete.first_name || ''} ${customerToDelete.last_name || ''}`.trim() || 
                               customerToDelete.email;
    
    return (
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteCustomer}
        itemName={customerDisplayName}
        itemType="Customer"
        isDeleting={isDeletingCustomer}
        hasRelatedRecords={relatedRecords.length > 0}
        relatedRecordsMessage={relatedRecordsMessage}
        customWarning={deletionCheck.warning}
        accountingRestriction={!deletionCheck.allowed ? deletionCheck.message : null}
      />
    );
  };

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
          Customers
        </h1>
        <p className="text-gray-600 text-sm">
          Maintain your customer database with contact information, billing details, and purchase history. Organize customers by type and track their account status.
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Customers</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{customers.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Customers</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {customers.filter(c => c.is_active !== false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Inactive Customers</h2>
          <p className="text-3xl font-bold text-gray-600 mt-2">
            {customers.filter(c => c.is_active === false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">New This Month</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">0</p>
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
                    onClick={() => handleToggleCustomerStatus(selectedCustomer)}
                    className={`px-4 py-2 rounded-md text-white transition-colors ${
                      selectedCustomer.is_active !== false
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {selectedCustomer.is_active !== false ? 'Deactivate' : 'Activate'}
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