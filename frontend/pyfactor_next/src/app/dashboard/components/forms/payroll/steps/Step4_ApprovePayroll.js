'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';

export default function Step4_ApprovePayroll({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious 
}) {
  const [approvals, setApprovals] = useState(payrollData.approvals || {
    reviewedAmounts: false,
    verifiedDeductions: false,
    confirmedDates: false,
    acceptedFees: false
  });
  const [downloading, setDownloading] = useState(false);
  const [platformFee, setPlatformFee] = useState(0);
  const [transferFees, setTransferFees] = useState(0);

  useEffect(() => {
    calculateFees();
  }, [payrollData.deductions]);

  const calculateFees = () => {
    if (payrollData.deductions) {
      const totalNet = payrollData.deductions.totalNet;
      const platformFeeAmount = totalNet * 0.024; // 2.4% platform fee
      const transferFeesAmount = payrollData.deductions.employees.length * 0.50; // $0.50 per employee
      
      setPlatformFee(platformFeeAmount);
      setTransferFees(transferFeesAmount);
    }
  };

  const handleApprovalChange = (key, value) => {
    const newApprovals = { ...approvals, [key]: value };
    setApprovals(newApprovals);
    updatePayrollData('approvals', newApprovals);
  };

  const allApproved = Object.values(approvals).every(v => v);
  
  const totalDue = payrollData.deductions 
    ? payrollData.deductions.totalNet + platformFee + transferFees 
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const downloadPayrollPreview = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/payroll/preview-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payrollData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-preview-${payrollData.payPeriod.payDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error('Error downloading payroll preview:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadPayStubs = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/payroll/preview-paystubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payrollData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paystubs-preview-${payrollData.payPeriod.payDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error('Error downloading pay stubs:', error);
    } finally {
      setDownloading(false);
    }
  };

  const approvePayroll = async () => {
    try {
      const response = await fetch('/api/payroll/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          approvals
        })
      });
      
      if (response.ok) {
        onNext();
      }
    } catch (error) {
      logger.error('Error approving payroll:', error);
    }
  };

  if (!payrollData.deductions) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please complete previous steps first.</p>
        <button
          onClick={onPrevious}
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  const employeeCount = payrollData.deductions.employees.length;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <CheckCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
          Final Approval
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Review and approve payroll before processing
        </p>
      </div>

      {/* Payroll Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Payroll Summary for {formatDate(payrollData.payPeriod.payDate)}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Employees</p>
            <p className="text-2xl font-semibold text-gray-900">{employeeCount}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Payroll</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(payrollData.deductions.totalNet)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Platform Fee (2.4%)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(platformFee)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Transfer Fees</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(transferFees)}
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-blue-900">Total Amount Due</span>
            <span className="text-2xl font-bold text-blue-900">
              {formatCurrency(totalDue)}
            </span>
          </div>
        </div>
      </div>

      {/* Approval Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Checklist</h3>
        
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={approvals.reviewedAmounts}
              onChange={(e) => handleApprovalChange('reviewedAmounts', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="ml-3 text-sm text-gray-700">
              I've reviewed all payment amounts and they are correct
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={approvals.verifiedDeductions}
              onChange={(e) => handleApprovalChange('verifiedDeductions', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="ml-3 text-sm text-gray-700">
              All tax calculations and deductions are accurate
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={approvals.confirmedDates}
              onChange={(e) => handleApprovalChange('confirmedDates', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="ml-3 text-sm text-gray-700">
              Payment date of {formatDate(payrollData.payPeriod.payDate)} is correct
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={approvals.acceptedFees}
              onChange={(e) => handleApprovalChange('acceptedFees', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="ml-3 text-sm text-gray-700">
              I accept the platform fee of {formatCurrency(platformFee)} (2.4%)
            </span>
          </label>
        </div>
      </div>

      {/* Download Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-3">Review documents before approving:</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadPayrollPreview}
            disabled={downloading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download Payroll Preview (PDF)'}
          </button>
          <button
            onClick={downloadPayStubs}
            disabled={downloading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Preview Pay Stubs'}
          </button>
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
          onClick={approvePayroll}
          disabled={!allApproved}
          className={`
            px-6 py-2 text-sm font-medium rounded-md
            ${allApproved
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {allApproved ? '✅ Approve Payroll' : 'Complete all checks to approve'}
        </button>
      </div>
    </div>
  );
}