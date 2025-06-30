import React, { useState, useEffect } from 'react';
import {
  CalculatorIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { apiRequest } from '../../utils/api';
import { showSuccess, showError } from '../../utils/toast';
import StandardSpinner from '../ui/StandardSpinner';

const Form940Management = () => {
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('forms');
  const [calculationData, setCalculationData] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [stateAccounts, setStateAccounts] = useState([]);
  const [futaSummary, setFutaSummary] = useState(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendmentData, setAmendmentData] = useState({
    originalFormId: '',
    reason: '',
    changes: {}
  });

  useEffect(() => {
    fetchForms();
    fetchStateAccounts();
    fetchFutaSummary();
  }, [selectedYear]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/payroll-tax/form-940/', 'GET');
      setForms(response.filter(form => form.year === selectedYear));
    } catch (error) {
      showError('Failed to fetch Form 940 records');
    } finally {
      setLoading(false);
    }
  };

  const fetchStateAccounts = async () => {
    try {
      const response = await apiRequest('/api/payroll-tax/state-accounts/active_states/', 'GET');
      setStateAccounts(response);
    } catch (error) {
      console.error('Failed to fetch state accounts:', error);
    }
  };

  const fetchFutaSummary = async () => {
    try {
      const response = await apiRequest(`/api/payroll-tax/form-940/futa_summary/?year=${selectedYear}`, 'GET');
      setFutaSummary(response);
    } catch (error) {
      console.error('Failed to fetch FUTA summary:', error);
    }
  };

  const calculateForm940 = async (saveAsDraft = false) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/payroll-tax/form-940/calculate_year/', 'POST', {
        year: selectedYear,
        calculate_only: !saveAsDraft,
        save_draft: saveAsDraft
      });

      if (response.status === 'calculated') {
        setCalculationData(response.form_data);
        setShowCalculationModal(true);
      } else if (response.status === 'draft_saved') {
        showSuccess('Form 940 draft saved successfully');
        await fetchForms();
        setShowCalculationModal(false);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        showError(`Validation failed: ${error.response.data.errors.join(', ')}`);
      } else {
        showError('Failed to calculate Form 940');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitForm940 = async (formId) => {
    if (!window.confirm('Are you sure you want to submit this Form 940 to the IRS?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/api/payroll-tax/form-940/${formId}/submit/`, 'POST');
      showSuccess(`Form 940 submitted successfully. Confirmation: ${response.confirmation_number}`);
      await fetchForms();
    } catch (error) {
      showError('Failed to submit Form 940');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (formId) => {
    try {
      await apiRequest(`/api/payroll-tax/form-940/${formId}/pdf/`, 'GET');
      showError('PDF generation not yet implemented');
    } catch (error) {
      showError('Failed to generate PDF');
    }
  };

  const startAmendment = (form) => {
    setAmendmentData({
      originalFormId: form.id,
      reason: '',
      changes: {}
    });
    setShowAmendModal(true);
  };

  const submitAmendment = async () => {
    if (!amendmentData.reason) {
      showError('Please provide a reason for the amendment');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/payroll-tax/form-940/amend/', 'POST', amendmentData);
      showSuccess('Amended Form 940 draft created successfully');
      setShowAmendModal(false);
      await fetchForms();
    } catch (error) {
      showError('Failed to create amendment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { icon: PencilSquareIcon, className: 'bg-gray-100 text-gray-800' },
      ready: { icon: ClockIcon, className: 'bg-yellow-100 text-yellow-800' },
      filed: { icon: CheckCircleIcon, className: 'bg-green-100 text-green-800' },
      accepted: { icon: CheckCircleIcon, className: 'bg-green-100 text-green-800' },
      rejected: { icon: ExclamationCircleIcon, className: 'bg-red-100 text-red-800' },
      amended: { icon: DocumentDuplicateIcon, className: 'bg-purple-100 text-purple-800' }
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        <Icon className="h-4 w-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Form 940 - Annual Federal Unemployment Tax
        </h1>
      </div>

      {/* Year Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tax Year
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {[0, -1, -2].map(offset => {
            const year = new Date().getFullYear() + offset;
            return (
              <option key={year} value={year}>{year}</option>
            );
          })}
        </select>
      </div>

      {/* Summary Cards */}
      {futaSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Wages</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(futaSummary.total_wages)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalculatorIcon className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">FUTA Tax</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(futaSummary.total_futa_tax)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-10 w-10 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deposits</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(futaSummary.total_deposits)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-10 w-10 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Balance Due</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(futaSummary.balance_due)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'forms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Form 940 Records
          </button>
          <button
            onClick={() => setActiveTab('quarterly')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quarterly'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quarterly Breakdown
          </button>
          <button
            onClick={() => setActiveTab('states')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'states'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            State Accounts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'forms' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Form 940 Records</h2>
              <button
                onClick={() => calculateForm940(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CalculatorIcon className="h-4 w-4 mr-2" />
                Calculate Form 940
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <StandardSpinner />
            </div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No Form 940 records for {selectedYear}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filing Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {forms.map((form) => (
                    <tr key={form.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(form.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {form.amended_return ? 'Amended' : 'Original'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {form.filing_date 
                          ? new Date(form.filing_date).toLocaleDateString()
                          : 'Not filed'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(form.total_futa_tax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(form.balance_due)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          {form.status === 'draft' && (
                            <button
                              onClick={() => submitForm940(form.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Submit
                            </button>
                          )}
                          {form.status === 'filed' && !form.amended_return && (
                            <button
                              onClick={() => startAmendment(form)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Amend
                            </button>
                          )}
                          <button
                            onClick={() => downloadPdf(form.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quarterly' && futaSummary && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quarterly FUTA Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(quarter => (
              <div key={quarter} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Q{quarter}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Liability:</span>
                    <span className="font-medium">
                      {formatCurrency(futaSummary.quarterly_breakdown[quarter].liability)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposits:</span>
                    <span className="font-medium">
                      {formatCurrency(futaSummary.quarterly_breakdown[quarter].deposits)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600">Balance:</span>
                    <span className={`font-medium ${
                      futaSummary.quarterly_breakdown[quarter].liability - 
                      futaSummary.quarterly_breakdown[quarter].deposits > 0
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(
                        futaSummary.quarterly_breakdown[quarter].liability - 
                        futaSummary.quarterly_breakdown[quarter].deposits
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'states' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">State Tax Accounts</h2>
          </div>
          {stateAccounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No state tax accounts configured
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employer Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filing Frequency
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stateAccounts.map((account) => (
                    <tr key={account.state_code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.state_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.employer_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(account.experience_rate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.filing_frequency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Calculation Modal */}
      {showCalculationModal && calculationData && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Form 940 Calculation Results
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Wages and Tax</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">Total Payments:</dt>
                      <dd className="font-medium">{formatCurrency(calculationData.total_payments)}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">Taxable FUTA Wages:</dt>
                      <dd className="font-medium">{formatCurrency(calculationData.total_taxable_futa_wages)}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">FUTA Tax (0.6%):</dt>
                      <dd className="font-medium">{formatCurrency(calculationData.total_futa_tax)}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Credits and Balance</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">State Credit:</dt>
                      <dd className="font-medium">{formatCurrency(calculationData.state_credit_allowable)}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">Total Deposits:</dt>
                      <dd className="font-medium">{formatCurrency(calculationData.total_deposits)}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600">Balance Due:</dt>
                      <dd className="font-medium text-red-600">{formatCurrency(calculationData.balance_due)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {calculationData.is_multi_state && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Multi-State Details</h4>
                  <p className="text-sm text-gray-600">
                    Schedule A will be required for multi-state employer reporting.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCalculationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => calculateForm940(true)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amendment Modal */}
      {showAmendModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Amend Form 940
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Amendment
                </label>
                <textarea
                  value={amendmentData.reason}
                  onChange={(e) => setAmendmentData({
                    ...amendmentData,
                    reason: e.target.value
                  })}
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Explain why you are amending this return..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAmendModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAmendment}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Create Amendment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form940Management;