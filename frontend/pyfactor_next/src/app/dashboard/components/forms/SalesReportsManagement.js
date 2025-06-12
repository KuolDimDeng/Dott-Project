'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';

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

      const response = await axiosInstance.get('/api/reports/sales/', {
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

      // Set fallback data for demonstration
      setReportData({
        report_type: selectedReportType,
        date_range: dateRange,
        data: generateFallbackData(selectedReportType),
        generated_at: new Date().toISOString(),
        is_fallback: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackData = (reportType) => {
    console.log('[DEBUG] Sales Reports - Generating fallback data for:', reportType);
    
    switch (reportType) {
      case 'sales_summary':
        return {
          total_sales: 125436.78,
          total_orders: 45,
          total_customers: 23,
          average_order_value: 2787.48,
          growth_rate: 12.5
        };
      case 'sales_by_customer':
        return [
          { customer_name: 'ABC Corp', total_sales: 25000, order_count: 8 },
          { customer_name: 'XYZ Industries', total_sales: 18500, order_count: 5 },
          { customer_name: 'Tech Solutions', total_sales: 15000, order_count: 6 },
          { customer_name: 'Global Systems', total_sales: 12000, order_count: 4 },
          { customer_name: 'Innovation LLC', total_sales: 8500, order_count: 3 }
        ];
      case 'sales_by_product':
        return [
          { product_name: 'Product A', total_sales: 35000, quantity_sold: 150 },
          { product_name: 'Product B', total_sales: 28000, quantity_sold: 120 },
          { product_name: 'Product C', total_sales: 22000, quantity_sold: 95 },
          { product_name: 'Product D', total_sales: 18000, quantity_sold: 80 },
          { product_name: 'Product E', total_sales: 15000, quantity_sold: 65 }
        ];
      case 'sales_by_service':
        return [
          { service_name: 'Consulting', total_sales: 45000, hours_billed: 180 },
          { service_name: 'Implementation', total_sales: 35000, hours_billed: 140 },
          { service_name: 'Support', total_sales: 25000, hours_billed: 200 },
          { service_name: 'Training', total_sales: 18000, hours_billed: 90 }
        ];
      default:
        return {
          message: 'Sample data for demonstration purposes',
          note: 'This is fallback data shown when the backend is not available'
        };
    }
  };

  const exportReport = (format) => {
    console.log('[DEBUG] Sales Reports - Exporting report as:', format);
    toast.info(`Exporting report as ${format}... (Feature coming soon)`);
  };

  const renderReportData = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Generating report...</p>
          </div>
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

    if (reportData.is_fallback) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-yellow-800 font-medium">Demo Data</h3>
          </div>
          <p className="text-yellow-700 text-sm">
            This report shows sample data for demonstration purposes. Connect to your backend to see real data.
          </p>
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
        <p className="text-3xl font-bold text-orange-700">${data.average_order_value?.toLocaleString() || '0'}</p>
      </div>
      <div className="bg-indigo-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">Growth Rate</h3>
        <p className="text-3xl font-bold text-indigo-700">{data.growth_rate || 0}%</p>
      </div>
    </div>
  );

  const renderSalesByCustomer = (data) => (
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
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
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
              {isLoading ? 'Generating...' : 'Generate Report'}
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export PDF
              </button>
              <button
                onClick={() => exportReport('CSV')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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