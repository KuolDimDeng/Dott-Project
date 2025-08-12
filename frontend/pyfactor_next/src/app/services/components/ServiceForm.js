'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ServiceService from '@/services/serviceManagementService';
import { logger } from '@/utils/logger';

const ServiceForm = ({ service, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    is_recurring: false,
    is_for_sale: true,
    is_for_rent: false,
    salestax: '0',
    charge_period: 'day',
    charge_amount: '0',
    height: '',
    width: '',
    height_unit: 'cm',
    width_unit: 'cm',
    weight: '',
    weight_unit: 'kg'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        price: service.price || '',
        duration: service.duration || '',
        is_recurring: service.is_recurring || false,
        is_for_sale: service.is_for_sale !== undefined ? service.is_for_sale : true,
        is_for_rent: service.is_for_rent || false,
        salestax: service.salestax || '0',
        charge_period: service.charge_period || 'day',
        charge_amount: service.charge_amount || '0',
        height: service.height || '',
        width: service.width || '',
        height_unit: service.height_unit || 'cm',
        width_unit: service.width_unit || 'cm',
        weight: service.weight || '',
        weight_unit: service.weight_unit || 'kg'
      });
    }
  }, [service]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }
    
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) {
      newErrors.price = 'Price must be a valid positive number';
    }
    
    if (formData.salestax && (isNaN(formData.salestax) || parseFloat(formData.salestax) < 0 || parseFloat(formData.salestax) > 100)) {
      newErrors.salestax = 'Sales tax must be between 0 and 100';
    }
    
    if (formData.charge_amount && (isNaN(formData.charge_amount) || parseFloat(formData.charge_amount) < 0)) {
      newErrors.charge_amount = 'Charge amount must be a valid positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      const dataToSubmit = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
        salestax: formData.salestax ? parseFloat(formData.salestax) : 0,
        charge_amount: formData.charge_amount ? parseFloat(formData.charge_amount) : 0,
        height: formData.height ? parseFloat(formData.height) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };
      
      let response;
      if (service) {
        response = await ServiceService.updateService(service.id, dataToSubmit);
      } else {
        response = await ServiceService.createService(dataToSubmit);
      }
      
      if (response.success) {
        toast.success(service ? 'Service updated successfully' : 'Service created successfully');
        onSubmit();
      } else {
        toast.error(response.error || 'Failed to save service');
      }
    } catch (error) {
      logger.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {service ? 'Edit Service' : 'Create New Service'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Service Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Options</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Recurring Service</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_for_sale"
                    checked={formData.is_for_sale}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Available for Sale</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_for_rent"
                    checked={formData.is_for_rent}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Available for Rent</span>
                </label>
              </div>
            </div>
            
            {/* Pricing & Tax */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Tax</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Tax (%)
                  </label>
                  <input
                    type="number"
                    name="salestax"
                    value={formData.salestax}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.salestax ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.salestax && (
                    <p className="mt-1 text-sm text-red-600">{errors.salestax}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Charge Period
                  </label>
                  <select
                    name="charge_period"
                    value={formData.charge_period}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Charge Amount
                  </label>
                  <input
                    type="number"
                    name="charge_amount"
                    value={formData.charge_amount}
                    onChange={handleChange}
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.charge_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.charge_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.charge_amount}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Physical Dimensions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Physical Dimensions (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      name="height_unit"
                      value={formData.height_unit}
                      onChange={handleChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      name="width_unit"
                      value={formData.width_unit}
                      onChange={handleChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      name="weight_unit"
                      value={formData.weight_unit}
                      onChange={handleChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Duration
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 1 hour, 30 minutes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            {loading ? 'Saving...' : (service ? 'Update Service' : 'Create Service')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;