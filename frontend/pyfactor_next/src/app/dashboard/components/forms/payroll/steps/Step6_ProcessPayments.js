'use client';

import React, { useState, useEffect } from 'react';
import { RocketLaunchIcon, CheckIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';

export default function Step6_ProcessPayments({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious 
}) {
  const [paymentProgress, setPaymentProgress] = useState({
    total: payrollData.deductions?.employees.length || 0,
    processed: 0,
    status: 'ready',
    payments: []
  });
  const [preflightChecks, setPreflightChecks] = useState({
    fundsReceived: false,
    paymentDetails: false,
    paymentDate: false
  });

  useEffect(() => {
    performPreflightChecks();
  }, []);

  const performPreflightChecks = async () => {
    try {
      const response = await fetch('/api/payroll/preflight-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ payrollId: payrollData.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreflightChecks({
          fundsReceived: data.fundsReceived,
          paymentDetails: data.allEmployeesHavePaymentDetails,
          paymentDate: data.paymentDateValid
        });
      }
    } catch (error) {
      logger.error('Error performing preflight checks:', error);
    }
  };

  const startPaymentProcessing = async () => {
    setPaymentProgress(prev => ({ ...prev, status: 'processing' }));
    
    try {
      const response = await fetch('/api/payroll/process-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ payrollId: payrollData.id })
      });
      
      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'payment_processed') {
                  setPaymentProgress(prev => ({
                    ...prev,
                    processed: prev.processed + 1,
                    payments: [...prev.payments, data.payment]
                  }));
                } else if (data.type === 'complete') {
                  setPaymentProgress(prev => ({
                    ...prev,
                    status: 'complete'
                  }));
                  updatePayrollData('paymentProgress', {
                    status: 'complete',
                    completedAt: new Date().toISOString()
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing payments:', error);
      setPaymentProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allChecksPass = Object.values(preflightChecks).every(check => check);
  
  const usEmployees = payrollData.deductions?.employees.filter(e => e.country === 'US') || [];
  const keEmployees = payrollData.deductions?.employees.filter(e => e.country === 'KE') || [];
  const otherEmployees = payrollData.deductions?.employees.filter(e => e.country !== 'US' && e.country !== 'KE') || [];

  const successCount = paymentProgress.payments.filter(p => p.status === 'success').length;
  const failedCount = paymentProgress.payments.filter(p => p.status === 'failed').length;
  const totalDistributed = paymentProgress.payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <RocketLaunchIcon className="h-6 w-6 text-blue-600 mr-2" />
          Process Payments
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Send payments to your employees
        </p>
      </div>

      {/* Pre-flight Checks */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pre-flight Checks</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            {preflightChecks.fundsReceived ? (
              <CheckIcon className="h-5 w-5 text-green-600 mr-3" />
            ) : (
              <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
            )}
            <span className={preflightChecks.fundsReceived ? 'text-green-800' : 'text-gray-600'}>
              Funds received: {formatCurrency(payrollData.deductions?.totalNet || 0)}
            </span>
          </div>
          <div className="flex items-center">
            {preflightChecks.paymentDetails ? (
              <CheckIcon className="h-5 w-5 text-green-600 mr-3" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-3" />
            )}
            <span className={preflightChecks.paymentDetails ? 'text-green-800' : 'text-red-600'}>
              All employees have valid payment details
            </span>
          </div>
          <div className="flex items-center">
            {preflightChecks.paymentDate ? (
              <CheckIcon className="h-5 w-5 text-green-600 mr-3" />
            ) : (
              <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
            )}
            <span className={preflightChecks.paymentDate ? 'text-green-800' : 'text-gray-600'}>
              Payment date: {formatDate(payrollData.payPeriod.payDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods by Region */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usEmployees.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🇺🇸</span>
                <h4 className="font-medium text-gray-900">US Employees ({usEmployees.length})</h4>
              </div>
              <p className="text-sm text-gray-600">Via ACH Direct Deposit</p>
              <p className="text-sm text-gray-500 mt-1">1-2 business days</p>
            </div>
          )}
          
          {keEmployees.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🇰🇪</span>
                <h4 className="font-medium text-gray-900">Kenya Employees ({keEmployees.length})</h4>
              </div>
              <p className="text-sm text-gray-600">Via M-Pesa & Bank Transfer</p>
              <p className="text-sm text-gray-500 mt-1">Instant to 1 day</p>
            </div>
          )}
          
          {otherEmployees.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🌍</span>
                <h4 className="font-medium text-gray-900">Other Countries ({otherEmployees.length})</h4>
              </div>
              <p className="text-sm text-gray-600">Via Wise International</p>
              <p className="text-sm text-gray-500 mt-1">1-3 business days</p>
            </div>
          )}
        </div>
      </div>

      {/* Process Button */}
      {paymentProgress.status === 'ready' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                Important: Once started, payments cannot be cancelled.
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Please ensure all details are correct before proceeding.
              </p>
            </div>
          </div>
          
          <button
            onClick={startPaymentProcessing}
            disabled={!allChecksPass}
            className={`
              mt-4 w-full py-3 px-4 text-sm font-medium rounded-md flex items-center justify-center
              ${allChecksPass
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <RocketLaunchIcon className="h-5 w-5 mr-2" />
            Start Payment Processing
          </button>
        </div>
      )}

      {/* Progress Display */}
      {paymentProgress.status === 'processing' && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing payments...</span>
              <span>{paymentProgress.processed} of {paymentProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(paymentProgress.processed / paymentProgress.total) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Live Payment Log */}
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentProgress.payments.map((payment, index) => (
                  <tr key={index} className="animate-fadeIn">
                    <td className="px-4 py-2 text-sm text-gray-600">{formatTime(payment.timestamp)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{payment.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-2">
                      {payment.status === 'success' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Summary */}
      {paymentProgress.status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <CheckIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-green-900">
                All payments processed successfully!
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Successful Payments</p>
                  <p className="text-2xl font-semibold text-green-600">{successCount}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Failed Payments</p>
                  <p className="text-2xl font-semibold text-red-600">{failedCount}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Distributed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(totalDistributed)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={paymentProgress.status === 'processing'}
          className={`
            px-6 py-2 text-sm font-medium rounded-md
            ${paymentProgress.status === 'processing'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={paymentProgress.status !== 'complete'}
          className={`
            px-6 py-2 text-sm font-medium rounded-md
            ${paymentProgress.status === 'complete'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Distribute
        </button>
      </div>
    </div>
  );
}