'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useSession } from '@/hooks/useSession-v2';
import { taxesApi } from '@/services/api/taxes';

const PayrollTaxFiling = ({ onNewFiling, subPage }) => {
  const { user } = useSession();
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    totalTaxDue: 0,
    totalEmployees: 0
  });
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showNewFiling, setShowNewFiling] = useState(false);
  const [taxSettings, setTaxSettings] = useState(null);
  const [calculatedTax, setCalculatedTax] = useState(null);
  const [serviceType, setServiceType] = useState('self_service');

  useEffect(() => {
    if (subPage === 'new-payroll-filing') {
      setShowNewFiling(true);
    } else if (subPage === 'payroll-tax-history') {
      fetchFilings();
      fetchStats();
    } else if (subPage === 'payroll-tax-setup') {
      // Show setup page
    } else {
      // Default to showing filing history
      fetchFilings();
      fetchStats();
    }
  }, [subPage]);

  const fetchFilings = async () => {
    try {
      const response = await taxesApi.payrollTax.getFilingHistory();
      setFilings(Array.isArray(response.data?.filings) ? response.data.filings : []);
      
      // Calculate stats from the filings
      if (response.data?.filings) {
        const filingsData = response.data.filings;
        setStats({
          total: filingsData.length,
          pending: filingsData.filter(f => f.status === 'draft' || f.status === 'pending').length,
          completed: filingsData.filter(f => f.status === 'completed' || f.status === 'submitted').length,
          overdue: filingsData.filter(f => f.status === 'overdue').length,
          totalTaxDue: filingsData.reduce((sum, f) => sum + parseFloat(f.total_tax || 0), 0),
          totalEmployees: filingsData.reduce((sum, f) => sum + (f.employee_count || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error fetching payroll tax filings:', error);
      setFilings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Stats are now calculated from the filings data in fetchFilings
    // This function is kept for compatibility but no longer needed
  };

  const fetchPayrollPeriods = async () => {
    try {
      // Fetch all payroll runs and filter out those already filed
      const response = await fetch('/api/payroll/runs/');
      const data = await response.json();
      
      // Filter for completed runs not yet filed for taxes
      const unfiledPeriods = (data || []).filter(run => 
        run.status === 'completed' && !run.tax_filings_created
      ).map(run => ({
        id: run.id,
        periodName: `Payroll ${run.payroll_number}`,
        startDate: run.start_date,
        endDate: run.end_date,
        payDate: run.pay_date,
        employeeCount: run.employee_count || 0,
        totalGrossWages: parseFloat(run.total_amount || 0),
        dueDate: run.filing_due_date || 'Check with tax authority',
        country: run.country_code || 'US'
      }));
      
      setPayrollPeriods(unfiledPeriods);
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { class: 'bg-gray-100 text-gray-800', icon: null },
      pending: { class: 'bg-yellow-100 text-yellow-800', icon: CalendarIcon },
      submitted: { class: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      accepted: { class: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      rejected: { class: 'bg-red-100 text-red-800', icon: ExclamationCircleIcon },
      overdue: { class: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
      paid: { class: 'bg-green-100 text-green-800', icon: BanknotesIcon }
    };
    
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleStartFiling = () => {
    setShowNewFiling(true);
    fetchPayrollPeriods();
  };

  const handleCalculateTax = async () => {
    if (!selectedPeriod) return;
    
    try {
      const response = await taxesApi.payrollTax.calculate({
        country_code: selectedPeriod.country || 'US',
        state_code: user?.profile?.state || null,
        gross_wages: selectedPeriod.totalGrossWages,
        pay_period: 'monthly', // Could be dynamic based on payroll frequency
        year_to_date_wages: 0 // Would need to calculate YTD
      });
      
      setCalculatedTax(response.data);
      // Show tax calculation results and proceed to filing
      handleCreateFiling(response.data);
    } catch (error) {
      console.error('Error calculating tax:', error);
      alert('Failed to calculate tax. Please try again.');
    }
  };

  const handleCreateFiling = async (taxData) => {
    try {
      const response = await taxesApi.payrollTax.createFiling({
        start_date: selectedPeriod.startDate,
        end_date: selectedPeriod.endDate,
        country_code: selectedPeriod.country || 'US',
        state_code: user?.profile?.state || null,
        service_type: serviceType
      });
      
      if (response.data.filing_id) {
        alert(`Filing created successfully! Filing ID: ${response.data.filing_id}`);
        setShowNewFiling(false);
        fetchFilings(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating filing:', error);
      alert('Failed to create filing. Please try again.');
    }
  };

  const viewFilingDetails = async (filingId) => {
    try {
      const response = await taxesApi.payrollTax.getFilingStatus(filingId);
      console.log('Filing details:', response.data);
      // Could show in a modal or navigate to detail page
    } catch (error) {
      console.error('Error fetching filing details:', error);
    }
  };

  const renderNewFilingForm = () => {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowNewFiling(false)}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Payroll Tax Filing</h1>
          <p className="text-gray-600 mt-1">File your payroll taxes for the selected period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Select Payroll Period</h2>
          
          {payrollPeriods.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Unfiled Periods</h3>
              <p className="mt-1 text-sm text-gray-500">
                All payroll periods have been filed or no payroll has been processed yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payrollPeriods.map((period) => (
                <div
                  key={period.id}
                  className={`border rounded-lg p-4 cursor-pointer transition ${
                    selectedPeriod?.id === period.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{period.periodName}</h3>
                      <p className="text-sm text-gray-600">
                        {period.startDate} - {period.endDate}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Employees:</span> {period.employeeCount}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Gross Wages:</span> ${period.totalGrossWages?.toLocaleString() || '0'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Est. Tax Due:</span> ${period.estimatedTaxDue?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="font-medium text-red-600">{period.dueDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPeriod && (
            <div className="mt-6 space-y-4">
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Select Service Type</h3>
                <div className="space-y-2">
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="serviceType"
                      value="self_service"
                      checked={serviceType === 'self_service'}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium">Self-Service Filing</div>
                      <div className="text-sm text-gray-600">We calculate your taxes, you file them yourself</div>
                      <div className="text-sm font-medium text-green-600 mt-1">$65 - $250 per filing</div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 opacity-50">
                    <input
                      type="radio"
                      name="serviceType"
                      value="full_service"
                      checked={serviceType === 'full_service'}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="mt-1 mr-3"
                      disabled
                    />
                    <div>
                      <div className="font-medium">Full-Service Filing</div>
                      <div className="text-sm text-gray-600">We calculate and file your taxes for you</div>
                      <div className="text-sm font-medium text-gray-400 mt-1">Coming Soon</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleCalculateTax}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Calculate Tax & Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSetupPage = () => {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Tax Setup</h1>
          <p className="text-gray-600 mt-1">Configure your payroll tax settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Tax Registration</h2>
            <p className="text-gray-600 mb-4">
              Register your employer tax accounts and obtain necessary IDs.
            </p>
            <button className="text-blue-600 hover:text-blue-800">
              Manage Registrations →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Filing Schedule</h2>
            <p className="text-gray-600 mb-4">
              Set up your payroll tax filing frequency and due dates.
            </p>
            <button className="text-blue-600 hover:text-blue-800">
              Configure Schedule →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Tax Rates</h2>
            <p className="text-gray-600 mb-4">
              Review and override default payroll tax rates if needed.
            </p>
            <button className="text-blue-600 hover:text-blue-800">
              Manage Rates →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Electronic Filing</h2>
            <p className="text-gray-600 mb-4">
              Set up electronic filing credentials for automated submissions.
            </p>
            <button className="text-blue-600 hover:text-blue-800">
              Configure E-Filing →
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !showNewFiling) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showNewFiling || subPage === 'new-payroll-filing') {
    return renderNewFilingForm();
  }

  if (subPage === 'payroll-tax-setup') {
    return renderSetupPage();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Tax Filing Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your payroll tax filings and compliance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Filings</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-red-600">{stats.overdue}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Tax Due</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.totalTaxDue?.toLocaleString() || '0'}
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleStartFiling}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Filing
        </button>
        <button className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2">
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export Data
        </button>
      </div>

      {/* Filings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country/State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employees
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tax Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
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
            {filings.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No payroll tax filings found
                </td>
              </tr>
            ) : (
              filings.map((filing) => (
                <tr key={filing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {filing.period}
                    </div>
                    <div className="text-sm text-gray-500">
                      {filing.periodType}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{filing.country}</div>
                    {filing.state && (
                      <div className="text-sm text-gray-500">{filing.state}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {filing.employeeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${filing.totalTaxAmount?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Employee: ${filing.employeeTaxAmount?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Employer: ${filing.employerTaxAmount?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {filing.dueDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(filing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {filing.status === 'pending' && (
                      <button className="text-green-600 hover:text-green-900">
                        <CreditCardIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollTaxFiling;