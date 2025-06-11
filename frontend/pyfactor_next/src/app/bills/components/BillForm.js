'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import BillService from '@/services/billService';
import VendorService from '@/services/vendorService';
import { logger } from '@/utils/logger';

const BillForm = ({ bill, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalAmount: '',
    currency: 'USD',
    poso_number: '',
    notes: '',
    is_paid: false
  });
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVendors();
    
    if (bill) {
      setFormData({
        vendor_id: bill.vendor_id || '',
        bill_date: bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : '',
        due_date: bill.due_date ? new Date(bill.due_date).toISOString().split('T')[0] : '',
        totalAmount: bill.totalAmount || '',
        currency: bill.currency || 'USD',
        poso_number: bill.poso_number || '',
        notes: bill.notes || '',
        is_paid: bill.is_paid || false
      });
    }
  }, [bill]);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await VendorService.getVendors({ limit: 100 });
      if (response.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (error) {
      logger.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.vendor_id) {
      newErrors.vendor_id = 'Vendor is required';
    }
    
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }
    
    if (!formData.bill_date) {
      newErrors.bill_date = 'Bill date is required';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    
    if (formData.bill_date && formData.due_date) {
      const billDate = new Date(formData.bill_date);
      const dueDate = new Date(formData.due_date);
      if (dueDate < billDate) {
        newErrors.due_date = 'Due date must be after bill date';
      }
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
        totalAmount: parseFloat(formData.totalAmount)
      };
      
      let response;
      if (bill) {
        response = await BillService.updateBill(bill.id, dataToSubmit);
      } else {
        response = await BillService.createBill(dataToSubmit);
      }
      
      if (response.success) {
        toast.success(bill ? 'Bill updated successfully' : 'Bill created successfully');
        onSubmit();
      } else {
        toast.error(response.error || 'Failed to save bill');
      }
    } catch (error) {
      logger.error('Error saving bill:', error);
      toast.error('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {bill ? 'Edit Bill' : 'Create New Bill'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor *
              </label>
              {loadingVendors ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  Loading vendors...
                </div>
              ) : (
                <select
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.vendor_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name} ({vendor.vendor_number})
                    </option>
                  ))}
                </select>
              )}
              {errors.vendor_id && (
                <p className="mt-1 text-sm text-red-600">{errors.vendor_id}</p>
              )}
            </div>
            
            {/* Bill Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    name="bill_date"
                    value={formData.bill_date}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.bill_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.bill_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.bill_date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.due_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.due_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount}
                      onChange={handleChange}
                      step="0.01"
                      min="0.01"
                      className={`w-full pl-8 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.totalAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.totalAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.totalAmount}</p>
                  )}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO/SO Number
                  </label>
                  <input
                    type="text"
                    name="poso_number"
                    value={formData.poso_number}
                    onChange={handleChange}
                    placeholder="Purchase/Sales Order Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="space-y-4">
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
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_paid"
                      checked={formData.is_paid}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as paid</span>
                  </label>
                </div>
              </div>
            </div>
            
            {bill && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Bill Number:</span> {bill.bill_number}</p>
                    <p className="mt-1"><span className="font-medium">Created:</span> {new Date(bill.created_at).toLocaleDateString()}</p>
                    <p className="mt-1"><span className="font-medium">Last Updated:</span> {new Date(bill.updated_at).toLocaleDateString()}</p>
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
            disabled={loading || loadingVendors}
          >
            {loading ? 'Saving...' : (bill ? 'Update Bill' : 'Create Bill')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillForm;