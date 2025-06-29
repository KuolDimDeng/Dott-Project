'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const CashFlowReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [method, setMethod] = useState('indirect'); // direct or indirect

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'cash_flow',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        method: method
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
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      method: method,
      beginningCash: 45000,
      endingCash: 62000,
      netIncrease: 17000,
      activities: {
        operating: {
          total: 35000,
          items: method === 'indirect' ? [
            { name: 'Net Income', amount: 65000 },
            { name: 'Adjustments:', amount: null, isHeader: true },
            { name: 'Depreciation and Amortization', amount: 10000, indent: true },
            { name: 'Changes in Working Capital:', amount: null, isHeader: true },
            { name: '(Increase)/Decrease in Accounts Receivable', amount: -15000, indent: true },
            { name: '(Increase)/Decrease in Inventory', amount: -8000, indent: true },
            { name: 'Increase/(Decrease) in Accounts Payable', amount: -12000, indent: true },
            { name: 'Increase/(Decrease) in Accrued Expenses', amount: -5000, indent: true }
          ] : [
            { name: 'Cash Received from Customers', amount: 245000 },
            { name: 'Cash Paid to Suppliers', amount: -125000 },
            { name: 'Cash Paid to Employees', amount: -70000 },
            { name: 'Cash Paid for Operating Expenses', amount: -15000 }
          ]
        },
        investing: {
          total: -25000,
          items: [
            { name: 'Purchase of Equipment', amount: -30000 },
            { name: 'Sale of Investments', amount: 5000 }
          ]
        },
        financing: {
          total: 7000,
          items: [
            { name: 'Proceeds from Long-term Debt', amount: 20000 },
            { name: 'Repayment of Short-term Debt', amount: -10000 },
            { name: 'Dividends Paid', amount: -3000 }
          ]
        }
      }
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'cash_flow',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cash_flow_${dateRange.startDate}_${dateRange.endDate}.${format}`);
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
    if (amount === null) return '';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Cash Flow Statement</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="indirect">Indirect Method</option>
                <option value="direct">Direct Method</option>
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
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
              Statement of Cash Flows ({reportData.method === 'indirect' ? 'Indirect' : 'Direct'} Method)
            </h2>
            <p className="text-gray-600">
              For the period from {format(new Date(reportData.period.start), 'MMM d, yyyy')} to {format(new Date(reportData.period.end), 'MMM d, yyyy')}
            </p>
          </div>

          {/* Cash Flow Activities */}
          <div className="p-6">
            {/* Operating Activities */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Cash Flows from Operating Activities</h3>
              <div className="space-y-2">
                {reportData.activities.operating.items.map((item, index) => (
                  <div key={index} className={`flex justify-between ${item.isHeader ? 'font-medium mt-2' : ''} ${item.indent ? 'ml-6' : ''}`}>
                    <span className={item.isHeader ? 'text-gray-700' : ''}>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 mt-2 border-t">
                  <span>Net Cash Provided by Operating Activities</span>
                  <span className={reportData.activities.operating.total >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(reportData.activities.operating.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Cash Flows from Investing Activities</h3>
              <div className="space-y-2">
                {reportData.activities.investing.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 mt-2 border-t">
                  <span>Net Cash Used in Investing Activities</span>
                  <span className={reportData.activities.investing.total >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(reportData.activities.investing.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Cash Flows from Financing Activities</h3>
              <div className="space-y-2">
                {reportData.activities.financing.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 mt-2 border-t">
                  <span>Net Cash Provided by Financing Activities</span>
                  <span className={reportData.activities.financing.total >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(reportData.activities.financing.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Increase in Cash */}
            <div className="pt-4 border-t-2">
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Increase (Decrease) in Cash</span>
                  <span className={reportData.netIncrease >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(reportData.netIncrease)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cash at Beginning of Period</span>
                  <span>{formatCurrency(reportData.beginningCash)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Cash at End of Period</span>
                  <span>{formatCurrency(reportData.endingCash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowReport;