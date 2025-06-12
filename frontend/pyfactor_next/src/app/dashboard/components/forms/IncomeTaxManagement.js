'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';

const IncomeTaxManagement = () => {
  const [loading, setLoading] = useState(true);
  const [taxEstimates, setTaxEstimates] = useState({
    currentQuarter: { estimated: 0, paid: 0, due: 0 },
    yearToDate: { estimated: 0, paid: 0, due: 0 },
    projectedAnnual: 0
  });
  const [quarterlyPayments, setQuarterlyPayments] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    quarter: '',
    amount: '',
    payment_date: '',
    confirmation_number: ''
  });

  useEffect(() => {
    fetchIncomeTaxData();
  }, []);

  const fetchIncomeTaxData = async () => {
    try {
      setLoading(true);
      
      // Fetch tax estimates
      const estimatesResponse = await taxesApi.incomeTax.getEstimates();
      if (estimatesResponse.data) {
        setTaxEstimates(estimatesResponse.data);
      }
      
      // Fetch quarterly payments
      const paymentsResponse = await taxesApi.incomeTax.getQuarterlyPayments();
      if (paymentsResponse.data) {
        setQuarterlyPayments(paymentsResponse.data);
      }
      
      // Fetch deductions
      const deductionsResponse = await taxesApi.incomeTax.getDeductions();
      if (deductionsResponse.data) {
        setDeductions(deductionsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching income tax data:', error);
      toast.error('Failed to load income tax data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      await taxesApi.incomeTax.recordPayment(newPayment);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setNewPayment({ quarter: '', amount: '', payment_date: '', confirmation_number: '' });
      fetchIncomeTaxData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const calculateTotalDeductions = () => {
    return deductions.reduce((total, deduction) => total + (deduction.amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Income Tax Management</h1>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Record Payment
        </button>
      </div>

      {/* Tax Estimates Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Current Quarter</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated</span>
              <span className="font-medium">${taxEstimates.currentQuarter.estimated.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid</span>
              <span className="font-medium">${taxEstimates.currentQuarter.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Due</span>
              <span className="font-bold text-red-600">${taxEstimates.currentQuarter.due.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Year to Date</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated</span>
              <span className="font-medium">${taxEstimates.yearToDate.estimated.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid</span>
              <span className="font-medium">${taxEstimates.yearToDate.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Due</span>
              <span className="font-bold text-orange-600">${taxEstimates.yearToDate.due.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Projected Annual</h3>
          <div className="text-2xl font-bold text-gray-800">
            ${taxEstimates.projectedAnnual.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500 mt-2">Based on current income</p>
        </div>
      </div>

      {/* Quarterly Payments */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Quarterly Estimated Tax Payments</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quarterlyPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{payment.quarter}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(payment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">${payment.estimated_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${payment.paid_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        payment.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deductions Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Deductions</h2>
        <div className="mb-4">
          <div className="text-lg font-semibold">
            Total Deductions: ${calculateTotalDeductions().toFixed(2)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deductions.map((deduction) => (
            <div key={deduction.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{deduction.category}</h4>
                  <p className="text-sm text-gray-600">{deduction.description}</p>
                </div>
                <span className="font-medium">${deduction.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Record Quarterly Tax Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quarter</label>
                <select
                  value={newPayment.quarter}
                  onChange={(e) => setNewPayment({ ...newPayment, quarter: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select Quarter</option>
                  <option value="Q1">Q1 (Jan-Mar)</option>
                  <option value="Q2">Q2 (Apr-Jun)</option>
                  <option value="Q3">Q3 (Jul-Sep)</option>
                  <option value="Q4">Q4 (Oct-Dec)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
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
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmation Number</label>
                <input
                  type="text"
                  value={newPayment.confirmation_number}
                  onChange={(e) => setNewPayment({ ...newPayment, confirmation_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
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
                onClick={handleRecordPayment}
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

export default IncomeTaxManagement;