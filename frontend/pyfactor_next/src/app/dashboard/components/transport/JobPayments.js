'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CreditCardIcon, 
  PhoneIcon, 
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/currencyFormatter';
import { useCurrency } from '@/context/CurrencyContext';

const JobPayments = () => {
  const { currency } = useCurrency();
  const [activeJob, setActiveJob] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Mock data - replace with API calls
  useEffect(() => {
    // Simulate active job
    setActiveJob({
      id: 'TRIP-000123',
      customer: {
        name: 'ABC Logistics',
        phone: '+254712345678',
        email: 'orders@abclogistics.com'
      },
      origin: 'Nairobi, Kenya',
      destination: 'Mombasa, Kenya',
      stops: 3,
      agreedRate: 15000,
      currency: 'KES',
      distance: '485 km',
      status: 'completed'
    });

    // Simulate payment history
    setPaymentHistory([
      {
        id: '1',
        tripId: 'TRIP-000122',
        amount: 8500,
        currency: 'KES',
        method: 'M_PESA',
        status: 'completed',
        date: '2025-01-15',
        customer: 'XYZ Transport'
      },
      {
        id: '2', 
        tripId: 'TRIP-000121',
        amount: 12000,
        currency: 'KES',
        method: 'STRIPE',
        status: 'completed',
        date: '2025-01-14',
        customer: 'Quick Delivery Co'
      }
    ]);
  }, []);

  const paymentMethods = [
    {
      id: 'STRIPE',
      name: 'Credit/Debit Card',
      icon: CreditCardIcon,
      description: 'Visa, Mastercard, American Express',
      fee: '3.0% + $0.60',
      color: 'bg-blue-500'
    },
    {
      id: 'M_PESA',
      name: 'M-Pesa',
      icon: PhoneIcon,
      description: 'Mobile money payment',
      fee: '2.0%',
      color: 'bg-green-500'
    },
    {
      id: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      icon: BanknotesIcon,
      description: 'Direct bank transfer',
      fee: '0.1% + $0.30',
      color: 'bg-purple-500'
    },
    {
      id: 'CASH',
      name: 'Cash Payment',
      icon: BanknotesIcon,
      description: 'Physical cash payment',
      fee: 'No fees',
      color: 'bg-gray-500'
    }
  ];

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method.id);
    setPaymentAmount(activeJob?.agreedRate?.toString() || '');
    
    if (activeJob?.customer) {
      setCustomerPhone(activeJob.customer.phone || '');
      setCustomerEmail(activeJob.customer.email || '');
    }
  };

  const calculatePlatformFee = () => {
    const amount = parseFloat(paymentAmount) || 0;
    
    switch (paymentMethod) {
      case 'STRIPE':
        return (amount * 0.001) + 0.30;
      case 'M_PESA':
        return amount * 0.02;
      case 'BANK_TRANSFER':
        return (amount * 0.001) + 0.30;
      case 'CASH':
      default:
        return 0;
    }
  };

  const processPayment = async () => {
    if (!paymentMethod || !paymentAmount) {
      toast.error('Please select payment method and enter amount');
      return;
    }

    if (paymentMethod !== 'CASH' && (!customerPhone && !customerEmail)) {
      toast.error('Please enter customer contact information');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentData = {
        tripId: activeJob.id,
        amount: parseFloat(paymentAmount),
        currency: activeJob.currency,
        method: paymentMethod,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        platformFee: calculatePlatformFee()
      };

      console.log('Processing payment:', paymentData);

      // Add to payment history
      const newPayment = {
        id: Date.now().toString(),
        tripId: activeJob.id,
        amount: parseFloat(paymentAmount),
        currency: activeJob.currency,
        method: paymentMethod,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        customer: activeJob.customer.name
      };

      setPaymentHistory(prev => [newPayment, ...prev]);
      
      toast.success(`Payment of ${formatCurrency(paymentAmount, activeJob.currency)} processed successfully!`);
      
      // Reset form
      setPaymentMethod('');
      setPaymentAmount('');
      setCustomerPhone('');
      setCustomerEmail('');
      
      // Clear active job (simulate job completion)
      setActiveJob(null);

    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMethodBadge = (method) => {
    const methodData = paymentMethods.find(m => m.id === method);
    if (!methodData) return method;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${methodData.color}`}>
        {methodData.name}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Job Payments
      </h1>

      {/* Active Job Payment Section */}
      {activeJob ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Accept Payment for Completed Job
          </h2>
          
          {/* Job Details */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Trip: {activeJob.id}</h3>
                <p className="text-gray-600">Customer: {activeJob.customer.name}</p>
                <p className="text-gray-600">Route: {activeJob.origin} → {activeJob.destination}</p>
              </div>
              <div>
                <p className="text-gray-600">Distance: {activeJob.distance}</p>
                <p className="text-gray-600">Stops: {activeJob.stops}</p>
                <p className="text-lg font-semibold text-green-600">
                  Amount Due: {formatCurrency(activeJob.agreedRate, activeJob.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentMethodSelect(method)}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${method.color} bg-opacity-10`}>
                        <Icon className={`w-6 h-6 ${method.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{method.name}</h4>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-sm text-blue-600 font-medium">Fee: {method.fee}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Form */}
          {paymentMethod && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount ({activeJob.currency})
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              {paymentMethod !== 'CASH' && (
                <>
                  {(paymentMethod === 'M_PESA' || paymentMethod === 'MTN_MOMO') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Phone Number
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+254712345678"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Email (for receipt)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="customer@example.com"
                    />
                  </div>
                </>
              )}

              {/* Fee Calculation */}
              {paymentAmount && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(paymentAmount, activeJob.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculatePlatformFee(), activeJob.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>You Receive:</span>
                      <span className="text-green-600">
                        {formatCurrency((parseFloat(paymentAmount) || 0) - calculatePlatformFee(), activeJob.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={processPayment}
                disabled={isProcessing || !paymentAmount}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isProcessing || !paymentAmount
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isProcessing ? 'Processing Payment...' : `Accept Payment - ${formatCurrency(paymentAmount, activeJob.currency)}`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <div className="text-gray-500 mb-4">
            <CheckCircleIcon className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-lg font-medium">No Active Jobs</h3>
            <p>Complete a delivery job to accept payments</p>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payment History
        </h2>
        
        {paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.tripId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getMethodBadge(payment.method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No payment history yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPayments;