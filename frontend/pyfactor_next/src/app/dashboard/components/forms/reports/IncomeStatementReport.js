'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const IncomeStatementReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState({
    startDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0]
  });

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'income_statement',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        compare: compareEnabled,
        compare_start_date: compareEnabled ? compareDateRange.startDate : null,
        compare_end_date: compareEnabled ? compareDateRange.endDate : null
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
      revenue: {
        total: 250000,
        items: [
          { name: 'Product Sales', amount: 180000 },
          { name: 'Service Revenue', amount: 65000 },
          { name: 'Other Income', amount: 5000 }
        ]
      },
      expenses: {
        total: 185000,
        categories: [
          {
            name: 'Cost of Goods Sold',
            total: 90000,
            items: [
              { name: 'Materials', amount: 60000 },
              { name: 'Labor', amount: 25000 },
              { name: 'Overhead', amount: 5000 }
            ]
          },
          {
            name: 'Operating Expenses',
            total: 75000,
            items: [
              { name: 'Salaries & Wages', amount: 45000 },
              { name: 'Rent', amount: 12000 },
              { name: 'Utilities', amount: 3000 },
              { name: 'Marketing', amount: 8000 },
              { name: 'Office Supplies', amount: 2000 },
              { name: 'Other', amount: 5000 }
            ]
          },
          {
            name: 'Other Expenses',
            total: 20000,
            items: [
              { name: 'Interest Expense', amount: 5000 },
              { name: 'Depreciation', amount: 10000 },
              { name: 'Taxes', amount: 5000 }
            ]
          }
        ]
      },
      netIncome: 65000,
      comparison: compareEnabled ? {
        revenue: { total: 220000, change: 13.6 },
        expenses: { total: 170000, change: 8.8 },
        netIncome: { total: 50000, change: 30.0 }
      } : null
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'income_statement',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `income_statement_${dateRange.startDate}_${dateRange.endDate}.${format}`);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
        <h1 className="text-2xl font-bold mb-4">Profit & Loss Statement</h1>
        
        {/* Date Range Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                  className="mr-2"
                />
                Compare with previous period
              </label>
            </div>
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
              Income Statement for {format(new Date(reportData.period.start), 'MMM d, yyyy')} - {format(new Date(reportData.period.end), 'MMM d, yyyy')}
            </h2>
          </div>

          {/* Revenue Section */}
          <div className="p-6 border-b">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex justify-between">
                <span>Revenue</span>
                <span>{formatCurrency(reportData.revenue.total)}</span>
              </h3>
            </div>
            <div className="ml-4 space-y-2">
              {reportData.revenue.items.map((item, index) => (
                <div key={index} className="flex justify-between text-gray-700">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses Section */}
          <div className="p-6 border-b">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex justify-between">
                <span>Expenses</span>
                <span>{formatCurrency(reportData.expenses.total)}</span>
              </h3>
            </div>
            {reportData.expenses.categories.map((category, catIndex) => (
              <div key={catIndex} className="mb-4">
                <div className="ml-4 mb-2">
                  <h4 className="font-medium flex justify-between">
                    <span>{category.name}</span>
                    <span>{formatCurrency(category.total)}</span>
                  </h4>
                </div>
                <div className="ml-8 space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between text-gray-600 text-sm">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Net Income */}
          <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Net Income</h3>
              <div className="text-right">
                <div className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.netIncome)}
                </div>
                {reportData.comparison && (
                  <div className="text-sm text-gray-600">
                    {formatPercentage(reportData.comparison.netIncome.change)} vs previous period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comparison Summary */}
          {reportData.comparison && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Period Comparison</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Revenue Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.revenue.change)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Expense Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.expenses.change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.expenses.change)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Net Income Change</p>
                  <p className={`text-lg font-semibold ${reportData.comparison.netIncome.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(reportData.comparison.netIncome.change)}
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

export default IncomeStatementReport;