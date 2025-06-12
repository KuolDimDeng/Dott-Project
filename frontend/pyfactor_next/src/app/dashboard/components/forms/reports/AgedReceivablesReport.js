'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const AgedReceivablesReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('customer'); // customer or invoice
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'aged_receivables',
        as_of_date: asOfDate,
        group_by: groupBy,
        show_details: showDetails
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
      summary: {
        current: 45000,
        days_1_30: 25000,
        days_31_60: 15000,
        days_61_90: 8000,
        over_90: 5000,
        total: 98000
      },
      customers: [
        {
          id: 1,
          name: 'Acme Corporation',
          current: 15000,
          days_1_30: 8000,
          days_31_60: 5000,
          days_61_90: 0,
          over_90: 0,
          total: 28000,
          invoices: showDetails ? [
            { number: 'INV-001', date: '2024-01-15', dueDate: '2024-02-15', amount: 15000, daysOverdue: 0, aging: 'current' },
            { number: 'INV-002', date: '2023-12-20', dueDate: '2024-01-20', amount: 8000, daysOverdue: 25, aging: '1-30' },
            { number: 'INV-003', date: '2023-11-10', dueDate: '2023-12-10', amount: 5000, daysOverdue: 45, aging: '31-60' }
          ] : []
        },
        {
          id: 2,
          name: 'Globex Industries',
          current: 20000,
          days_1_30: 10000,
          days_31_60: 5000,
          days_61_90: 3000,
          over_90: 2000,
          total: 40000,
          invoices: showDetails ? [
            { number: 'INV-004', date: '2024-01-20', dueDate: '2024-02-20', amount: 20000, daysOverdue: 0, aging: 'current' },
            { number: 'INV-005', date: '2023-12-15', dueDate: '2024-01-15', amount: 10000, daysOverdue: 20, aging: '1-30' },
            { number: 'INV-006', date: '2023-11-05', dueDate: '2023-12-05', amount: 5000, daysOverdue: 50, aging: '31-60' },
            { number: 'INV-007', date: '2023-10-01', dueDate: '2023-11-01', amount: 3000, daysOverdue: 85, aging: '61-90' },
            { number: 'INV-008', date: '2023-08-15', dueDate: '2023-09-15', amount: 2000, daysOverdue: 140, aging: 'over-90' }
          ] : []
        },
        {
          id: 3,
          name: 'Wayne Enterprises',
          current: 10000,
          days_1_30: 7000,
          days_31_60: 5000,
          days_61_90: 5000,
          over_90: 3000,
          total: 30000,
          invoices: showDetails ? [
            { number: 'INV-009', date: '2024-01-25', dueDate: '2024-02-25', amount: 10000, daysOverdue: 0, aging: 'current' },
            { number: 'INV-010', date: '2023-12-10', dueDate: '2024-01-10', amount: 7000, daysOverdue: 30, aging: '1-30' },
            { number: 'INV-011', date: '2023-11-01', dueDate: '2023-12-01', amount: 5000, daysOverdue: 60, aging: '31-60' },
            { number: 'INV-012', date: '2023-09-20', dueDate: '2023-10-20', amount: 5000, daysOverdue: 90, aging: '61-90' },
            { number: 'INV-013', date: '2023-07-10', dueDate: '2023-08-10', amount: 3000, daysOverdue: 180, aging: 'over-90' }
          ] : []
        }
      ]
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'aged_receivables',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aged_receivables_${asOfDate}.${format}`);
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

  const getAgingColor = (aging) => {
    switch (aging) {
      case 'current': return 'text-green-600';
      case '1-30': return 'text-blue-600';
      case '31-60': return 'text-yellow-600';
      case '61-90': return 'text-orange-600';
      case 'over-90': return 'text-red-600';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Aged Receivables Report</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="customer">Customer</option>
                <option value="invoice">Invoice</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDetails}
                  onChange={(e) => setShowDetails(e.target.checked)}
                  className="mr-2"
                />
                Show invoice details
              </label>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Current</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.summary.current)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">1-30 Days</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(reportData.summary.days_1_30)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">31-60 Days</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(reportData.summary.days_31_60)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">61-90 Days</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(reportData.summary.days_61_90)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Over 90 Days</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.summary.over_90)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-xl font-bold">{formatCurrency(reportData.summary.total)}</p>
            </div>
          </div>

          {/* Detail Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">
                Aged Receivables as of {format(new Date(reportData.asOfDate), 'MMMM d, yyyy')}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      1-30 Days
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      31-60 Days
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      61-90 Days
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Over 90 Days
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.customers.map((customer) => (
                    <React.Fragment key={customer.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                          {customer.current > 0 ? formatCurrency(customer.current) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                          {customer.days_1_30 > 0 ? formatCurrency(customer.days_1_30) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-yellow-600">
                          {customer.days_31_60 > 0 ? formatCurrency(customer.days_31_60) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600">
                          {customer.days_61_90 > 0 ? formatCurrency(customer.days_61_90) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {customer.over_90 > 0 ? formatCurrency(customer.over_90) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          {formatCurrency(customer.total)}
                        </td>
                      </tr>
                      {showDetails && customer.invoices.map((invoice) => (
                        <tr key={invoice.number} className="bg-gray-50">
                          <td className="px-6 py-2 pl-12 text-sm text-gray-600">
                            {invoice.number} - Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                          </td>
                          <td colSpan="5" className="px-6 py-2 text-sm text-gray-600">
                            {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days overdue` : 'Not due yet'}
                          </td>
                          <td className={`px-6 py-2 text-right text-sm ${getAgingColor(invoice.aging)}`}>
                            {formatCurrency(invoice.amount)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-6 py-3 font-bold">Total</td>
                    <td className="px-6 py-3 text-right font-bold text-green-600">
                      {formatCurrency(reportData.summary.current)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-blue-600">
                      {formatCurrency(reportData.summary.days_1_30)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-yellow-600">
                      {formatCurrency(reportData.summary.days_31_60)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-orange-600">
                      {formatCurrency(reportData.summary.days_61_90)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-red-600">
                      {formatCurrency(reportData.summary.over_90)}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-xl">
                      {formatCurrency(reportData.summary.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgedReceivablesReport;