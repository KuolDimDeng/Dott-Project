'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DynamicStripeProvider } from '@/components/payment/DynamicStripeProvider';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { CreditCardIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Initialize Stripe with the publishable key (moved inside component for better error handling)

// Card element options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

// Payment form component
const PaymentForm = ({ invoices, customers }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'credit_card',
    reference: '',
    notes: '',
    customerEmail: ''
  });

  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Payment methods
  const paymentMethods = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'online_payment', label: 'Online Payment' },
    { value: 'other', label: 'Other' }
  ];

  // Update amount when invoice is selected
  useEffect(() => {
    if (formData.invoiceId) {
      const invoice = invoices.find(inv => inv.id === parseInt(formData.invoiceId));
      if (invoice) {
        setFormData(prev => ({ ...prev, amount: invoice.balance.toString() }));
      }
    }
  }, [formData.invoiceId, invoices]);

  // Update email when customer is selected
  useEffect(() => {
    if (formData.customerId) {
      const customer = customers.find(c => c.id === parseInt(formData.customerId));
      if (customer) {
        setFormData(prev => ({ ...prev, customerEmail: customer.email || '' }));
      }
    }
  }, [formData.customerId, customers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear messages on input change
    setError(null);
    setSuccessMessage('');
  };

  const processStripePayment = async () => {
    if (!stripe || !elements) {
      throw new Error('Stripe has not loaded yet');
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      throw new Error('Card element not found');
    }

    logger.debug('[ReceivePayments] Creating payment intent for amount:', formData.amount);
    
    // Create payment intent on the server
    const response = await fetch('/api/payments/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(parseFloat(formData.amount) * 100), // Convert to cents
        currency: 'usd',
        customerId: formData.customerId,
        invoiceId: formData.invoiceId,
        metadata: {
          customerId: formData.customerId,
          invoiceId: formData.invoiceId || '',
          reference: formData.reference || '',
          paymentDate: formData.paymentDate
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    const { clientSecret } = await response.json();

    // Confirm the payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card,
        billing_details: {
          email: formData.customerEmail,
          name: customers.find(c => c.id === parseInt(formData.customerId))?.name || 'Customer'
        }
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentIntent;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.debug('[ReceivePayments] Submitting payment:', formData);
    
    // Validation
    if (!formData.customerId) {
      setError('Please select a customer');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.paymentDate) {
      setError('Please select a payment date');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let paymentResult = null;
      
      // Process based on payment method
      if (formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card') {
        setIsProcessingCard(true);
        paymentResult = await processStripePayment();
        logger.info('[ReceivePayments] Stripe payment processed successfully:', paymentResult.id);
      }
      
      // Record the payment in the database
      const recordResponse = await fetch('/api/payments/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          stripePaymentIntentId: paymentResult?.id,
          })
      });

      if (!recordResponse.ok) {
        throw new Error('Failed to record payment in database');
      }
      
      logger.info('[ReceivePayments] Payment recorded successfully');
      setSuccessMessage('Payment recorded successfully!');
      
      // Reset form
      setFormData({
        customerId: '',
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'credit_card',
        reference: '',
        notes: '',
        customerEmail: ''
      });
      
      // Clear card element
      if (elements) {
        const card = elements.getElement(CardElement);
        if (card) card.clear();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      logger.error('[ReceivePayments] Error recording payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
      setIsProcessingCard(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const showCardInput = formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <CreditCardIcon className="h-6 w-6 text-blue-600 mr-2" />
            Receive Payments
          </h1>
          <p className="text-gray-600 text-sm">Process customer payments for invoices and outstanding balances using various payment methods.</p>
        </div>
        <div className="text-sm text-gray-500">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Stripe Test Mode
          </span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Payment Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                  <FieldTooltip text="Select the customer making the payment. Customer balances are shown to help you identify the right customer." />
                </label>
                <select
                  id="customerId"
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} (Balance: {formatCurrency(customer.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Selection */}
              <div>
                <label htmlFor="invoiceId" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice (Optional)
                  <FieldTooltip text="Link this payment to a specific invoice. If no invoice is selected, it will be applied to the customer's account balance." />
                </label>
                <select
                  id="invoiceId"
                  name="invoiceId"
                  value={formData.invoiceId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.customerId}
                >
                  <option value="">Select an invoice (optional)</option>
                  {invoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number} - {formatCurrency(invoice.balance)} (Due: {invoice.dueDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                  <FieldTooltip text="Enter the payment amount in USD. For partial payments, enter less than the full invoice amount." />
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                  <FieldTooltip text="Date when the payment was received. This is used for accounting records and can be different from today's date." />
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                  <FieldTooltip text="Choose how the customer paid. Credit/Debit cards will be processed through Stripe. Other methods are recorded for tracking only." />
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                  <FieldTooltip text="Optional reference like check number, wire transfer ID, or transaction reference for your records." />
                </label>
                <input
                  type="text"
                  id="reference"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Check #, Transaction ID, etc."
                />
              </div>
            </div>

            {/* Card Element - Only show for card payments */}
            {showCardInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Details <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-md p-3">
                  <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Test card: 4242 4242 4242 4242, any future date, any CVC
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
                <FieldTooltip text="Add any additional information about this payment, such as special terms or customer communications." />
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional payment information..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    customerId: '',
                    invoiceId: '',
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'credit_card',
                    reference: '',
                    notes: '',
                    customerEmail: ''
                  });
                  setError(null);
                  setSuccessMessage('');
                  if (elements) {
                    const card = elements.getElement(CardElement);
                    if (card) card.clear();
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isLoading || !stripe}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isProcessingCard ? 'Processing Card...' : 'Recording...'}
                  </>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: ReceivePayments | Stripe: {stripe ? 'Loaded' : 'Loading...'}
      </div>
    </div>
  );
};

// Main component wrapped with Stripe Elements
const ReceivePayments = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    logger.debug('[ReceivePayments] Fetching customers for tenant:', tenantId);
    try {
      // TODO: Replace with actual API endpoint
      const mockCustomers = [
        { id: 1, name: 'ABC Corporation', balance: 5000, email: 'abc@example.com' },
        { id: 2, name: 'XYZ Limited', balance: 3500, email: 'xyz@example.com' },
        { id: 3, name: 'Tech Solutions Inc', balance: 8000, email: 'tech@example.com' },
        { id: 4, name: 'Global Services LLC', balance: 2500, email: 'global@example.com' }
      ];
      setCustomers(mockCustomers);
    } catch (err) {
      logger.error('[ReceivePayments] Error fetching customers:', err);
    }
  }, [tenantId]);

  // Fetch unpaid invoices for selected customer
  const fetchInvoices = useCallback(async (customerId) => {
    if (!customerId) {
      setInvoices([]);
      return;
    }

    logger.debug('[ReceivePayments] Fetching invoices for customer:', customerId);
    try {
      // TODO: Replace with actual API endpoint
      const mockInvoices = [
        { id: 101, number: 'INV-001', amount: 2500, balance: 2500, dueDate: '2025-01-15' },
        { id: 102, number: 'INV-002', amount: 1500, balance: 1500, dueDate: '2025-01-20' },
        { id: 103, number: 'INV-003', amount: 1000, balance: 1000, dueDate: '2025-01-10' }
      ];
      setInvoices(mockInvoices);
    } catch (err) {
      logger.error('[ReceivePayments] Error fetching invoices:', err);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <DynamicStripeProvider>
      <PaymentForm 
        invoices={invoices} 
        customers={customers}
        onCustomerChange={fetchInvoices}
      />
    </DynamicStripeProvider>
  );
};

export default ReceivePayments;
