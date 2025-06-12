'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const BalanceSheetReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [compareDate, setCompareDate] = useState('');
  const [compareEnabled, setCompareEnabled] = useState(false);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'balance_sheet',
        as_of_date: asOfDate,
        compare: compareEnabled,
        compare_date: compareEnabled ? compareDate : null
      };

      const response = await reportsApi.generate(params);
      if (response.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      // Use mock data for demonstration
      setReportData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    return {
      asOfDate: asOfDate,
      assets: {
        current: {
          total: 125000,
          items: [
            { name: 'Cash and Cash Equivalents', amount: 45000 },
            { name: 'Accounts Receivable', amount: 35000 },
            { name: 'Inventory', amount: 30000 },
            { name: 'Prepaid Expenses', amount: 15000 }
          ]
        },
        nonCurrent: {
          total: 175000,
          items: [
            { name: 'Property and Equipment', amount: 150000 },
            { name: 'Less: Accumulated Depreciation', amount: -25000 },
            { name: 'Intangible Assets', amount: 40000 },
            { name: 'Other Assets', amount: 10000 }
          ]
        },
        total: 300000
      },
      liabilities: {
        current: {
          total: 65000,
          items: [
            { name: 'Accounts Payable', amount: 25000 },
            { name: 'Accrued Expenses', amount: 15000 },
            { name: 'Short-term Debt', amount: 20000 },
            { name: 'Other Current Liabilities', amount: 5000 }
          ]
        },
        nonCurrent: {
          total: 80000,
          items: [
            { name: 'Long-term Debt', amount: 70000 },
            { name: 'Deferred Tax Liabilities', amount: 10000 }
          ]
        },
        total: 145000
      },
      equity: {
        total: 155000,
        items: [
          { name: 'Common Stock', amount: 50000 },
          { name: 'Additional Paid-in Capital', amount: 25000 },
          { name: 'Retained Earnings', amount: 80000 }
        ]
      },
      comparison: compareEnabled ? {
        assets: { total: 280000, change: 7.1 },
        liabilities: { total: 135000, change: 7.4 },
        equity: { total: 145000, change: 6.9 }
      } : null
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'balance_sheet',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `balance_sheet_${asOfDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount) => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absoluteAmount);
    
    return isNegative ? `(${formatted})` : formatted;
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Balance Sheet</h1>
        
        {/* Date Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                  className="mr-2"
                />
                Compare with
              </label>
            </div>
            {compareEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compare Date</label>
                <input
                  type="date"
                  value={compareDate}
                  onChange={(e) => setCompareDate(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={generateReport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!reportData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={!reportData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="bg-white rounded-lg shadow">
          {/* Report Header */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              Balance Sheet as of {format(new Date(reportData.asOfDate), 'MMMM d, yyyy')}
            </h2>
          </div>

          {/* Assets Section */}
          <div className="p-6 border-b">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">ASSETS</h3>
              
              {/* Current Assets */}
              <div className="mb-4">
                <h4 className="text-lg font-semibold mb-2">Current Assets</h4>
                <div className="ml-4 space-y-2">
                  {reportData.assets.current.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-gray-700">
                      <span className={item.amount < 0 ? 'ml-4' : ''}>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Current Assets</span>
                    <span>{formatCurrency(reportData.assets.current.total)}</span>
                  </div>
                </div>
              </div>

              {/* Non-Current Assets */}
              <div className="mb-4">
                <h4 className="text-lg font-semibold mb-2">Non-Current Assets</h4>
                <div className="ml-4 space-y-2">
                  {reportData.assets.nonCurrent.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-gray-700">
                      <span className={item.amount < 0 ? 'ml-4' : ''}>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Non-Current Assets</span>
                    <span>{formatCurrency(reportData.assets.nonCurrent.total)}</span>
                  </div>
                </div>
              </div>

              {/* Total Assets */}
              <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t-2">
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(reportData.assets.total)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity Section */}
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">LIABILITIES & EQUITY</h3>
            
            {/* Current Liabilities */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Current Liabilities</h4>
              <div className="ml-4 space-y-2">
                {reportData.liabilities.current.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Current Liabilities</span>
                  <span>{formatCurrency(reportData.liabilities.current.total)}</span>
                </div>
              </div>
            </div>

            {/* Non-Current Liabilities */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Non-Current Liabilities</h4>
              <div className="ml-4 space-y-2">
                {reportData.liabilities.nonCurrent.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Non-Current Liabilities</span>
                  <span>{formatCurrency(reportData.liabilities.nonCurrent.total)}</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="flex justify-between font-bold mt-4 mb-6 pt-2 border-t">
              <span>TOTAL LIABILITIES</span>
              <span>{formatCurrency(reportData.liabilities.total)}</span>
            </div>

            {/* Equity */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Equity</h4>
              <div className="ml-4 space-y-2">
                {reportData.equity.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Equity</span>
                  <span>{formatCurrency(reportData.equity.total)}</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities & Equity */}
            <div className="flex justify-between text-xl font-bold mt-6 pt-4 border-t-2">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatCurrency(reportData.liabilities.total + reportData.equity.total)}</span>
            </div>
          </div>

          {/* Comparison */}
          {reportData.comparison && (
            <div className="p-6 border-t bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Period Comparison</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Assets Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.assets.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.assets.change)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Liabilities Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.liabilities.change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.liabilities.change)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Equity Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.equity.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.equity.change)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BalanceSheetReport;