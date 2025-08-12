'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

export default function MobilePayStubsPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [payStubs, setPayStubs] = useState([]);
  const [loadingStubs, setLoadingStubs] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPayStub, setSelectedPayStub] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session) {
      loadPayStubs();
    }
  }, [session, selectedYear]);

  const loadPayStubs = async () => {
    try {
      setLoadingStubs(true);
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
      setLoadingStubs(false);
      setRefreshing(false);
    }
  };

  const downloadPayStub = async (payStubId, e) => {
    e?.stopPropagation();
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayStubs();
  };

  const availableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <DocumentTextIcon className="w-16 h-16 text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pay Stubs</h2>
        <p className="text-gray-600 text-center mb-6">Sign in to view your pay stubs</p>
        <Link
          href="/auth/mobile-login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/mobile')}
                className="mr-3"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold">Pay Stubs</h1>
            </div>
            <button
              onClick={handleRefresh}
              className={`p-2 ${refreshing ? 'animate-spin' : ''}`}
              disabled={refreshing}
            >
              <ArrowPathIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Year Selector */}
        <div className="px-4 pb-3 border-b">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {availableYears().map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pay Stubs List */}
      <div className="px-4 py-4">
        {loadingStubs ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <div
                key={payStub.id}
                onClick={() => setSelectedPayStub(payStub)}
                className="bg-white rounded-lg shadow-sm p-4 cursor-pointer active:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(payStub.payPeriodStart)} - {formatDate(payStub.payPeriodEnd)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Pay Date: {formatDate(payStub.payDate)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => downloadPayStub(payStub.id, e)}
                    className="p-2 text-blue-600"
                    disabled={downloading}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Gross</p>
                    <p className="font-medium">{formatCurrency(payStub.grossPay)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deductions</p>
                    <p className="font-medium text-red-600">-{formatCurrency(payStub.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Net Pay</p>
                    <p className="font-semibold text-green-600">{formatCurrency(payStub.netPay)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pay Stub Detail Modal */}
      {selectedPayStub && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[90vh] rounded-t-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pay Stub Details</h3>
              <button
                onClick={() => setSelectedPayStub(null)}
                className="p-2"
              >
                <ChevronLeftIcon className="w-5 h-5 transform rotate-90" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-4 py-4 space-y-4 overflow-y-auto">
              {/* Pay Period */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Pay Period</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period</span>
                    <span>{formatDate(selectedPayStub.payPeriodStart)} - {formatDate(selectedPayStub.payPeriodEnd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pay Date</span>
                    <span>{formatDate(selectedPayStub.payDate)}</span>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Earnings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Regular Pay</span>
                    <span>{formatCurrency(selectedPayStub.regularPay || 0)}</span>
                  </div>
                  {selectedPayStub.overtimePay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime Pay</span>
                      <span>{formatCurrency(selectedPayStub.overtimePay)}</span>
                    </div>
                  )}
                  {selectedPayStub.bonuses > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bonuses</span>
                      <span>{formatCurrency(selectedPayStub.bonuses)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Gross Pay</span>
                    <span>{formatCurrency(selectedPayStub.grossPay)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Deductions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Federal Tax</span>
                    <span>{formatCurrency(selectedPayStub.federalTax || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">State Tax</span>
                    <span>{formatCurrency(selectedPayStub.stateTax || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Social Security</span>
                    <span>{formatCurrency(selectedPayStub.socialSecurity || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Medicare</span>
                    <span>{formatCurrency(selectedPayStub.medicare || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(selectedPayStub.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-blue-600 text-white rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-90">Net Pay</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedPayStub.netPay)}</p>
                  </div>
                  <CurrencyDollarIcon className="w-10 h-10 opacity-20" />
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={() => downloadPayStub(selectedPayStub.id)}
                disabled={downloading}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium"
              >
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}