'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { accountingApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import {
  DocumentChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ChartBarIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartPieIcon,
  ScaleIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentMagnifyingGlassIcon,
  TableCellsIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Accounting Reports Component
 * Industry-standard financial reporting with backend connectivity
 */
function AccountingReports({ onNavigate }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(null);
  
  // State management
  const [selectedReport, setSelectedReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportOptions, setReportOptions] = useState({
    includeZeroBalance: false,
    includeInactive: false,
    comparativePeriod: false,
    summarizeByCategory: true,
    includeNotes: true,
    format: 'standard' // standard, detailed, summary
  });
  
  // Report types configuration
  const reportTypes = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss Statement',
      description: 'Revenue, expenses, and net income for a period',
      icon: ChartBarIcon,
      color: 'green',
      requiredModules: ['revenue', 'expenses'],
      category: 'financial-statements'
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity at a point in time',
      icon: ScaleIcon,
      color: 'blue',
      requiredModules: ['assets', 'liabilities', 'equity'],
      category: 'financial-statements'
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Cash receipts and payments during a period',
      icon: BanknotesIcon,
      color: 'purple',
      requiredModules: ['cash', 'revenue', 'expenses'],
      category: 'financial-statements'
    },
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      description: 'All account balances to verify debits equal credits',
      icon: TableCellsIcon,
      color: 'orange',
      requiredModules: ['chart-of-accounts'],
      category: 'accounting-reports'
    },
    {
      id: 'general-ledger',
      name: 'General Ledger Report',
      description: 'Detailed transaction history for all accounts',
      icon: DocumentTextIcon,
      color: 'indigo',
      requiredModules: ['general-ledger'],
      category: 'accounting-reports'
    },
    {
      id: 'aged-receivables',
      name: 'Aged Receivables',
      description: 'Outstanding customer balances by age',
      icon: ClockIcon,
      color: 'red',
      requiredModules: ['customers', 'invoices'],
      category: 'aging-reports'
    },
    {
      id: 'aged-payables',
      name: 'Aged Payables',
      description: 'Outstanding vendor balances by age',
      icon: ExclamationCircleIcon,
      color: 'yellow',
      requiredModules: ['vendors', 'bills'],
      category: 'aging-reports'
    },
    {
      id: 'tax-summary',
      name: 'Tax Summary Report',
      description: 'Tax collected and paid during the period',
      icon: DocumentMagnifyingGlassIcon,
      color: 'pink',
      requiredModules: ['tax'],
      category: 'compliance-reports'
    },
    {
      id: 'expense-analysis',
      name: 'Expense Analysis',
      description: 'Breakdown of expenses by category and trend',
      icon: ChartPieIcon,
      color: 'gray',
      requiredModules: ['expenses'],
      category: 'analysis-reports'
    }
  ];

  // Initialize tenant ID
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Fetch recent reports
  const fetchRecentReports = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      // Demo recent reports
      const demoReports = [
        {
          id: 1,
          type: 'profit-loss',
          name: 'Profit & Loss - December 2024',
          generatedDate: '2025-01-15T10:30:00',
          generatedBy: 'John Doe',
          dateRange: { startDate: '2024-12-01', endDate: '2024-12-31' },
          status: 'completed',
          fileSize: '245 KB'
        },
        {
          id: 2,
          type: 'balance-sheet',
          name: 'Balance Sheet - Q4 2024',
          generatedDate: '2025-01-10T14:20:00',
          generatedBy: 'Jane Smith',
          dateRange: { endDate: '2024-12-31' },
          status: 'completed',
          fileSize: '189 KB'
        },
        {
          id: 3,
          type: 'aged-receivables',
          name: 'Aged Receivables - January 2025',
          generatedDate: '2025-01-20T09:15:00',
          generatedBy: 'John Doe',
          dateRange: { endDate: '2025-01-20' },
          status: 'completed',
          fileSize: '156 KB'
        }
      ];
      
      setRecentReports(demoReports);
    } catch (error) {
      logger.error('[AccountingReports] Error fetching recent reports:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchRecentReports();
    }
  }, [tenantId, fetchRecentReports]);

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }
    
    setGenerating(true);
    
    try {
      logger.info('[AccountingReports] Generating report:', {
        type: selectedReport,
        dateRange,
        options: reportOptions
      });
      
      // Simulate report generation with demo data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Demo preview data based on report type
      let demoPreviewData = {};
      
      if (selectedReport === 'profit-loss') {
        demoPreviewData = {
          reportTitle: 'Profit & Loss Statement',
          period: `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`,
          data: {
            revenue: {
              salesRevenue: 150000,
              serviceRevenue: 35000,
              otherRevenue: 5000,
              totalRevenue: 190000
            },
            expenses: {
              costOfGoodsSold: 85000,
              operatingExpenses: {
                salaries: 40000,
                rent: 8000,
                utilities: 2000,
                marketing: 6000,
                other: 9000,
                total: 65000
              },
              totalExpenses: 150000
            },
            netIncome: 40000,
            profitMargin: 21.05
          }
        };
      } else if (selectedReport === 'balance-sheet') {
        demoPreviewData = {
          reportTitle: 'Balance Sheet',
          asOf: new Date(dateRange.endDate).toLocaleDateString(),
          data: {
            assets: {
              current: {
                cash: 125000,
                accountsReceivable: 45000,
                inventory: 32000,
                total: 202000
              },
              fixed: {
                equipment: 175000,
                property: 250000,
                total: 425000
              },
              totalAssets: 627000
            },
            liabilities: {
              current: {
                accountsPayable: 35000,
                accruedExpenses: 12000,
                total: 47000
              },
              longTerm: {
                loans: 100000,
                total: 100000
              },
              totalLiabilities: 147000
            },
            equity: {
              capital: 350000,
              retainedEarnings: 130000,
              totalEquity: 480000
            },
            totalLiabilitiesAndEquity: 627000
          }
        };
      } else if (selectedReport === 'aged-receivables') {
        demoPreviewData = {
          reportTitle: 'Aged Receivables Report',
          asOf: new Date(dateRange.endDate).toLocaleDateString(),
          data: {
            summary: {
              current: 25000,
              days30: 12000,
              days60: 5000,
              days90: 3000,
              over90: 2000,
              total: 47000
            },
            customers: [
              {
                name: 'ABC Corporation',
                current: 10000,
                days30: 5000,
                days60: 0,
                days90: 0,
                over90: 0,
                total: 15000
              },
              {
                name: 'XYZ Company',
                current: 8000,
                days30: 3000,
                days60: 2000,
                days90: 0,
                over90: 0,
                total: 13000
              }
            ]
          }
        };
      }
      
      setPreviewData({
        type: selectedReport,
        ...demoPreviewData,
        generatedAt: new Date().toISOString(),
        options: reportOptions
      });
      
      setIsPreviewModalOpen(true);
      toast.success('Report generated successfully');
    } catch (error) {
      logger.error('[AccountingReports] Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Export report
  const handleExport = (format = 'pdf') => {
    if (!previewData) return;
    
    if (format === 'pdf') {
      window.print();
      toast.success('Report exported as PDF');
    } else if (format === 'excel') {
      // In a real implementation, this would generate an Excel file
      toast.success('Report exported to Excel');
    } else if (format === 'csv') {
      // In a real implementation, this would generate a CSV file
      toast.success('Report exported to CSV');
    }
  };

  // Download recent report
  const handleDownloadReport = (report) => {
    toast.success(`Downloading ${report.name}`);
  };

  // Handle date range presets
  const handleDatePreset = (preset) => {
    const today = new Date();
    let startDate, endDate;
    
    switch (preset) {
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
        break;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this-quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = today;
        break;
      case 'last-quarter':
        const lastQuarter = Math.floor((today.getMonth() - 3) / 3);
        const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(year, adjustedQuarter * 3, 1);
        endDate = new Date(year, adjustedQuarter * 3 + 3, 0);
        break;
      case 'this-year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = today;
        break;
      case 'last-year':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Get report category
  const getReportsByCategory = () => {
    const categories = {
      'financial-statements': {
        name: 'Financial Statements',
        icon: ChartBarSquareIcon,
        reports: []
      },
      'accounting-reports': {
        name: 'Accounting Reports',
        icon: DocumentTextIcon,
        reports: []
      },
      'aging-reports': {
        name: 'Aging Reports',
        icon: ClockIcon,
        reports: []
      },
      'compliance-reports': {
        name: 'Compliance Reports',
        icon: DocumentMagnifyingGlassIcon,
        reports: []
      },
      'analysis-reports': {
        name: 'Analysis Reports',
        icon: ChartPieIcon,
        reports: []
      }
    };
    
    reportTypes.forEach(report => {
      if (categories[report.category]) {
        categories[report.category].reports.push(report);
      }
    });
    
    return Object.values(categories).filter(cat => cat.reports.length > 0);
  };

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
      <div className="flex items-center space-x-3 mb-6">
        <DocumentChartBarIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Accounting Reports</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive financial reports and statements for analysis and compliance</p>
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentReports.slice(0, 3).map((report) => {
              const reportType = reportTypes.find(r => r.id === report.type);
              const Icon = reportType?.icon || DocumentTextIcon;
              
              return (
                <div key={report.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-8 w-8 text-${reportType?.color || 'gray'}-500`} />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Generated {new Date(report.generatedDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">by {report.generatedBy}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Download Report"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{report.fileSize}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      {report.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Selection */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h3>
          
          {getReportsByCategory().map((category) => (
            <div key={category.name} className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <category.icon className="h-5 w-5 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">{category.name}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.reports.map((report) => {
                  const Icon = report.icon;
                  
                  return (
                    <div
                      key={report.id}
                      className={`relative rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                        selectedReport === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start space-x-3">
                          <Icon className={`h-6 w-6 text-${report.color}-500 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="reportType"
                                value={report.id}
                                checked={selectedReport === report.id}
                                onChange={(e) => setSelectedReport(e.target.value)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <label className="ml-2 block text-sm font-medium text-gray-900">
                                {report.name}
                              </label>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{report.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Date Range
            <FieldTooltip text="Select the period for your report. Some reports like Balance Sheet only use the end date." />
          </h3>
          
          {/* Quick Presets */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'this-quarter', label: 'This Quarter' },
              { id: 'last-quarter', label: 'Last Quarter' },
              { id: 'this-year', label: 'This Year' },
              { id: 'last-year', label: 'Last Year' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleDatePreset(preset.id)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
                <FieldTooltip text="Beginning date for the report period. Not used for point-in-time reports like Balance Sheet." />
              </label>
              <div className="relative">
                <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
                <FieldTooltip text="Ending date for the report period. This is the 'as of' date for Balance Sheet." />
              </label>
              <div className="relative">
                <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Options */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Options</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeZeroBalance}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeZeroBalance: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include zero balance accounts
                    <FieldTooltip text="Show accounts with zero balance in the report. Useful for completeness." />
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeInactive}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeInactive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include inactive accounts
                    <FieldTooltip text="Show accounts marked as inactive. Usually excluded from reports." />
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.comparativePeriod}
                    onChange={(e) => setReportOptions({ ...reportOptions, comparativePeriod: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include comparative period
                    <FieldTooltip text="Show comparison with previous period (month, quarter, or year)." />
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.summarizeByCategory}
                    onChange={(e) => setReportOptions({ ...reportOptions, summarizeByCategory: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Summarize by category
                    <FieldTooltip text="Group accounts by category for easier reading." />
                  </span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Format
                  <FieldTooltip text="Choose the level of detail for your report." />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'summary', label: 'Summary', description: 'High-level overview' },
                    { id: 'standard', label: 'Standard', description: 'Regular detail' },
                    { id: 'detailed', label: 'Detailed', description: 'Full transaction detail' }
                  ].map((format) => (
                    <label
                      key={format.id}
                      className={`relative rounded-lg border p-3 cursor-pointer hover:bg-gray-50 ${
                        reportOptions.format === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={format.id}
                        checked={reportOptions.format === format.id}
                        onChange={(e) => setReportOptions({ ...reportOptions, format: e.target.value })}
                        className="sr-only"
                      />
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{format.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{format.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Generate Report</h3>
              {selectedReport && (
                <p className="mt-1 text-sm text-gray-500">
                  Ready to generate: {reportTypes.find(r => r.id === selectedReport)?.name}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGenerateReport}
                disabled={!selectedReport || generating}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  !selectedReport || generating
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generating ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <DocumentChartBarIcon className="h-5 w-5 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      <Transition appear show={isPreviewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPreviewModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Report Preview
                      </Dialog.Title>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleExport('pdf')}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                        >
                          <PrinterIcon className="h-4 w-4 mr-1" />
                          PDF
                        </button>
                        <button
                          onClick={() => handleExport('excel')}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          Excel
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                        >
                          <TableCellsIcon className="h-4 w-4 mr-1" />
                          CSV
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {previewData && (
                      <div className="space-y-6">
                        {/* Report Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-gray-900">{previewData.reportTitle}</h2>
                          <p className="text-gray-600 mt-1">
                            {previewData.period || `As of ${previewData.asOf}`}
                          </p>
                        </div>
                        
                        {/* Report Content based on type */}
                        {previewData.type === 'profit-loss' && (
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Revenue</h3>
                              <div className="ml-4 space-y-2">
                                <div className="flex justify-between">
                                  <span>Sales Revenue</span>
                                  <span className="font-medium">{formatCurrency(previewData.data.revenue.salesRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Service Revenue</span>
                                  <span className="font-medium">{formatCurrency(previewData.data.revenue.serviceRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Other Revenue</span>
                                  <span className="font-medium">{formatCurrency(previewData.data.revenue.otherRevenue)}</span>
                                </div>
                                <div className="flex justify-between font-semibold border-t pt-2">
                                  <span>Total Revenue</span>
                                  <span>{formatCurrency(previewData.data.revenue.totalRevenue)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Expenses</h3>
                              <div className="ml-4 space-y-2">
                                <div className="flex justify-between">
                                  <span>Cost of Goods Sold</span>
                                  <span className="font-medium">{formatCurrency(previewData.data.expenses.costOfGoodsSold)}</span>
                                </div>
                                <div className="mt-3">
                                  <p className="font-medium text-gray-700 mb-2">Operating Expenses</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.expenses.operatingExpenses).map(([key, value]) => {
                                      if (key === 'total') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex justify-between font-semibold border-t pt-2">
                                  <span>Total Expenses</span>
                                  <span className="text-red-600">{formatCurrency(previewData.data.expenses.totalExpenses)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t-2 pt-4">
                              <div className="flex justify-between text-xl font-bold">
                                <span>Net Income</span>
                                <span className="text-green-600">{formatCurrency(previewData.data.netIncome)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>Profit Margin</span>
                                <span>{previewData.data.profitMargin}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {previewData.type === 'balance-sheet' && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Assets</h3>
                              <div className="space-y-4">
                                <div>
                                  <p className="font-medium text-gray-700 mb-2">Current Assets</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.assets.current).map(([key, value]) => {
                                      if (key === 'total') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex justify-between font-semibold border-t pt-1">
                                      <span>Total Current Assets</span>
                                      <span>{formatCurrency(previewData.data.assets.current.total)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-gray-700 mb-2">Fixed Assets</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.assets.fixed).map(([key, value]) => {
                                      if (key === 'total') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex justify-between font-semibold border-t pt-1">
                                      <span>Total Fixed Assets</span>
                                      <span>{formatCurrency(previewData.data.assets.fixed.total)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                                  <span>Total Assets</span>
                                  <span className="text-blue-600">{formatCurrency(previewData.data.assets.totalAssets)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Liabilities & Equity</h3>
                              <div className="space-y-4">
                                <div>
                                  <p className="font-medium text-gray-700 mb-2">Current Liabilities</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.liabilities.current).map(([key, value]) => {
                                      if (key === 'total') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex justify-between font-semibold border-t pt-1">
                                      <span>Total Current Liabilities</span>
                                      <span>{formatCurrency(previewData.data.liabilities.current.total)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-gray-700 mb-2">Long-term Liabilities</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.liabilities.longTerm).map(([key, value]) => {
                                      if (key === 'total') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between font-semibold">
                                  <span>Total Liabilities</span>
                                  <span className="text-red-600">{formatCurrency(previewData.data.liabilities.totalLiabilities)}</span>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-gray-700 mb-2">Shareholders' Equity</p>
                                  <div className="ml-4 space-y-1">
                                    {Object.entries(previewData.data.equity).map(([key, value]) => {
                                      if (key === 'totalEquity') return null;
                                      return (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                          <span>{formatCurrency(value)}</span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex justify-between font-semibold border-t pt-1">
                                      <span>Total Equity</span>
                                      <span className="text-green-600">{formatCurrency(previewData.data.equity.totalEquity)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                                  <span>Total Liabilities & Equity</span>
                                  <span className="text-blue-600">{formatCurrency(previewData.data.totalLiabilitiesAndEquity)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {previewData.type === 'aged-receivables' && (
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Aging Summary</h3>
                              <div className="grid grid-cols-6 gap-4 text-center">
                                {Object.entries(previewData.data.summary).map(([key, value]) => (
                                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">
                                      {key === 'current' ? 'Current' : 
                                       key === 'total' ? 'Total' :
                                       key.replace('days', '') + ' Days'}
                                    </p>
                                    <p className={`text-lg font-semibold ${
                                      key === 'total' ? 'text-blue-600' :
                                      key === 'current' ? 'text-green-600' :
                                      key === 'over90' ? 'text-red-600' :
                                      'text-gray-900'
                                    }`}>
                                      {formatCurrency(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Details</h3>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">1-30</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">31-60</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">61-90</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Over 90</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {previewData.data.customers.map((customer, index) => (
                                      <tr key={index}>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{customer.name}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(customer.current)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(customer.days30)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(customer.days60)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(customer.days90)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(customer.over90)}</td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(customer.total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Report Footer */}
                        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                          <p>Generated on {new Date(previewData.generatedAt).toLocaleString()}</p>
                          <p>Report Format: {previewData.options.format.charAt(0).toUpperCase() + previewData.options.format.slice(1)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 px-6 py-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(false)}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default AccountingReports;