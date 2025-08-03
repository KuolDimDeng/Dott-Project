'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TaxReportsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('tax-liability');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);

  useEffect(() => {
    fetchSavedReports();
  }, []);

  useEffect(() => {
    if (reportType && dateRange.startDate && dateRange.endDate) {
      generateReport();
    }
  }, [reportType, dateRange]);

  const fetchSavedReports = async () => {
    try {
      const response = await taxesApi.reports.getSaved();
      if (response.data) {
        // Ensure data is an array
        setSavedReports(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      setSavedReports([]);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await taxesApi.reports.generate({
        type: reportType,
        ...dateRange
      });
      if (response.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format) => {
    try {
      const response = await taxesApi.reports.export({
        type: reportType,
        format,
        ...dateRange
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_report_${reportType}_${dateRange.startDate}_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const handleSaveReport = async () => {
    try {
      await taxesApi.reports.save({
        type: reportType,
        ...dateRange,
        data: reportData
      });
      toast.success('Report saved successfully');
      fetchSavedReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'tax-liability':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tax Liability Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(reportData.liabilities || {}).map(([taxType, amount]) => (
                <div key={taxType} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{taxType.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-xl font-bold">${amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Tax Liability</span>
                <span className="text-2xl font-bold text-red-600">
                  ${reportData.totalLiability?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'tax-payments':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tax Payments Summary</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payments Made</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.payments?.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.taxType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${payment.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Payments</span>
                <span className="text-2xl font-bold text-green-600">
                  ${reportData.totalPayments?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'year-end':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Year-End Tax Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-3">Income Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Gross Income</span>
                    <span>${reportData.income?.gross?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deductions</span>
                    <span>-${reportData.income?.deductions?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Taxable Income</span>
                    <span>${reportData.income?.taxable?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-3">Tax Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Tax Liability</span>
                    <span>${reportData.taxes?.liability?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Payments</span>
                    <span>-${reportData.taxes?.payments?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>{reportData.taxes?.balance >= 0 ? 'Amount Due' : 'Refund'}</span>
                    <span className={reportData.taxes?.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                      ${Math.abs(reportData.taxes?.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'quarterly':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Quarterly Tax Report</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quarter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Tax</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Income Tax</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payroll Tax</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.quarters?.map((quarter) => (
                    <tr key={quarter.name}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{quarter.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${quarter.salesTax.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${quarter.incomeTax.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${quarter.payrollTax.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">${quarter.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return <div>Select a report type to view data</div>;
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex justify-center items-center h-96">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tax Reports</h1>

      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="tax-liability">Tax Liability Report</option>
              <option value="tax-payments">Tax Payments Report</option>
              <option value="year-end">Year-End Summary</option>
              <option value="quarterly">Quarterly Tax Report</option>
            </select>
          </div>
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
          <div className="flex items-end gap-2">
            <button
              onClick={() => handleExportReport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={!reportData}
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExportReport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={!reportData}
            >
              Export CSV
            </button>
            <button
              onClick={handleSaveReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!reportData}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {loading ? (
          <CenteredSpinner size="medium" />
        ) : (
          renderReportContent()
        )}
      </div>

      {/* Saved Reports */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Saved Reports</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savedReports && savedReports.length > 0 ? savedReports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{report.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{report.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setReportType(report.type);
                        setDateRange({ startDate: report.startDate, endDate: report.endDate });
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No saved reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxReportsManagement;