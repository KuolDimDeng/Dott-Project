'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { 
  CogIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const TaxesDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [taxSummary, setTaxSummary] = useState({
    salesTax: { collected: 0, filed: 0, due: 0 },
    incomeTax: { estimated: 0, paid: 0, remaining: 0 },
    payrollTax: { withheld: 0, deposited: 0, pending: 0 }
  });
  const [upcomingFilings, setUpcomingFilings] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [taxSettings, setTaxSettings] = useState(null);
  const [filingReadiness, setFilingReadiness] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get tenant ID
      const id = await getSecureTenantId();
      setTenantId(id);
      
      // Fetch tax settings
      try {
        const response = await fetch(`/api/taxes/settings?tenantId=${id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setTaxSettings(data);
        }
      } catch (error) {
        console.error('Error loading tax settings:', error);
      }
      
      // Fetch filing readiness status
      try {
        const response = await fetch(`/api/taxes/filing-readiness?tenantId=${id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setFilingReadiness(data);
        }
      } catch (error) {
        console.error('Error loading filing readiness:', error);
      }
      
      // Fetch tax summary data
      const summaryResponse = await taxesApi.dashboard.getSummary();
      if (summaryResponse.data) {
        // Ensure we have the proper structure even if some fields are missing
        setTaxSummary({
          salesTax: summaryResponse.data.salesTax || { collected: 0, filed: 0, due: 0 },
          incomeTax: summaryResponse.data.incomeTax || { estimated: 0, paid: 0, remaining: 0 },
          payrollTax: summaryResponse.data.payrollTax || { withheld: 0, deposited: 0, pending: 0 }
        });
      }
      
      // Fetch upcoming filings
      const filingsResponse = await taxesApi.filings.getUpcoming();
      if (filingsResponse.data) {
        setUpcomingFilings(filingsResponse.data);
      }
      
      // Fetch recent activities
      const activitiesResponse = await taxesApi.activities.getRecent();
      if (activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching tax dashboard data:', error);
      toast.error('Failed to load tax dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CenteredSpinner size="large" minHeight="h-96" />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Dashboard</h1>
            <p className="text-gray-600">Manage your tax settings, track deadlines, and file returns</p>
          </div>
        </div>
      </div>
      
      {/* Tax Settings Status */}
      <div className="mb-8">
        {!taxSettings ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-yellow-900 mb-2">
                  Tax Settings Not Configured
                </h3>
                <p className="text-yellow-700 mb-4">
                  Complete your tax settings to unlock filing capabilities and get accurate tax calculations.
                </p>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('tax-settings');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <CogIcon className="h-5 w-5 mr-2" />
                  Set Up Tax Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-green-900">Tax Settings Complete</h3>
                  <p className="text-green-700">
                    Your tax profile is configured and ready for filing
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('tax-filing');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  File Taxes
                </button>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('tax-settings');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
                >
                  <CogIcon className="h-5 w-5 mr-2" />
                  Edit Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Filing Readiness Status */}
      {taxSettings && filingReadiness && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              filingReadiness.salesTax?.ready ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center mb-2">
                <ShieldCheckIcon className={`h-5 w-5 mr-2 ${
                  filingReadiness.salesTax?.ready ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className="font-medium">Sales Tax</span>
              </div>
              <p className="text-sm text-gray-600">
                {filingReadiness.salesTax?.ready ? 'Ready to file' : 'Setup required'}
              </p>
              {filingReadiness.salesTax?.nextDeadline && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Next: {new Date(filingReadiness.salesTax.nextDeadline).toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              filingReadiness.payrollTax?.ready ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center mb-2">
                <ShieldCheckIcon className={`h-5 w-5 mr-2 ${
                  filingReadiness.payrollTax?.ready ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className="font-medium">Payroll Tax</span>
              </div>
              <p className="text-sm text-gray-600">
                {filingReadiness.payrollTax?.ready ? 'Ready to file' : 'Setup required'}
              </p>
              {filingReadiness.payrollTax?.nextDeadline && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Next: {new Date(filingReadiness.payrollTax.nextDeadline).toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              filingReadiness.incomeTax?.ready ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center mb-2">
                <ShieldCheckIcon className={`h-5 w-5 mr-2 ${
                  filingReadiness.incomeTax?.ready ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className="font-medium">Income Tax</span>
              </div>
              <p className="text-sm text-gray-600">
                {filingReadiness.incomeTax?.ready ? 'Ready to file' : 'Setup required'}
              </p>
              {filingReadiness.incomeTax?.nextDeadline && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Next: {new Date(filingReadiness.incomeTax.nextDeadline).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Sales Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Sales Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Collected</span>
              <span className="font-medium">${(taxSummary.salesTax?.collected || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Filed</span>
              <span className="font-medium">${(taxSummary.salesTax?.filed || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Due</span>
              <span className="font-bold text-red-600">${(taxSummary.salesTax?.due || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Income Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Income Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated</span>
              <span className="font-medium">${(taxSummary.incomeTax?.estimated || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid</span>
              <span className="font-medium">${(taxSummary.incomeTax?.paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Remaining</span>
              <span className="font-bold text-orange-600">${(taxSummary.incomeTax?.remaining || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payroll Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Payroll Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Withheld</span>
              <span className="font-medium">${(taxSummary.payrollTax?.withheld || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deposited</span>
              <span className="font-medium">${(taxSummary.payrollTax?.deposited || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Pending</span>
              <span className="font-bold text-yellow-600">${(taxSummary.payrollTax?.pending || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Filings and Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Filings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Upcoming Filings</h2>
          <div className="space-y-3">
            {upcomingFilings.length > 0 ? (
              upcomingFilings.map((filing, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="font-medium">{filing.form_type}</div>
                  <div className="text-sm text-gray-600">Due: {new Date(filing.due_date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-500">{filing.description}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No upcoming filings</p>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-3 py-2">
                  <div className="font-medium">{activity.type}</div>
                  <div className="text-sm text-gray-600">{new Date(activity.date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-500">{activity.description}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxesDashboard;