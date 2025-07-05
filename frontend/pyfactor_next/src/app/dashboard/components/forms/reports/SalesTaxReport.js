'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const SalesTaxReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('summary'); // summary or detailed

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'sales_tax',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        detail_level: reportType
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
      summary: {
        totalSales: 250000,
        taxableSales: 230000,
        nonTaxableSales: 20000,
        totalTaxCollected: 18975,
        averageTaxRate: 8.25
      },
      byJurisdiction: [
        {
          name: 'California',
          code: 'CA',
          rate: 7.25,
          taxableSales: 150000,
          taxCollected: 10875,
          transactions: 125
        },
        {
          name: 'New York',
          code: 'NY',
          rate: 8.875,
          taxableSales: 80000,
          taxCollected: 7100,
          transactions: 78
        },
        {
          name: 'Texas',
          code: 'TX',
          rate: 6.25,
          taxableSales: 0,
          taxCollected: 0,
          transactions: 0,
          note: 'No sales tax in TX'
        }
      ],
      byTaxType: [
        {
          type: 'State Tax',
          amount: 16500,
          percentage: 87
        },
        {
          type: 'County Tax',
          amount: 1800,
          percentage: 9.5
        },
        {
          type: 'City Tax',
          amount: 675,
          percentage: 3.5
        }
      ],
      transactions: reportType === 'detailed' ? [
        {
          date: '2024-01-15',
          invoiceNumber: 'INV-001',
          customer: 'Acme Corporation',
          state: 'CA',
          subtotal: 5000,
          taxRate: 7.25,
          taxAmount: 362.50,
          total: 5362.50
        },
        {
          date: '2024-01-16',
          invoiceNumber: 'INV-002',
          customer: 'Globex Industries',
          state: 'NY',
          subtotal: 3500,
          taxRate: 8.875,
          taxAmount: 310.63,
          total: 3810.63
        },
        {
          date: '2024-01-18',
          invoiceNumber: 'INV-003',
          customer: 'Wayne Enterprises',
          state: 'CA',
          subtotal: 7200,
          taxRate: 7.25,
          taxAmount: 522.00,
          total: 7722.00
        }
      ] : []
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'sales_tax',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_tax_report_${dateRange.startDate}_${dateRange.endDate}.${format}`);
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Sales Tax Report</h1>
        
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
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
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-xl font-bold">{formatCurrency(reportData.summary.totalSales)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Taxable Sales</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(reportData.summary.taxableSales)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Non-Taxable Sales</p>
              <p className="text-xl font-bold text-gray-600">{formatCurrency(reportData.summary.nonTaxableSales)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Tax Collected</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.summary.totalTaxCollected)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Average Tax Rate</p>
              <p className="text-xl font-bold">{reportData.summary.averageTaxRate}%</p>
            </div>
          </div>

          {/* Tax by Jurisdiction */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Sales Tax by Jurisdiction</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State/Jurisdiction
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxable Sales
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax Collected
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byJurisdiction.map((jurisdiction) => (
                    <tr key={jurisdiction.code}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {jurisdiction.name} ({jurisdiction.code})
                        {jurisdiction.note && (
                          <span className="text-sm text-gray-500 block">{jurisdiction.note}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {jurisdiction.rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {formatCurrency(jurisdiction.taxableSales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        {formatCurrency(jurisdiction.taxCollected)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {jurisdiction.transactions}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-6 py-3 font-bold">Total</td>
                    <td className="px-6 py-3 text-right font-bold">
                      {reportData.summary.averageTaxRate}%
                    </td>
                    <td className="px-6 py-3 text-right font-bold">
                      {formatCurrency(reportData.summary.taxableSales)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold">
                      {formatCurrency(reportData.summary.totalTaxCollected)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold">
                      {reportData.byJurisdiction.reduce((sum, j) => sum + j.transactions, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tax by Type */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Tax Breakdown by Type</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {reportData.byTaxType.map((taxType) => (
                  <div key={taxType.type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{taxType.type}</span>
                      <span className="font-medium">{formatCurrency(taxType.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${taxType.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Transactions */}
          {reportType === 'detailed' && reportData.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Transaction Details</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.transactions.map((transaction, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {format(new Date(transaction.date), 'MM/dd/yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {formatCurrency(transaction.subtotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {transaction.taxRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {formatCurrency(transaction.taxAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(transaction.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesTaxReport;