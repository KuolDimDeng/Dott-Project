'use client';

import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, DocumentTextIcon, ChartBarIcon, BuildingLibraryIcon, CheckCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';

export default function Step7_ConfirmDistribute({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious,
  isLastStep 
}) {
  const [distributionTasks, setDistributionTasks] = useState(payrollData.distributionTasks || {
    payStubs: 'pending',
    notifications: 'pending',
    reports: 'pending',
    filings: 'pending'
  });
  const [sendOptions, setSendOptions] = useState({
    sendViaEmail: true,
    sendViaSMS: false,
    employeePortal: true
  });
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generatePayStubs = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/payroll/generate-paystubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          sendOptions
        })
      });
      
      if (response.ok) {
        setDistributionTasks(prev => ({ ...prev, payStubs: 'complete' }));
        updatePayrollData('distributionTasks', { ...distributionTasks, payStubs: 'complete' });
        
        if (sendOptions.sendViaEmail || sendOptions.sendViaSMS) {
          await sendNotifications();
        }
      }
    } catch (error) {
      logger.error('Error generating pay stubs:', error);
      setDistributionTasks(prev => ({ ...prev, payStubs: 'error' }));
    } finally {
      setGenerating(false);
    }
  };

  const sendNotifications = async () => {
    try {
      setSending(true);
      const response = await fetch('/api/payroll/send-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          sendOptions
        })
      });
      
      if (response.ok) {
        setDistributionTasks(prev => ({ ...prev, notifications: 'complete' }));
        updatePayrollData('distributionTasks', { ...distributionTasks, notifications: 'complete' });
      }
    } catch (error) {
      logger.error('Error sending notifications:', error);
      setDistributionTasks(prev => ({ ...prev, notifications: 'error' }));
    } finally {
      setSending(false);
    }
  };

  const generateReports = async () => {
    try {
      const response = await fetch('/api/payroll/generate-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ payrollId: payrollData.id })
      });
      
      if (response.ok) {
        setDistributionTasks(prev => ({ ...prev, reports: 'complete' }));
        updatePayrollData('distributionTasks', { ...distributionTasks, reports: 'complete' });
      }
    } catch (error) {
      logger.error('Error generating reports:', error);
    }
  };

  const downloadReport = async (reportType) => {
    try {
      const response = await fetch(`/api/payroll/download-report/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ payrollId: payrollData.id })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-${payrollData.payPeriod.payDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error(`Error downloading ${reportType} report:`, error);
    }
  };

  const completePayroll = async () => {
    try {
      const response = await fetch('/api/payroll/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ payrollId: payrollData.id })
      });
      
      if (response.ok) {
        window.location.href = '/dashboard/payroll/success';
      }
    } catch (error) {
      logger.error('Error completing payroll:', error);
    }
  };

  const scheduleNextPayroll = () => {
    window.location.href = '/dashboard/payroll/schedule';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getNextPayrollDate = () => {
    const currentDate = new Date(payrollData.payPeriod.payDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
    return currentDate.toISOString().split('T')[0];
  };

  const calculateQuarterlyDeadline = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const year = now.getFullYear();
    const deadlines = [
      new Date(year, 3, 30), // Q1: April 30
      new Date(year, 6, 31), // Q2: July 31
      new Date(year, 9, 31), // Q3: October 31
      new Date(year + 1, 0, 31) // Q4: January 31
    ];
    return deadlines[quarter];
  };

  const calculateStateDeadline = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return nextMonth;
  };

  const totalWithholding = payrollData.deductions?.employees.reduce((sum, emp) => {
    return sum + (emp.federalTax || 0) + (emp.stateTax || 0) + (emp.socialSecurity || 0) + (emp.medicare || 0);
  }, 0) || 0;

  const stateTax = payrollData.deductions?.employees.reduce((sum, emp) => {
    return sum + (emp.stateTax || 0);
  }, 0) || 0;

  const allTasksComplete = Object.values(distributionTasks).every(status => status === 'complete');

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <EnvelopeIcon className="h-6 w-6 text-blue-600 mr-2" />
          Complete Payroll
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Send pay stubs and finalize records
        </p>
      </div>

      {/* Distribution Tasks */}
      <div className="space-y-4">
        {/* Generate & Send Pay Stubs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Generate & Send Pay Stubs</h3>
            </div>
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${distributionTasks.payStubs === 'complete' 
                ? 'bg-green-100 text-green-800' 
                : distributionTasks.payStubs === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
              }
            `}>
              {distributionTasks.payStubs === 'complete' ? 'Complete' : 
               distributionTasks.payStubs === 'error' ? 'Error' : 'Pending'}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendOptions.sendViaEmail}
                onChange={(e) => setSendOptions(prev => ({ ...prev, sendViaEmail: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Email to employees</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendOptions.sendViaSMS}
                onChange={(e) => setSendOptions(prev => ({ ...prev, sendViaSMS: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">SMS notification</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendOptions.employeePortal}
                onChange={(e) => setSendOptions(prev => ({ ...prev, employeePortal: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Available in employee portal</span>
            </label>
          </div>
          
          <button
            onClick={generatePayStubs}
            disabled={generating || distributionTasks.payStubs === 'complete'}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${distributionTasks.payStubs === 'complete'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {generating ? 'Generating...' : 
             distributionTasks.payStubs === 'complete' ? 'Completed' : 'Generate Pay Stubs'}
          </button>
        </div>

        {/* Send Payment Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Send Payment Notifications</h3>
            </div>
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${distributionTasks.notifications === 'complete' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
              }
            `}>
              {distributionTasks.notifications === 'complete' ? 'Complete' : 'Pending'}
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 font-medium mb-2">Notification Preview:</p>
            <p className="text-sm text-gray-600 italic">
              Hi [Employee Name], your salary of [Net Pay] has been sent to your [Payment Method]. 
              View your pay stub in the employee portal or check your email.
            </p>
          </div>
          
          <button
            onClick={sendNotifications}
            disabled={sending || distributionTasks.notifications === 'complete' || distributionTasks.payStubs !== 'complete'}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${distributionTasks.notifications === 'complete' || distributionTasks.payStubs !== 'complete'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {sending ? 'Sending...' : 
             distributionTasks.notifications === 'complete' ? 'Sent' : 'Send All Notifications'}
          </button>
        </div>

        {/* Generate Reports */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Generate Reports</h3>
            </div>
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${distributionTasks.reports === 'complete' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
              }
            `}>
              {distributionTasks.reports === 'complete' ? 'Complete' : 'Pending'}
            </span>
          </div>
          
          {distributionTasks.reports !== 'complete' && (
            <button
              onClick={generateReports}
              className="mb-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Generate All Reports
            </button>
          )}
          
          {distributionTasks.reports === 'complete' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Payroll Summary Report</span>
                <button
                  onClick={() => downloadReport('summary')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Tax Remittance Report</span>
                <button
                  onClick={() => downloadReport('tax')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Bank Transfer Report</span>
                <button
                  onClick={() => downloadReport('bank')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tax Filings & Remittances */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <BuildingLibraryIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Tax Filings & Remittances</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-yellow-900">IRS - Form 941</p>
                  <p className="text-sm text-yellow-700">Due: {formatDate(calculateQuarterlyDeadline())}</p>
                </div>
                <p className="text-sm font-medium text-yellow-900">
                  Withholding: {formatCurrency(totalWithholding)}
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-yellow-900">State Tax Remittance</p>
                  <p className="text-sm text-yellow-700">Due: {formatDate(calculateStateDeadline())}</p>
                </div>
                <p className="text-sm font-medium text-yellow-900">
                  State tax: {formatCurrency(stateTax)}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => window.location.href = '/dashboard/taxes/filings'}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Go to Tax Filings →
          </button>
        </div>
      </div>

      {/* Final Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-6">
          <CalendarDaysIcon className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule Next Payroll</h3>
          <p className="text-sm text-gray-600 mb-3">
            Next run: {formatDate(getNextPayrollDate())}
          </p>
          <button
            onClick={scheduleNextPayroll}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Set Reminder
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6">
          <CheckCircleIcon className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
          <div className="space-y-1">
            <a href="/help/payroll" className="block text-sm text-blue-600 hover:text-blue-800">
              View payroll FAQ
            </a>
            <a href="/support" className="block text-sm text-blue-600 hover:text-blue-800">
              Contact support
            </a>
            <a href="/schedule" className="block text-sm text-blue-600 hover:text-blue-800">
              Schedule consultation
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={completePayroll}
          disabled={!allTasksComplete}
          className={`
            px-6 py-2 text-sm font-medium rounded-md flex items-center
            ${allTasksComplete
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Complete Payroll
        </button>
      </div>
    </div>
  );
}