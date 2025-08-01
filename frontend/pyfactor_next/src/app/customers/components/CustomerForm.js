'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import CustomerService from '@/services/customerService';
import { logger } from '@/utils/logger';

const CustomerForm = ({ customer, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    // Name and Contact
    business_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    website: '',
    currency: 'USD',
    
    // Billing Address
    street: '',
    city: '',
    billing_state: '',
    postcode: '',
    billing_country: '',
    
    // Shipping Address
    ship_to_name: '',
    shipping_phone: '',
    shipping_state: '',
    shipping_country: '',
    delivery_instructions: '',
    
    // Additional Info
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customerType, setCustomerType] = useState('business'); // 'business' or 'individual'

  useEffect(() => {
    if (customer) {
      setFormData({
        business_name: customer.business_name || '',
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        website: customer.website || '',
        currency: customer.currency || 'USD',
        street: customer.street || '',
        city: customer.city || '',
        billing_state: customer.billing_state || '',
        postcode: customer.postcode || '',
        billing_country: customer.billing_country || '',
        ship_to_name: customer.ship_to_name || '',
        shipping_phone: customer.shipping_phone || '',
        shipping_state: customer.shipping_state || '',
        shipping_country: customer.shipping_country || '',
        delivery_instructions: customer.delivery_instructions || '',
        notes: customer.notes || ''
      });
      
      // Determine customer type based on existing data
      if (customer.business_name) {
        setCustomerType('business');
      } else {
        setCustomerType('individual');
      }
    }
  }, [customer]);

  const validateForm = () => {
    const newErrors = {};
    
    if (customerType === 'business') {
      if (!formData.business_name) {
        newErrors.business_name = 'Business name is required';
      }
    } else {
      if (!formData.first_name) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.last_name) {
        newErrors.last_name = 'Last name is required';
      }
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.city) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.billing_country) {
      newErrors.billing_country = 'Country is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    // Clear name fields when switching type
    if (type === 'business') {
      setFormData(prev => ({
        ...prev,
        first_name: '',
        last_name: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        business_name: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate customer_name based on type
      let customer_name = '';
      if (customerType === 'business') {
        customer_name = formData.business_name;
      } else {
        customer_name = `${formData.first_name} ${formData.last_name}`.trim();
      }
      
      const dataToSubmit = {
        ...formData,
        customer_name,
        company_name: formData.business_name // For compatibility with estimates/invoices
      };
      
      let response;
      if (customer) {
        response = await CustomerService.updateCustomer(customer.id, dataToSubmit);
      } else {
        response = await CustomerService.createCustomer(dataToSubmit);
      }
      
      if (response.success) {
        toast.success(customer ? 'Customer updated successfully' : 'Customer created successfully');
        onSubmit();
      } else {
        toast.error(response.error || 'Failed to save customer');
      }
    } catch (error) {
      logger.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {customer ? 'Edit Customer' : 'Create New Customer'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Customer Type Selection */}
            {!customer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="business"
                      checked={customerType === 'business'}
                      onChange={() => handleCustomerTypeChange('business')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Business</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={customerType === 'individual'}
                      onChange={() => handleCustomerTypeChange('individual')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Individual</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerType === 'business' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.business_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.business_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.business_name}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.first_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.first_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.last_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.last_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                      )}
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    name="billing_state"
                    value={formData.billing_state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="billing_country"
                    value={formData.billing_country}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.billing_country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.billing_country && (
                    <p className="mt-1 text-sm text-red-600">{errors.billing_country}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Shipping Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ship To Name
                  </label>
                  <input
                    type="text"
                    name="ship_to_name"
                    value={formData.ship_to_name}
                    onChange={handleChange}
                    placeholder="If different from customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Phone
                  </label>
                  <input
                    type="tel"
                    name="shipping_phone"
                    value={formData.shipping_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping State
                  </label>
                  <input
                    type="text"
                    name="shipping_state"
                    value={formData.shipping_state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Country
                  </label>
                  <input
                    type="text"
                    name="shipping_country"
                    value={formData.shipping_country}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Instructions
                  </label>
                  <textarea
                    name="delivery_instructions"
                    value={formData.delivery_instructions}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {customer && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Account Number:</span> {customer.account_number}</p>
                    <p className="mt-1"><span className="font-medium">Total Revenue:</span> ${customer.total_revenue?.toFixed(2) || '0.00'}</p>
                    <p className="mt-1"><span className="font-medium">Created:</span> {new Date(customer.created_at).toLocaleDateString()}</p>
                    <p className="mt-1"><span className="font-medium">Last Updated:</span> {new Date(customer.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : (customer ? 'Update Customer' : 'Create Customer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;