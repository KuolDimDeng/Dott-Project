'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  ArrowDownTrayIcon, 
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';

export default function PayStubViewer({ isModal = false, onClose }) {
  const [payStubs, setPayStubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPayStub, setSelectedPayStub] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadPayStubs();
  }, [selectedYear]);

  const loadPayStubs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/paystubs?year=${selectedYear}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayStubs(data.payStubs || []);
      }
    } catch (error) {
      logger.error('Error loading pay stubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPayStub = async (payStubId) => {
    try {
      setDownloading(true);
      const response = await fetch(`/api/paystubs/${payStubId}/download`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paystub-${payStubId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error('Error downloading pay stub:', error);
    } finally {
      setDownloading(false);
    }
  };

  const viewPayStubDetails = (payStub) => {
    setSelectedPayStub(payStub);
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

  const availableYears = [...new Set(payStubs.map(stub => 
    new Date(stub.payDate).getFullYear()
  ))].sort((a, b) => b - a);

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">My Pay Stubs</h2>
        </div>
        {isModal && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Year Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          {availableYears.length > 0 ? (
            availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))
          ) : (
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          )}
        </select>
      </div>

      {/* Pay Stubs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <StandardSpinner size="large" />
        </div>
      ) : payStubs.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pay stubs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No pay stubs available for {selectedYear}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payStubs.map((payStub) => (
            <div key={payStub.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                {/* Pay Stub Info */}
                <div className="flex-1">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Pay Period: {formatDate(payStub.payPeriodStart)} - {formatDate(payStub.payPeriodEnd)}
                    </h3>
                  </div>
                  <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Pay Date:</span>
                      <span className="ml-1 text-gray-900">{formatDate(payStub.payDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Gross Pay:</span>
                      <span className="ml-1 text-gray-900">{formatCurrency(payStub.grossPay)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Deductions:</span>
                      <span className="ml-1 text-gray-900">{formatCurrency(payStub.totalDeductions)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Net Pay:</span>
                      <span className="ml-1 font-medium text-gray-900">{formatCurrency(payStub.netPay)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => viewPayStubDetails(payStub)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => downloadPayStub(payStub.id)}
                    disabled={downloading}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    {downloading ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay Stub Detail Modal */}
      {selectedPayStub && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Pay Stub Details
                </h3>
                <button
                  onClick={() => setSelectedPayStub(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Pay Stub Details */}
              <div className="space-y-4">
                {/* Pay Period */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Pay Period Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Pay Period:</span>
                      <p className="text-gray-900">
                        {formatDate(selectedPayStub.payPeriodStart)} - {formatDate(selectedPayStub.payPeriodEnd)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pay Date:</span>
                      <p className="text-gray-900">{formatDate(selectedPayStub.payDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Earnings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Regular Pay</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.regularPay || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime Pay</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.overtimePay || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bonuses</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.bonuses || 0)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-gray-900">Gross Pay</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.grossPay)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Deductions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Federal Tax</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.federalTax || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State Tax</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.stateTax || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Social Security</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.socialSecurity || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medicare</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.medicare || 0)}</span>
                    </div>
                    {selectedPayStub.otherDeductions && selectedPayStub.otherDeductions.map((deduction, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">{deduction.name}</span>
                        <span className="text-gray-900">{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-gray-900">Total Deductions</span>
                      <span className="text-gray-900">{formatCurrency(selectedPayStub.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-blue-900">Net Pay</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {formatCurrency(selectedPayStub.netPay)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedPayStub(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => downloadPayStub(selectedPayStub.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4">
        <div className="relative mx-auto p-5 border w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-md bg-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {content}
    </div>
  );
}