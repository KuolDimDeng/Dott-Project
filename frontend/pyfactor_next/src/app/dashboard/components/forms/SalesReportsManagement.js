'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const SalesReportsManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('sales_summary');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const toast = useToast();

  const reportTypes = [
    { value: 'sales_summary', label: 'Sales Summary', description: 'Overview of total sales, orders, and revenue' },
    { value: 'sales_by_customer', label: 'Sales by Customer', description: 'Revenue breakdown by customer' },
    { value: 'sales_by_product', label: 'Sales by Product', description: 'Product performance analysis' },
    { value: 'sales_by_service', label: 'Sales by Service', description: 'Service revenue analysis' },
    { value: 'sales_trends', label: 'Sales Trends', description: 'Monthly and quarterly sales trends' },
    { value: 'invoice_aging', label: 'Invoice Aging', description: 'Outstanding invoices and payment status' },
    { value: 'estimate_conversion', label: 'Estimate Conversion', description: 'Conversion rate from estimates to orders' }
  ];

  useEffect(() => {
    if (activeTab === 1) {
      generateReport();
    }
  }, [activeTab, selectedReportType, dateRange]);

  const handleTabChange = (newTab) => {
    console.log('[DEBUG] Sales Reports - Tab changed to:', newTab);
    setActiveTab(newTab);
  };

  const handleReportTypeChange = (e) => {
    const newType = e.target.value;
    console.log('[DEBUG] Sales Reports - Report type changed to:', newType);
    setSelectedReportType(newType);
  };

  const handleDateRangeChange = (field, value) => {
    console.log('[DEBUG] Sales Reports - Date range changed:', field, value);
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = async () => {
    try {
      console.log('[DEBUG] Sales Reports - Generating report:', selectedReportType);
      console.log('[DEBUG] Sales Reports - Date range:', dateRange);
      
      setIsLoading(true);
      setReportData(null);

      const response = await axiosInstance.get('/reports/sales/', {
        params: {
          report_type: selectedReportType,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        }
      });

      console.log('[DEBUG] Sales Reports - Response received:', response.data);
      setReportData(response.data);
      
    } catch (error) {
      console.error('[DEBUG] Sales Reports - Error generating report:', error);
      
      if (error.response) {
        console.error('[DEBUG] Sales Reports - Response status:', error.response.status);
        console.error('[DEBUG] Sales Reports - Response data:', error.response.data);
        
        if (error.response.status === 404) {
          toast.error('Report endpoint not found. Sales reporting may not be configured.');
        } else if (error.response.data?.detail) {
          toast.error(`Failed to generate report: ${error.response.data.detail}`);
        } else {
          toast.error(`Failed to generate report. Status: ${error.response.status}`);
        }
      } else if (error.request) {
        console.error('[DEBUG] Sales Reports - No response received:', error.request);
        toast.error('Failed to generate report: No response from server');
      } else {
        console.error('[DEBUG] Sales Reports - Request setup error:', error.message);
        toast.error(`Failed to generate report: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const exportReport = (format) => {
    console.log('[DEBUG] Sales Reports - Exporting report as:', format);
    toast.info(`Exporting report as ${format}... (Feature coming soon)`);
  };

  const renderReportData = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <StandardSpinner size="medium" />
          <p className="mt-4 text-gray-500">Generating report...</p>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Click "Generate Report" to view the selected report</p>
        </div>
      );
    }


    // Render different report types
    switch (selectedReportType) {
      case 'sales_summary':
        return renderSalesSummary(reportData.data);
      case 'sales_by_customer':
        return renderSalesByCustomer(reportData.data);
      case 'sales_by_product':
        return renderSalesByProduct(reportData.data);
      case 'sales_by_service':
        return renderSalesByService(reportData.data);
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Report format not implemented yet</p>
            <pre className="mt-4 text-left bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(reportData.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderSalesSummary = (data) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Sales</h3>
        <p className="text-3xl font-bold text-blue-700">${data.total_sales?.toLocaleString() || '0'}</p>
      </div>
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Total Orders</h3>
        <p className="text-3xl font-bold text-green-700">{data.total_orders || 0}</p>
      </div>
      <div className="bg-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Total Customers</h3>
        <p className="text-3xl font-bold text-purple-700">{data.total_customers || 0}</p>
      </div>
      <div className="bg-orange-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-orange-900 mb-2">Avg Order Value</h3>
        <p className="text-3xl font-bold text-orange-700">${data.average_order_value?.toFixed(2) || '0.00'}</p>
      </div>
      <div className="bg-yellow-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Paid Invoices</h3>
        <p className="text-3xl font-bold text-yellow-700">{data.paid_invoices || 0}</p>
      </div>
      <div className="bg-red-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Unpaid Invoices</h3>
        <p className="text-3xl font-bold text-red-700">{data.unpaid_invoices || 0}</p>
      </div>
    </div>
  );

  const renderSalesByCustomer = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No customer sales data available for the selected period.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Count</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.customer_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.total_sales?.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSalesByProduct = (data) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Sold</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.total_sales?.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity_sold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSalesByService = (data) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Billed</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.service_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.total_sales?.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hours_billed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
        <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
        Sales Reports
      </h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 0
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Configure
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 1
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            View Report
          </button>
        </nav>
      </div>

      {/* Configure Tab */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Report Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                id="reportType"
                value={selectedReportType}
                onChange={handleReportTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {reportTypes.find(t => t.value === selectedReportType)?.description}
              </p>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  id="startDate"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="date"
                  id="endDate"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <StandardSpinner size="small" className="mr-2" />
                  Generating...
                </span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>
      )}

      {/* View Report Tab */}
      {activeTab === 1 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {reportTypes.find(t => t.value === selectedReportType)?.label || 'Report'}
            </h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => exportReport('PDF')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export PDF
              </button>
              <button
                onClick={() => exportReport('CSV')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Export CSV
              </button>
            </div>
          </div>
          
          {reportData && (
            <div className="mb-4 text-sm text-gray-500">
              Report Period: {dateRange.startDate} to {dateRange.endDate}
              {reportData.generated_at && (
                <span className="ml-4">
                  Generated: {new Date(reportData.generated_at).toLocaleString()}
                </span>
              )}
            </div>
          )}
          
          {renderReportData()}
        </div>
      )}
    </div>
  );
};

export default SalesReportsManagement;