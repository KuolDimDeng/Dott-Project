'use client';

import React, { useState, useEffect } from 'react';
import {
  CalculatorIcon,
  PaperAirplaneIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@components/ui/StandardSpinner';
import { format, startOfQuarter, endOfQuarter } from 'date-fns';

const Form941Management = () => {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showScheduleB, setShowScheduleB] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    quarter: Math.ceil(new Date().getMonth() / 3),
    year: new Date().getFullYear(),
    status: 'draft'
  });

  const steps = ['Select Period', 'Calculate', 'Review', 'Submit', 'Confirmation'];

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/form-941/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch forms');
      
      const data = await response.json();
      setForms(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateForm = async () => {
    setLoading(true);
    setValidationErrors([]);
    
    try {
      const response = await fetch('/api/taxes/payroll/form-941/calculate_quarter/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          quarter: formData.quarter,
          year: formData.year
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate form');
      }
      
      const data = await response.json();
      setSelectedForm(data);
      setFormData(data);
      setValidationErrors(data.validation_errors || []);
      setShowScheduleB(data.deposit_schedule === 'semiweekly');
      setActiveStep(2); // Move to review step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitToIRS = async () => {
    if (!selectedForm || !selectedForm.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/form-941/${selectedForm.id}/submit_to_irs/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }
      
      const data = await response.json();
      if (data.success) {
        setActiveStep(4);
        fetchForms(); // Refresh list
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (formId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/form-941/${formId}/check_status/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to check status');
      
      const data = await response.json();
      // Update form in list
      setForms(forms.map(f => f.id === formId ? { ...f, ...data } : f));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusClasses = (status) => {
    const statusClasses = {
      draft: 'bg-gray-100 text-gray-800',
      calculated: 'bg-blue-100 text-blue-800',
      ready: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-indigo-100 text-indigo-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      amended: 'bg-purple-100 text-purple-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const renderPeriodSelection = () => (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Select Filing Period
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quarter
          </label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.quarter}
            onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
          >
            <option value={1}>Q1 (Jan - Mar)</option>
            <option value={2}>Q2 (Apr - Jun)</option>
            <option value={3}>Q3 (Jul - Sep)</option>
            <option value={4}>Q4 (Oct - Dec)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <input
            type="number"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            min="2020"
            max={new Date().getFullYear() + 1}
          />
        </div>
      </div>
      <div className="mt-6">
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          onClick={() => setActiveStep(1)}
          disabled={!formData.quarter || !formData.year}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderCalculation = () => (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Calculate Form 941
      </h3>
      <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
        This will calculate your Form 941 based on payroll data for Q{formData.quarter} {formData.year}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Period Details
          </h4>
          <p className="text-sm text-gray-600">
            Quarter: Q{formData.quarter} {formData.year}
          </p>
          <p className="text-sm text-gray-600">
            Period: {format(startOfQuarter(new Date(formData.year, (formData.quarter - 1) * 3)), 'MMM d, yyyy')} - {format(endOfQuarter(new Date(formData.year, (formData.quarter - 1) * 3)), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setActiveStep(0)}
        >
          Back
        </button>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          onClick={calculateForm}
          disabled={loading}
        >
          <CalculatorIcon className="h-4 w-4 mr-2" />
          {loading ? 'Calculating...' : 'Calculate Form'}
        </button>
      </div>
    </div>
  );

  const renderReview = () => {
    if (!selectedForm) return null;

    return (
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Review Form 941
        </h3>
        
        {validationErrors.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-medium mb-2">Validation Errors:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {/* Part 1: Answer these questions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">
                Part 1: Answer these questions for this quarter
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Number of Employees
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedForm.number_of_employees}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Wages, Tips & Compensation
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(selectedForm.wages_tips_compensation)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Calculations */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxable Wages
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Federal Income Tax Withheld
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.wages_tips_compensation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.federal_income_tax_withheld)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Social Security Tax
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.social_security_wages)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.social_security_tax)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Medicare Tax
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.medicare_wages_tips)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(selectedForm.medicare_tax)}
                  </td>
                </tr>
                {selectedForm.additional_medicare_tax > 0 && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Additional Medicare Tax
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(selectedForm.additional_medicare_tax)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Total Tax
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(selectedForm.total_tax_after_adjustments)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deposit Schedule */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">
                Part 2: Deposit Schedule
              </h4>
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800`}>
                  {selectedForm.deposit_schedule === 'monthly' ? 'Monthly Depositor' : 'Semiweekly Depositor'}
                </span>
                {showScheduleB && (
                  <button
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    onClick={() => setShowScheduleB(true)}
                  >
                    View Schedule B
                  </button>
                )}
              </div>
              
              {selectedForm.deposit_schedule === 'monthly' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Month 1 Liability</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedForm.month1_liability)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Month 2 Liability</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedForm.month2_liability)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Month 3 Liability</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedForm.month3_liability)}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">Total Deposits for Quarter</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedForm.total_deposits)}</p>
              </div>
            </div>
          </div>

          {/* Balance Due/Overpayment */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {selectedForm.balance_due > 0 ? 'Balance Due' : 'Overpayment'}
                  </p>
                  <p className={`text-lg font-semibold ${selectedForm.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedForm.balance_due > 0 ? selectedForm.balance_due : selectedForm.overpayment)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Filing Deadline</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(selectedForm.due_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => setActiveStep(1)}
          >
            Back
          </button>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
            onClick={() => setActiveStep(3)}
            disabled={!selectedForm.is_valid}
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            Proceed to Submit
          </button>
        </div>
      </div>
    );
  };

  const renderSubmit = () => (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Submit Form 941
      </h3>
      
      <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        Please review the following before submitting:
      </div>
      
      <ul className="space-y-3">
        <li className="bg-white overflow-hidden shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">
            All information is accurate and complete
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You are responsible for the accuracy of this filing
          </p>
        </li>
        <li className="bg-white overflow-hidden shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">
            You have the authority to file this return
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You must be authorized to file taxes for this business
          </p>
        </li>
        <li className="bg-white overflow-hidden shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">
            Electronic signature agreement
          </p>
          <p className="text-sm text-gray-500 mt-1">
            By submitting, you agree to sign this return electronically
          </p>
        </li>
      </ul>

      <div className="mt-6 flex gap-2">
        <button
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setActiveStep(2)}
        >
          Back to Review
        </button>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          onClick={submitToIRS}
          disabled={loading}
        >
          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
          {loading ? 'Submitting...' : 'Submit to IRS'}
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CheckIcon className="h-12 w-12 text-green-500" />
        <h3 className="text-xl font-semibold text-gray-900">
          Form 941 Submitted Successfully
        </h3>
      </div>
      
      {selectedForm && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Submission ID
            </p>
            <p className="text-base text-gray-900">
              {selectedForm.submission_id}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Tracking Number
            </p>
            <p className="text-base text-gray-900">
              {selectedForm.irs_tracking_number}
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setActiveStep(0);
            setSelectedForm(null);
            fetchForms();
          }}
        >
          File Another Form
        </button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPeriodSelection();
      case 1:
        return renderCalculation();
      case 2:
        return renderReview();
      case 3:
        return renderSubmit();
      case 4:
        return renderConfirmation();
      default:
        return null;
    }
  };

  if (loading && forms.length === 0) {
    return <CenteredSpinner />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Form 941 - Quarterly Federal Tax Return
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}

      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">File New Form 941</h2>
            <button
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={fetchForms}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
          
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between mb-6">
              {steps.map((label, index) => (
                <li key={label} className="relative flex-1">
                  {index !== steps.length - 1 && (
                    <div className="absolute top-4 w-full" aria-hidden="true">
                      <div className="h-0.5 w-full bg-gray-200">
                        <div
                          className="h-0.5 bg-blue-600 transition-all"
                          style={{
                            width: index < activeStep ? '100%' : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className={`relative flex flex-col items-center group ${
                    index < activeStep ? 'text-blue-600' : index === activeStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < activeStep
                        ? 'bg-blue-600 text-white'
                        : index === activeStep
                        ? 'border-2 border-blue-600 bg-white'
                        : 'border-2 border-gray-300 bg-white'
                    }`}>
                      {index < activeStep ? <CheckIcon className="h-5 w-5" /> : index + 1}
                    </span>
                    <span className="text-xs mt-2">{label}</span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
          
          {renderStepContent()}
        </div>
      </div>

      {/* Previous Forms List */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Previous Form 941 Filings
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filed Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forms.map((form) => (
                  <tr key={form.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Q{form.quarter} {form.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(form.status)}`}>
                        {form.filing_status_display || form.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(form.total_tax_after_adjustments)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {form.filing_date ? format(new Date(form.filing_date), 'MM/dd/yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        {form.status === 'submitted' && (
                          <button
                            className="text-gray-400 hover:text-gray-500 group relative"
                            onClick={() => checkStatus(form.id)}
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                            <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Check Status
                            </span>
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-500 group relative">
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Download PDF
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {forms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No forms filed yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule B Dialog */}
      {showScheduleB && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="absolute inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Schedule B - Tax Liability for Semiweekly Schedule Depositors
                </h3>
                {selectedForm?.schedule_b && (
                  <p className="text-sm text-gray-700">
                    Schedule B data would be displayed here
                  </p>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowScheduleB(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form941Management;