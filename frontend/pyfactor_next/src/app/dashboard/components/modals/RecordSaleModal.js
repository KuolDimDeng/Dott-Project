'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
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

const RecordSaleModal = ({ isOpen, onClose, onSaleRecorded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
    customer_id: '',
    amount: '',
    tax_amount: '',
    discount_amount: '',
    payment_method: 'cash',
    notes: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reference_number: '',
        description: '',
        customer_id: '',
        amount: '',
        tax_amount: '',
        discount_amount: '',
        payment_method: 'cash',
        notes: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    const amount = parseFloat(formData.amount) || 0;
    const taxAmount = parseFloat(formData.tax_amount) || 0;
    const discountAmount = parseFloat(formData.discount_amount) || 0;
    return amount + taxAmount - discountAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      logger.info('[RecordSaleModal] Recording sale with data:', formData);

      // Calculate total
      const totalAmount = calculateTotal();

      // Prepare transaction data
      const transactionData = {
        type: 'sale',
        ...formData,
        total_amount: totalAmount,
        status: 'completed'
      };

      // TODO: Replace with actual API call when backend is ready
      // await transactionApi.create(transactionData);
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('[RecordSaleModal] Sale recorded successfully');
      toast.success('Sale recorded successfully!');
      
      // Notify parent component
      if (onSaleRecorded) {
        onSaleRecorded(transactionData);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      logger.error('[RecordSaleModal] Error recording sale:', error);
      toast.error('Failed to record sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reference_number: '',
      description: '',
      customer_id: '',
      amount: '',
      tax_amount: '',
      discount_amount: '',
      payment_method: 'cash',
      notes: ''
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center"
                >
                  <ShoppingCartIcon className="h-6 w-6 text-green-600 mr-2" />
                  Record Sale
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                        <FieldTooltip text="Transaction date for accounting records" />
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reference Number
                        <FieldTooltip text="Invoice, receipt, or transaction reference number" />
                      </label>
                      <input
                        type="text"
                        name="reference_number"
                        value={formData.reference_number}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                      <FieldTooltip text="Brief description of the sale transaction" />
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer
                      <FieldTooltip text="Select the customer for this sale" />
                    </label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Customer</option>
                      <option value="1">ABC Corp</option>
                      <option value="2">XYZ Ltd</option>
                      <option value="3">Tech Solutions</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Amount
                        <FieldTooltip text="Base sale amount before tax and discounts" />
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0.01"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tax Amount
                        <FieldTooltip text="Sales tax amount if applicable" />
                      </label>
                      <input
                        type="number"
                        name="tax_amount"
                        value={formData.tax_amount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Discount
                        <FieldTooltip text="Discount amount if any" />
                      </label>
                      <input
                        type="number"
                        name="discount_amount"
                        value={formData.discount_amount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Method
                      <FieldTooltip text="How the payment was received" />
                    </label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="credit">On Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                      <FieldTooltip text="Additional notes or details about this sale" />
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Total Amount Display */}
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Total Amount:</span>
                      <span className="text-lg font-bold text-green-900">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Accounting Preview */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Accounting Entry Preview</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Debit: Cash/Accounts Receivable - ${formData.amount || '0.00'}</div>
                      <div>Credit: Sales Revenue - ${formData.amount || '0.00'}</div>
                      {formData.tax_amount && (
                        <div>Credit: Sales Tax Payable - ${formData.tax_amount}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => { onClose(); resetForm(); }}
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Recording...
                        </>
                      ) : (
                        'Record Sale'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default RecordSaleModal;