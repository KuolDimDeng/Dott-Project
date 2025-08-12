'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DynamicStripeProvider } from '@/components/payment/DynamicStripeProvider';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { CreditCardIcon, QuestionMarkCircleIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

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

// M-Pesa input component
const MpesaInput = ({ phoneNumber, setPhoneNumber, isProcessing }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        M-Pesa Phone Number <span className="text-red-500">*</span>
        <FieldTooltip text="Enter the M-Pesa registered phone number in format: 254XXXXXXXXX (Kenya country code required)" />
      </label>
      <div className="relative">
        <DevicePhoneMobileIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="254712345678"
          pattern="254[0-9]{9}"
          required
          disabled={isProcessing}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        🇰🇪 Kenya format: 254XXXXXXXXX
      </p>
    </div>
  </div>
);

// Bank Transfer input component
const BankTransferInput = ({ accountInfo, setAccountInfo, isProcessing }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={accountInfo.accountNumber}
          onChange={(e) => setAccountInfo(prev => ({...prev, accountNumber: e.target.value}))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isProcessing}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Routing Number
        </label>
        <input
          type="text"
          value={accountInfo.routingNumber}
          onChange={(e) => setAccountInfo(prev => ({...prev, routingNumber: e.target.value}))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isProcessing}
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Bank Name <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={accountInfo.bankName}
        onChange={(e) => setAccountInfo(prev => ({...prev, bankName: e.target.value}))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        disabled={isProcessing}
      />
    </div>
  </div>
);

// Payment form component
const PaymentForm = ({ invoices, customers }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [bankAccountInfo, setBankAccountInfo] = useState({
    accountNumber: '',
    routingNumber: '',
    bankName: ''
  });
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

  // Enhanced payment methods with regional support
  const paymentMethods = [
    { value: 'credit_card', label: 'Credit Card', icon: '💳', description: 'Visa, Mastercard, Amex' },
    { value: 'debit_card', label: 'Debit Card', icon: '💳', description: 'Bank debit cards' },
    { value: 'mpesa', label: 'M-Pesa', icon: '📱', description: 'Mobile money (Kenya)', country: 'KE' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', description: 'ACH/Wire transfer' },
    { value: 'flutterwave', label: 'Flutterwave', icon: '🌟', description: 'Multi-method (Africa)' },
    { value: 'cash', label: 'Cash', icon: '💵', description: 'Physical cash payment' },
    { value: 'check', label: 'Check', icon: '📄', description: 'Bank check' },
    { value: 'other', label: 'Other', icon: '💰', description: 'Other payment method' }
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
    logger.info('🎯 [ReceivePayments] === PROCESSING STRIPE PAYMENT ===');
    if (!stripe || !elements) {
      throw new Error('Stripe has not loaded yet');
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      throw new Error('Card element not found');
    }

    logger.debug('🎯 [ReceivePayments] Creating payment intent for amount:', formData.amount);
    
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

    logger.info('🎯 [ReceivePayments] Stripe payment intent confirmed:', result.paymentIntent.id);
    return result.paymentIntent;
  };

  const processMpesaPayment = async () => {
    logger.info('🎯 [ReceivePayments] === PROCESSING M-PESA PAYMENT ===');
    logger.debug('🎯 [ReceivePayments] M-Pesa phone number:', mpesaPhoneNumber);
    
    const response = await fetch('/api/payments/process/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gateway: 'mpesa',
        amount: parseFloat(formData.amount),
        phone_number: mpesaPhoneNumber,
        customer_id: formData.customerId,
        invoice_id: formData.invoiceId || null,
        reference: formData.reference || '',
        metadata: {
          customer_email: formData.customerEmail,
          payment_source: 'receive_payments_form'
        }
      }),
    });

    const result = await response.json();
    logger.debug('🎯 [ReceivePayments] M-Pesa API response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'M-Pesa payment failed');
    }

    logger.info('🎯 [ReceivePayments] M-Pesa payment initiated:', result.data.id);
    return result.data;
  };

  const processBankTransfer = async () => {
    logger.info('🎯 [ReceivePayments] === PROCESSING BANK TRANSFER ===');
    logger.debug('🎯 [ReceivePayments] Bank account info:', bankAccountInfo);
    
    const response = await fetch('/api/payments/process/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gateway: 'bank_transfer',
        amount: parseFloat(formData.amount),
        customer_id: formData.customerId,
        invoice_id: formData.invoiceId || null,
        reference: formData.reference || '',
        bank_details: bankAccountInfo,
        metadata: {
          customer_email: formData.customerEmail,
          payment_source: 'receive_payments_form'
        }
      }),
    });

    const result = await response.json();
    logger.debug('🎯 [ReceivePayments] Bank transfer API response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Bank transfer initiation failed');
    }

    logger.info('🎯 [ReceivePayments] Bank transfer initiated:', result.data.id);
    return result.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.info('🎯 [ReceivePayments] === PROCESSING PAYMENT ===');
    logger.debug('🎯 [ReceivePayments] Payment data:', formData);
    logger.debug('🎯 [ReceivePayments] Payment method:', formData.paymentMethod);
    
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

    // Method-specific validation
    if (formData.paymentMethod === 'mpesa' && !mpesaPhoneNumber) {
      setError('Please enter M-Pesa phone number');
      return;
    }
    if (formData.paymentMethod === 'bank_transfer' && (!bankAccountInfo.accountNumber || !bankAccountInfo.bankName)) {
      setError('Please enter bank account details');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let paymentResult = null;
      
      // Process based on payment method
      if (formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card') {
        logger.debug('🎯 [ReceivePayments] Processing Stripe payment');
        setIsProcessingCard(true);
        paymentResult = await processStripePayment();
        logger.info('🎯 [ReceivePayments] Stripe payment processed successfully:', paymentResult.id);
      } else if (formData.paymentMethod === 'mpesa') {
        logger.debug('🎯 [ReceivePayments] Processing M-Pesa payment');
        paymentResult = await processMpesaPayment();
        logger.info('🎯 [ReceivePayments] M-Pesa payment processed successfully:', paymentResult.id);
      } else if (formData.paymentMethod === 'bank_transfer') {
        logger.debug('🎯 [ReceivePayments] Processing bank transfer');
        paymentResult = await processBankTransfer();
        logger.info('🎯 [ReceivePayments] Bank transfer processed successfully:', paymentResult.id);
      } else {
        // For other payment methods, record directly without processing
        logger.debug('🎯 [ReceivePayments] Recording other payment method:', formData.paymentMethod);
        const response = await fetch('/api/payments/process/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gateway: 'manual',
            payment_method: formData.paymentMethod,
            amount: parseFloat(formData.amount),
            customer_id: formData.customerId,
            invoice_id: formData.invoiceId || null,
            reference: formData.reference || '',
            notes: formData.notes || '',
            payment_date: formData.paymentDate,
            metadata: {
              customer_email: formData.customerEmail,
              payment_source: 'receive_payments_form'
            }
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to record payment');
        }
        paymentResult = result.data;
      }
      
      logger.info('🎯 [ReceivePayments] Payment processed successfully with ID:', paymentResult?.id);
      setSuccessMessage(`Payment ${paymentResult?.status === 'pending' ? 'initiated' : 'recorded'} successfully!`);
      
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
      setMpesaPhoneNumber('');
      setBankAccountInfo({ accountNumber: '', routingNumber: '', bankName: '' });
      
      // Clear card element
      if (elements) {
        const card = elements.getElement(CardElement);
        if (card) card.clear();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      logger.error('🎯 [ReceivePayments] Error processing payment:', err);
      logger.error('🎯 [ReceivePayments] Error details:', { message: err.message, stack: err.stack });
      setError(err.message || 'Failed to process payment');
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
  const showMpesaInput = formData.paymentMethod === 'mpesa';
  const showBankTransferInput = formData.paymentMethod === 'bank_transfer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <CreditCardIcon className="h-6 w-6 text-blue-600 mr-2" />
            Receive Payments
          </h1>
          <p className="text-gray-600 text-sm">Process customer payments using multiple payment methods including cards, M-Pesa, and bank transfers.</p>
        </div>
        <div className="text-sm text-gray-500">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Multi-Gateway Support
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
            </div>

            {/* Payment Method Selection */}
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method <span className="text-red-500">*</span>
                <FieldTooltip text="Choose how the customer paid. Different methods support different processing capabilities." />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {paymentMethods.map(method => (
                  <div key={method.value} className="relative">
                    <input
                      type="radio"
                      id={method.value}
                      name="paymentMethod"
                      value={method.value}
                      checked={formData.paymentMethod === method.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor={method.value}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                        formData.paymentMethod === method.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-2xl">{method.icon}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{method.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                        {method.country && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            {method.country}
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
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

            {/* M-Pesa Input */}
            {showMpesaInput && (
              <MpesaInput 
                phoneNumber={mpesaPhoneNumber} 
                setPhoneNumber={setMpesaPhoneNumber}
                isProcessing={isLoading}
              />
            )}

            {/* Bank Transfer Input */}
            {showBankTransferInput && (
              <BankTransferInput 
                accountInfo={bankAccountInfo} 
                setAccountInfo={setBankAccountInfo}
                isProcessing={isLoading}
              />
            )}

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
                  setMpesaPhoneNumber('');
                  setBankAccountInfo({ accountNumber: '', routingNumber: '', bankName: '' });
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
                disabled={isLoading || (showCardInput && !stripe)}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <ButtonSpinner />
                    {isProcessingCard ? 'Processing Card...' : 'Processing...'}
                  </>
                ) : (
                  'Process Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: ReceivePayments Enhanced | Stripe: {stripe ? 'Loaded' : 'Loading...'}
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
    logger.info('🎯 [ReceivePayments] === FETCHING CUSTOMERS ===');
    logger.debug('🎯 [ReceivePayments] Tenant ID:', tenantId);
    try {
      const response = await fetch('/api/customers/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCustomers(result.data || []);
          logger.info('🎯 [ReceivePayments] Customers loaded from API:', result.data?.length || 0);
        } else {
          throw new Error(result.message);
        }
      } else {
        // Fallback to mock data
        logger.warn('🎯 [ReceivePayments] API failed, using mock customers');
        const mockCustomers = [
          { id: 1, name: 'ABC Corporation', balance: 5000, email: 'abc@example.com' },
          { id: 2, name: 'XYZ Limited', balance: 3500, email: 'xyz@example.com' },
          { id: 3, name: 'Tech Solutions Inc', balance: 8000, email: 'tech@example.com' },
          { id: 4, name: 'Global Services LLC', balance: 2500, email: 'global@example.com' }
        ];
        setCustomers(mockCustomers);
      }
    } catch (err) {
      logger.error('🎯 [ReceivePayments] Error fetching customers:', err);
      // Use mock data as fallback
      const mockCustomers = [
        { id: 1, name: 'ABC Corporation', balance: 5000, email: 'abc@example.com' },
        { id: 2, name: 'XYZ Limited', balance: 3500, email: 'xyz@example.com' },
        { id: 3, name: 'Tech Solutions Inc', balance: 8000, email: 'tech@example.com' },
        { id: 4, name: 'Global Services LLC', balance: 2500, email: 'global@example.com' }
      ];
      setCustomers(mockCustomers);
    }
  }, [tenantId]);

  // Fetch unpaid invoices
  const fetchInvoices = useCallback(async () => {
    logger.info('🎯 [ReceivePayments] === FETCHING INVOICES ===');
    logger.debug('🎯 [ReceivePayments] Tenant ID:', tenantId);
    try {
      const response = await fetch('/api/invoices/?status=unpaid', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvoices(result.data || []);
          logger.info('🎯 [ReceivePayments] Invoices loaded from API:', result.data?.length || 0);
        } else {
          throw new Error(result.message);
        }
      } else {
        // Fallback to mock data
        logger.warn('🎯 [ReceivePayments] API failed, using mock invoices');
        const mockInvoices = [
          { id: 101, number: 'INV-001', amount: 2500, balance: 2500, dueDate: '2025-01-15' },
          { id: 102, number: 'INV-002', amount: 1500, balance: 1500, dueDate: '2025-01-20' },
          { id: 103, number: 'INV-003', amount: 1000, balance: 1000, dueDate: '2025-01-10' }
        ];
        setInvoices(mockInvoices);
      }
    } catch (err) {
      logger.error('🎯 [ReceivePayments] Error fetching invoices:', err);
      // Use mock data as fallback
      const mockInvoices = [
        { id: 101, number: 'INV-001', amount: 2500, balance: 2500, dueDate: '2025-01-15' },
        { id: 102, number: 'INV-002', amount: 1500, balance: 1500, dueDate: '2025-01-20' },
        { id: 103, number: 'INV-003', amount: 1000, balance: 1000, dueDate: '2025-01-10' }
      ];
      setInvoices(mockInvoices);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchCustomers();
      fetchInvoices();
    }
  }, [tenantId, fetchCustomers, fetchInvoices]);
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <DynamicStripeProvider>
      <PaymentForm 
        invoices={invoices} 
        customers={customers}
      />
    </DynamicStripeProvider>
  );
};

export default ReceivePayments;