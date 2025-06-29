'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TaxPaymentsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalScheduled: 0
  });
  const [filterType, setFilterType] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    tax_type: '',
    amount: '',
    due_date: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchPaymentsData();
  }, [filterType]);

  const fetchPaymentsData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment history
      const paymentsResponse = await taxesApi.payments.getHistory({ type: filterType });
      if (paymentsResponse.data) {
        setPayments(paymentsResponse.data);
      }
      
      // Fetch upcoming payments
      const upcomingResponse = await taxesApi.payments.getUpcoming();
      if (upcomingResponse.data) {
        setUpcomingPayments(upcomingResponse.data);
      }
      
      // Fetch payment summary
      const summaryResponse = await taxesApi.payments.getSummary();
      if (summaryResponse.data) {
        setPaymentSummary(summaryResponse.data);
      }
    } catch (error) {
      console.error('Error fetching payments data:', error);
      toast.error('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    try {
      await taxesApi.payments.create(newPayment);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setNewPayment({
        tax_type: '',
        amount: '',
        due_date: '',
        payment_method: '',
        reference_number: '',
        notes: ''
      });
      fetchPaymentsData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleSchedulePayment = async (paymentId) => {
    try {
      await taxesApi.payments.schedule(paymentId);
      toast.success('Payment scheduled successfully');
      fetchPaymentsData();
    } catch (error) {
      console.error('Error scheduling payment:', error);
      toast.error('Failed to schedule payment');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Payments Management</h1>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Record Payment
        </button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Paid (YTD)</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">
            ${paymentSummary.totalPaid.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Pending</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            ${paymentSummary.totalPending.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Scheduled</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            ${paymentSummary.totalScheduled.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Upcoming Payments</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {upcomingPayments.slice(0, 3).map((payment, index) => (
                    <li key={index}>
                      {payment.tax_type}: ${payment.amount.toFixed(2)} due on {new Date(payment.due_date).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payment History</h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            <option value="all">All Types</option>
            <option value="sales">Sales Tax</option>
            <option value="income">Income Tax</option>
            <option value="payroll">Payroll Tax</option>
            <option value="property">Property Tax</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(payment.payment_date || payment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{payment.tax_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${payment.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.payment_method || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.reference_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.status === 'pending' && (
                      <button
                        onClick={() => handleSchedulePayment(payment.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Schedule
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Record Tax Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Type</label>
                <select
                  value={newPayment.tax_type}
                  onChange={(e) => setNewPayment({ ...newPayment, tax_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select Tax Type</option>
                  <option value="Sales Tax">Sales Tax</option>
                  <option value="Income Tax">Income Tax</option>
                  <option value="Payroll Tax">Payroll Tax</option>
                  <option value="Property Tax">Property Tax</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  value={newPayment.due_date}
                  onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select Method</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Wire">Wire Transfer</option>
                  <option value="EFTPS">EFTPS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                <input
                  type="text"
                  value={newPayment.reference_number}
                  onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  rows="2"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMakePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxPaymentsManagement;