'use client';

import React, { useState } from 'react';
import { 
  CurrencyDollarIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import PayrollProcessingWizard from '@/app/dashboard/components/forms/payroll/PayrollProcessingWizard';

/**
 * Payroll Dashboard Page
 * Shows payroll history and allows running new payroll
 */
function PayrollDashboard() {
  const [showWizard, setShowWizard] = useState(false);
  
  // Mock payroll history data
  const payrollHistory = [
    {
      id: 1,
      payPeriod: { start: '2024-01-01', end: '2024-01-14' },
      payDate: '2024-01-19',
      status: 'completed',
      employeeCount: 15,
      totalGross: 45250.00,
      totalNet: 32150.00,
      totalTaxes: 13100.00
    },
    {
      id: 2,
      payPeriod: { start: '2024-01-15', end: '2024-01-28' },
      payDate: '2024-02-02',
      status: 'processing',
      employeeCount: 15,
      totalGross: 46500.00,
      totalNet: 33050.00,
      totalTaxes: 13450.00
    }
  ];

  const getStatusBadge = (status) => {
    const config = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      processing: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      failed: { color: 'bg-red-100 text-red-800', icon: DocumentTextIcon }
    };
    
    const { color, icon: Icon } = config[status] || config.completed;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (showWizard) {
    return (
      <div className="p-6">
        <PayrollProcessingWizard onClose={() => setShowWizard(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
              Payroll Management
            </h1>
            <p className="text-gray-600 mt-1">Process payroll and view payment history</p>
          </div>
          
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <PlusCircleIcon className="h-5 w-5" />
            <span>Run Payroll</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Next Pay Date</p>
              <p className="text-2xl font-semibold text-gray-900">Feb 16</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last Payroll</p>
              <p className="text-2xl font-semibold text-gray-900">$45,250</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">YTD Payroll</p>
              <p className="text-2xl font-semibold text-gray-900">$542,300</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Payrolls Run</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowWizard(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <PlayIcon className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Run Payroll</p>
            <p className="text-sm text-gray-500">Process next payroll cycle</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard/timesheets'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <DocumentTextIcon className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Review Timesheets</p>
            <p className="text-sm text-gray-500">Approve pending timesheets</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard/employees/pay'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <CurrencyDollarIcon className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Pay Settings</p>
            <p className="text-sm text-gray-500">Manage employee pay info</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard/reports/payroll'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <ChartBarIcon className="h-6 w-6 text-orange-600 mb-2" />
            <p className="font-medium text-gray-900">Payroll Reports</p>
            <p className="text-sm text-gray-500">View analytics & reports</p>
          </button>
        </div>
      </div>

      {/* Payroll History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Payroll History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollHistory.map((payroll) => (
                <tr key={payroll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(payroll.payPeriod.start), 'MMM d')} - {format(new Date(payroll.payPeriod.end), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(payroll.payDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payroll.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll.employeeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payroll.totalGross.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payroll.totalNet.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      View
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PayrollDashboard;