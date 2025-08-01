'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import VendorService from '@/services/vendorService';
import { logger } from '@/utils/logger';

const VendorForm = ({ vendor, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    street: '',
    postcode: '',
    city: '',
    state: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendor_name: vendor.vendor_name || '',
        street: vendor.street || '',
        postcode: vendor.postcode || '',
        city: vendor.city || '',
        state: vendor.state || '',
        phone: vendor.phone || ''
      });
    }
  }, [vendor]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.vendor_name.trim()) {
      newErrors.vendor_name = 'Vendor name is required';
    }
    
    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let response;
      if (vendor) {
        response = await VendorService.updateVendor(vendor.id, formData);
      } else {
        response = await VendorService.createVendor(formData);
      }
      
      if (response.success) {
        toast.success(vendor ? 'Vendor updated successfully' : 'Vendor created successfully');
        onSubmit();
      } else {
        toast.error(response.error || 'Failed to save vendor');
      }
    } catch (error) {
      logger.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {vendor ? 'Edit Vendor' : 'Create New Vendor'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    name="vendor_name"
                    value={formData.vendor_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.vendor_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.vendor_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.vendor_name}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.street && (
                    <p className="mt-1 text-sm text-red-600">{errors.street}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.postcode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.postcode && (
                      <p className="mt-1 text-sm text-red-600">{errors.postcode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {vendor && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Vendor Number:</span> {vendor.vendor_number}</p>
                    <p className="mt-1"><span className="font-medium">Created:</span> {new Date(vendor.created_at).toLocaleDateString()}</p>
                    <p className="mt-1"><span className="font-medium">Last Updated:</span> {new Date(vendor.updated_at).toLocaleDateString()}</p>
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
            {loading ? 'Saving...' : (vendor ? 'Update Vendor' : 'Create Vendor')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorForm;