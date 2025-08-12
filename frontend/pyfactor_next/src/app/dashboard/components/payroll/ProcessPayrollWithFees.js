'use client';

import React, { useState, useEffect } from 'react';
import PayrollFeeBreakdown from './PayrollFeeBreakdown';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

const ProcessPayrollWithFees = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: Select Period, 2: Review, 3: Payment, 4: Complete
  const [employees, setEmployees] = useState([]);
  const [payPeriod, setPayPeriod] = useState({
    start: '',
    end: '',
    payDate: ''
  });
  const [payrollRun, setPayrollRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees/');
      const data = await response.json();
      setEmployees(data.map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        grossSalary: emp.salary || emp.hourly_rate * 160 // Assuming 160 hours/month
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleProcessPayroll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/payroll/process-with-fees/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end,
          pay_date: payPeriod.payDate,
          employees: employees.map(emp => ({
            employee_id: emp.id,
            gross_salary: emp.grossSalary
          }))
        })
      });

      const data = await response.json();
      if (data.success) {
        setPayrollRun(data.payroll);
        setStep(3); // Move to payment step
      } else {
        setError(data.error || 'Failed to process payroll');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndPay = async () => {
    if (!payrollRun) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/payroll/approve-with-payment/${payrollRun.payroll_run_id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (data.success) {
        // Here you would integrate with Stripe or show payment form
        setStep(4); // Move to complete
      }
    } catch (error) {
      setError('Payment error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Select Pay Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Start
            </label>
            <input
              type="date"
              value={payPeriod.start}
              onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period End
            </label>
            <input
              type="date"
              value={payPeriod.end}
              onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Date
            </label>
            <input
              type="date"
              value={payPeriod.payDate}
              onChange={(e) => setPayPeriod({ ...payPeriod, payDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">
          Employees ({employees.length})
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {employees.map((emp) => (
              <div key={emp.id} className="flex justify-between items-center py-2">
                <span className="font-medium">{emp.name}</span>
                <span className="text-gray-600">
                  ${emp.grossSalary.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total Gross Salaries</span>
              <span>
                ${employees.reduce((sum, emp) => sum + emp.grossSalary, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={!payPeriod.start || !payPeriod.end || !payPeriod.payDate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Continue
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Review Payroll Costs</h3>
        <button
          onClick={() => setStep(1)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Period Selection
        </button>
      </div>

      <PayrollFeeBreakdown 
        employees={employees} 
        payPeriod={payPeriod}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleProcessPayroll}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              Process Payroll
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Payroll Created Successfully!</h3>
        <p className="text-gray-600">
          Now complete payment to process payroll for your employees
        </p>
      </div>

      {payrollRun && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-4">Payment Required</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-800">Total Amount Due</span>
              <span className="text-2xl font-bold text-blue-900">
                ${payrollRun.summary.total_charge.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• ${payrollRun.breakdown_by_destination.to_employees.toFixed(2)} to employees</p>
              <p>• ${payrollRun.breakdown_by_destination.to_government.toFixed(2)} to government</p>
              <p>• ${payrollRun.breakdown_by_destination.to_dott.toFixed(2)} processing fee</p>
            </div>
          </div>

          <button
            onClick={handleApproveAndPay}
            disabled={loading}
            className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CreditCardIcon className="h-5 w-5" />
            {loading ? 'Processing...' : `Pay $${payrollRun.summary.total_charge.toFixed(2)}`}
          </button>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Funds will be collected from your default payment method. 
          Employees will receive payment within 1-2 business days.
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-12">
      <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircleIcon className="h-12 w-12 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold mb-2">Payroll Processed Successfully!</h3>
      <p className="text-gray-600 mb-8">
        All employees will receive their payments within 1-2 business days
      </p>
      <button
        onClick={onClose}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Process Payroll</h2>
        <p className="text-gray-600 mt-1">
          Complete payroll processing with automatic tax calculations and filing
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Select Period' },
            { num: 2, label: 'Review Costs' },
            { num: 3, label: 'Payment' },
            { num: 4, label: 'Complete' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s.num ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : (
                  s.num
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step >= s.num ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {s.label}
              </span>
              {idx < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default ProcessPayrollWithFees;