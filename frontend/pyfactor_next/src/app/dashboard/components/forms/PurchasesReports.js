'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  TruckIcon, 
  ShoppingBagIcon, 
  ChartPieIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

const PurchasesReports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Report categories matching the Sales Reports pattern
  const reportCategories = [
    {
      title: 'Vendor Reports',
      icon: <TruckIcon className="h-6 w-6 text-blue-600" />,
      reports: [
        { id: 'vendor_summary', name: 'Vendor Summary', description: 'Overview of all vendors and purchase history' },
        { id: 'vendor_performance', name: 'Vendor Performance', description: 'Vendor delivery times and quality metrics' },
        { id: 'vendor_aging', name: 'Vendor Aging Report', description: 'Outstanding payables by vendor age' },
      ]
    },
    {
      title: 'Purchase Analysis',
      icon: <ShoppingBagIcon className="h-6 w-6 text-green-600" />,
      reports: [
        { id: 'purchase_trends', name: 'Purchase Trends', description: 'Monthly and yearly purchase patterns' },
        { id: 'category_analysis', name: 'Category Analysis', description: 'Spending breakdown by product category' },
        { id: 'price_variance', name: 'Price Variance Report', description: 'Price changes and cost analysis' },
      ]
    },
    {
      title: 'Financial Reports',
      icon: <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />,
      reports: [
        { id: 'payables_summary', name: 'Payables Summary', description: 'Outstanding bills and payment status' },
        { id: 'cash_flow_purchases', name: 'Purchase Cash Flow', description: 'Cash outflow from purchases' },
        { id: 'budget_vs_actual', name: 'Budget vs Actual', description: 'Compare budgeted vs actual spending' },
      ]
    },
    {
      title: 'Operational Reports',
      icon: <ChartPieIcon className="h-6 w-6 text-purple-600" />,
      reports: [
        { id: 'order_status', name: 'Order Status Report', description: 'Status of all purchase orders' },
        { id: 'returns_summary', name: 'Returns Summary', description: 'Purchase returns and refunds' },
        { id: 'procurement_efficiency', name: 'Procurement Efficiency', description: 'Lead times and order accuracy' },
      ]
    }
  ];

  const handleReportClick = (reportId) => {
    logger.info('[PurchasesReports] Report clicked:', reportId);
    // TODO: Implement report generation
    window.dispatchEvent(new CustomEvent('menuNavigation', { 
      detail: { 
        item: `purchase-report-${reportId}`,
        navigationKey: `report-${Date.now()}`
      } 
    }));
  };

  const handleExportReport = (format) => {
    logger.info('[PurchasesReports] Export requested:', format);
    // TODO: Implement export functionality
  };

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
          Purchases Reports
        </h1>
        <p className="text-gray-600 text-sm">
          Generate comprehensive reports for purchase analysis, vendor performance, and procurement insights to optimize your spending.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports Available</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Generated</p>
              <p className="text-lg font-semibold text-gray-900">Today</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Export Formats</p>
              <p className="text-lg font-semibold text-gray-900">PDF, Excel, CSV</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <ArrowDownTrayIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Report Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-8">
        {reportCategories.map((category) => (
          <div key={category.title} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <span className="mr-3">{category.icon}</span>
              <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category.reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <h3 className="font-medium text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="flex gap-4">
          <button 
            onClick={() => handleExportReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Export as PDF
          </button>
          <button 
            onClick={() => handleExportReport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export as Excel
          </button>
          <button 
            onClick={() => handleExportReport('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Export as CSV
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center mt-4">
        Debug: Tenant ID: {tenantId} | Component: PurchasesReports
      </div>
    </div>
  );
};

export default PurchasesReports;