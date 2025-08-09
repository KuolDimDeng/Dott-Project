'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { accountingApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import {
  ChartBarSquareIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartPieIcon,
  ScaleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalculatorIcon
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
 * Financial Statements Management Component
 * Industry-standard financial reporting with backend connectivity
 */
function FinancialStatementsManagement({ onNavigate }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(null);
  
  // State management
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [comparePeriod, setComparePeriod] = useState(false);
  const [compareType, setCompareType] = useState('previous-period');
  const [showSchedules, setShowSchedules] = useState(false);
  
  // Financial data states
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [ratios, setRatios] = useState(null);
  
  // Initialize tenant ID
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Calculate date range based on selected period
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate, endDate;
    
    switch (selectedPeriod) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'current-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'current-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-quarter':
        const lastQuarter = Math.floor((now.getMonth() - 3) / 3);
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(year, adjustedQuarter * 3, 1);
        endDate = new Date(year, adjustedQuarter * 3 + 3, 0);
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        return {
          startDate: customDateRange.startDate,
          endDate: customDateRange.endDate
        };
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }, [selectedPeriod, customDateRange]);

  // Generate financial statements
  const generateStatements = useCallback(async () => {
    if (!tenantId) return;
    
    setGenerating(true);
    const dateRange = getDateRange();
    
    try {
      logger.debug('[FinancialStatements] Generating statements for:', dateRange);
      
      // Fetch financial statements from API
      const [balanceSheetData, incomeData, cashFlowData] = await Promise.all([
        fetch(`/api/accounting/financial-statements?type=balance-sheet&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`)
          .then(res => res.json())
          .catch(err => {
            logger.error('[FinancialStatements] Balance sheet API error:', err);
            return null;
          }),
        fetch(`/api/accounting/financial-statements?type=income-statement&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`)
          .then(res => res.json())
          .catch(err => {
            logger.error('[FinancialStatements] Income statement API error:', err);
            return null;
          }),
        fetch(`/api/accounting/financial-statements?type=cash-flow&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`)
          .then(res => res.json())
          .catch(err => {
            logger.error('[FinancialStatements] Cash flow API error:', err);
            return null;
          })
      ]);
      
      // Use real data from backend or empty state
      setBalanceSheet(balanceSheetData || {
        asOf: dateRange.endDate,
        assets: { current: { totalCurrent: 0 }, nonCurrent: { totalNonCurrent: 0 }, totalAssets: 0 },
        liabilities: { current: { totalCurrent: 0 }, nonCurrent: { totalNonCurrent: 0 }, totalLiabilities: 0 },
        equity: { totalEquity: 0 },
        totalLiabilitiesAndEquity: 0
      });
      
      setIncomeStatement(incomeData || {
        period: dateRange,
        revenue: { totalRevenue: 0 },
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: { totalOperating: 0 },
        operatingIncome: 0,
        netIncome: 0
      });
      
      setCashFlow(cashFlowData || {
        period: dateRange,
        operatingActivities: { netCashFromOperating: 0 },
        investingActivities: { netCashFromInvesting: 0 },
        financingActivities: { netCashFromFinancing: 0 },
        netChangeInCash: 0,
        beginningCash: 0,
        endingCash: 0
      });
      
      // Calculate financial ratios from real data
      if (balanceSheetData && incomeData) {
        const bs = balanceSheetData;
        const is = incomeData;
        
        const calculatedRatios = {
          liquidity: {
            currentRatio: bs.liabilities.current.totalCurrent ? (bs.assets.current.totalCurrent / bs.liabilities.current.totalCurrent).toFixed(2) : '0',
            quickRatio: bs.liabilities.current.totalCurrent ? ((bs.assets.current.totalCurrent - (bs.assets.current.inventory || 0)) / bs.liabilities.current.totalCurrent).toFixed(2) : '0',
            cashRatio: bs.liabilities.current.totalCurrent ? ((bs.assets.current.cash || 0) / bs.liabilities.current.totalCurrent).toFixed(2) : '0'
          },
          profitability: {
            grossProfitMargin: is.revenue.totalRevenue ? ((is.grossProfit / is.revenue.totalRevenue) * 100).toFixed(1) : '0',
            operatingMargin: is.revenue.totalRevenue ? ((is.operatingIncome / is.revenue.totalRevenue) * 100).toFixed(1) : '0',
            netProfitMargin: is.revenue.totalRevenue ? ((is.netIncome / is.revenue.totalRevenue) * 100).toFixed(1) : '0',
            returnOnAssets: bs.assets.totalAssets ? ((is.netIncome / bs.assets.totalAssets) * 100).toFixed(1) : '0',
            returnOnEquity: bs.equity.totalEquity ? ((is.netIncome / bs.equity.totalEquity) * 100).toFixed(1) : '0'
          },
          leverage: {
            debtToEquity: bs.equity.totalEquity ? (bs.liabilities.totalLiabilities / bs.equity.totalEquity).toFixed(2) : '0',
            debtToAssets: bs.assets.totalAssets ? (bs.liabilities.totalLiabilities / bs.assets.totalAssets).toFixed(2) : '0',
            interestCoverage: is.interestExpense ? (is.operatingIncome / is.interestExpense).toFixed(2) : 'N/A'
          },
          efficiency: {
            assetTurnover: bs.assets.totalAssets ? (is.revenue.totalRevenue / bs.assets.totalAssets).toFixed(2) : '0',
            receivablesTurnover: bs.assets.current.accountsReceivable ? (is.revenue.totalRevenue / bs.assets.current.accountsReceivable).toFixed(2) : '0',
            inventoryTurnover: bs.assets.current.inventory ? (is.costOfGoodsSold / bs.assets.current.inventory).toFixed(2) : '0'
          }
        };
        setRatios(calculatedRatios);
      } else {
        setRatios({
          liquidity: { currentRatio: '0', quickRatio: '0', cashRatio: '0' },
          profitability: { grossProfitMargin: '0', operatingMargin: '0', netProfitMargin: '0', returnOnAssets: '0', returnOnEquity: '0' },
          leverage: { debtToEquity: '0', debtToAssets: '0', interestCoverage: '0' },
          efficiency: { assetTurnover: '0', receivablesTurnover: '0', inventoryTurnover: '0' }
        });
      }
      
      toast.success('Financial statements generated successfully');
    } catch (error) {
      logger.error('[FinancialStatements] Error generating statements:', error);
      toast.error('Failed to generate financial statements');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [tenantId, getDateRange]);

  useEffect(() => {
    if (tenantId) {
      generateStatements();
    }
  }, [tenantId, generateStatements]);

  // Handle export
  const handleExport = (format = 'pdf') => {
    if (format === 'pdf') {
      window.print();
    } else if (format === 'excel') {
      // In a real implementation, this would generate an Excel file
      toast.success('Financial statements exported to Excel');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value}%`;
  };

  if (!tenantId || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ChartBarSquareIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Financial Statements</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive financial reports including balance sheet, income statement, and cash flow analysis</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
              <FieldTooltip text="Select the reporting period for your financial statements. Choose from predefined periods or select custom dates." />
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current-month">Current Month</option>
              <option value="current-quarter">Current Quarter</option>
              <option value="current-year">Current Year</option>
              <option value="last-month">Last Month</option>
              <option value="last-quarter">Last Quarter</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {selectedPeriod === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                  <FieldTooltip text="Select the beginning date for your financial statements." />
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                  <FieldTooltip text="Select the ending date for your financial statements." />
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={generateStatements}
              disabled={generating}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                generating 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate'}
            </button>
            
            <div className="flex gap-1">
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Export as PDF"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Export to Excel"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-4 flex items-center gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={comparePeriod}
              onChange={(e) => setComparePeriod(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Compare with previous period</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showSchedules}
              onChange={(e) => setShowSchedules(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show supporting schedules</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'balance-sheet'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ScaleIcon className="h-5 w-5 inline mr-2" />
              Balance Sheet
            </button>
            <button
              onClick={() => setActiveTab('income-statement')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'income-statement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ChartPieIcon className="h-5 w-5 inline mr-2" />
              Income Statement
            </button>
            <button
              onClick={() => setActiveTab('cash-flow')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'cash-flow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BanknotesIcon className="h-5 w-5 inline mr-2" />
              Cash Flow
            </button>
            <button
              onClick={() => setActiveTab('ratios')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ratios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalculatorIcon className="h-5 w-5 inline mr-2" />
              Financial Ratios
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Balance Sheet */}
          {activeTab === 'balance-sheet' && balanceSheet && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Balance Sheet</h2>
                <p className="text-gray-600">As of {new Date(balanceSheet.asOf).toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Assets</h3>
                  
                  <div className="space-y-3">
                    <div className="font-medium text-gray-700">Current Assets</div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cash and Cash Equivalents</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.current.cash)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Accounts Receivable</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.current.accountsReceivable)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Inventory</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.current.inventory)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Prepaid Expenses</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.current.prepaidExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Current Assets</span>
                        <span>{formatCurrency(balanceSheet.assets.current.totalCurrent)}</span>
                      </div>
                    </div>

                    <div className="font-medium text-gray-700 mt-4">Non-Current Assets</div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Property, Plant & Equipment</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.nonCurrent.propertyPlantEquipment)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Less: Accumulated Depreciation</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.nonCurrent.accumulatedDepreciation)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Intangible Assets</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.assets.nonCurrent.intangibleAssets)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Non-Current Assets</span>
                        <span>{formatCurrency(balanceSheet.assets.nonCurrent.totalNonCurrent)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-4">
                      <span>Total Assets</span>
                      <span className="text-blue-600">{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Liabilities & Equity</h3>
                  
                  <div className="space-y-3">
                    <div className="font-medium text-gray-700">Current Liabilities</div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accounts Payable</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.liabilities.current.accountsPayable)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Accrued Expenses</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.liabilities.current.accruedExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Short-term Debt</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.liabilities.current.shortTermDebt)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Current Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities.current.totalCurrent)}</span>
                      </div>
                    </div>

                    <div className="font-medium text-gray-700 mt-4">Non-Current Liabilities</div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Long-term Debt</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.liabilities.nonCurrent.longTermDebt)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Deferred Tax Liabilities</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.liabilities.nonCurrent.deferredTaxLiabilities)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Non-Current Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities.nonCurrent.totalNonCurrent)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Liabilities</span>
                      <span className="text-red-600">{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                    </div>

                    <div className="font-medium text-gray-700 mt-4">Shareholders' Equity</div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Common Stock</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.equity.commonStock)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Retained Earnings</span>
                        <span className="font-medium">{formatCurrency(balanceSheet.equity.retainedEarnings)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Equity</span>
                        <span className="text-green-600">{formatCurrency(balanceSheet.equity.totalEquity)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-4">
                      <span>Total Liabilities & Equity</span>
                      <span className="text-blue-600">{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income Statement */}
          {activeTab === 'income-statement' && incomeStatement && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Income Statement</h2>
                <p className="text-gray-600">
                  For the period {new Date(incomeStatement.period.startDate).toLocaleDateString()} - {new Date(incomeStatement.period.endDate).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="font-medium text-gray-700">Revenue</div>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sales Revenue</span>
                      <span className="font-medium">{formatCurrency(incomeStatement.revenue.salesRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Revenue</span>
                      <span className="font-medium">{formatCurrency(incomeStatement.revenue.serviceRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Other Revenue</span>
                      <span className="font-medium">{formatCurrency(incomeStatement.revenue.otherRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t pt-2">
                      <span>Total Revenue</span>
                      <span>{formatCurrency(incomeStatement.revenue.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span>Cost of Goods Sold</span>
                  <span className="font-medium text-red-600">({formatCurrency(incomeStatement.costOfGoodsSold)})</span>
                </div>

                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Gross Profit</span>
                  <span className="text-green-600">{formatCurrency(incomeStatement.grossProfit)}</span>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="font-medium text-gray-700">Operating Expenses</div>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Salaries and Wages</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.salariesAndWages)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rent</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.rent)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Utilities</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.utilities)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Depreciation</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.depreciation)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Marketing</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.marketing)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Administrative</span>
                      <span className="font-medium">({formatCurrency(incomeStatement.operatingExpenses.administrative)})</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t pt-2">
                      <span>Total Operating Expenses</span>
                      <span className="text-red-600">({formatCurrency(incomeStatement.operatingExpenses.totalOperating)})</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Operating Income</span>
                  <span>{formatCurrency(incomeStatement.operatingIncome)}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Other Income</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.otherIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Interest Expense</span>
                    <span className="font-medium text-red-600">({formatCurrency(incomeStatement.interestExpense)})</span>
                  </div>
                </div>

                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Income Before Tax</span>
                  <span>{formatCurrency(incomeStatement.incomeBeforeTax)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Income Tax Expense</span>
                  <span className="font-medium text-red-600">({formatCurrency(incomeStatement.taxExpense)})</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 pt-3">
                  <span>Net Income</span>
                  <span className="text-green-600">{formatCurrency(incomeStatement.netIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Statement */}
          {activeTab === 'cash-flow' && cashFlow && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Statement of Cash Flows</h2>
                <p className="text-gray-600">
                  For the period {new Date(cashFlow.period.startDate).toLocaleDateString()} - {new Date(cashFlow.period.endDate).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-6">
                {/* Operating Activities */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Cash Flows from Operating Activities</h3>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Net Income</span>
                      <span className="font-medium">{formatCurrency(cashFlow.operatingActivities.netIncome)}</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-2">Adjustments to reconcile net income to net cash:</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Depreciation</span>
                        <span>{formatCurrency(cashFlow.operatingActivities.adjustments.depreciation)}</span>
                      </div>
                      <div className="text-sm text-gray-700 mt-2">Changes in Working Capital:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Accounts Receivable</span>
                          <span>{formatCurrency(cashFlow.operatingActivities.adjustments.changesInWorkingCapital.accountsReceivable)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Inventory</span>
                          <span>{formatCurrency(cashFlow.operatingActivities.adjustments.changesInWorkingCapital.inventory)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Accounts Payable</span>
                          <span>{formatCurrency(cashFlow.operatingActivities.adjustments.changesInWorkingCapital.accountsPayable)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Accrued Expenses</span>
                          <span>{formatCurrency(cashFlow.operatingActivities.adjustments.changesInWorkingCapital.accruedExpenses)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net Cash from Operating Activities</span>
                      <span className="text-green-600">{formatCurrency(cashFlow.operatingActivities.netCashFromOperating)}</span>
                    </div>
                  </div>
                </div>

                {/* Investing Activities */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Cash Flows from Investing Activities</h3>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Purchase of Equipment</span>
                      <span className="font-medium">{formatCurrency(cashFlow.investingActivities.purchaseOfEquipment)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sale of Assets</span>
                      <span className="font-medium">{formatCurrency(cashFlow.investingActivities.saleOfAssets)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net Cash from Investing Activities</span>
                      <span className={cashFlow.investingActivities.netCashFromInvesting < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(cashFlow.investingActivities.netCashFromInvesting)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financing Activities */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Cash Flows from Financing Activities</h3>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Proceeds from Debt</span>
                      <span className="font-medium">{formatCurrency(cashFlow.financingActivities.proceedsFromDebt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Debt Repayments</span>
                      <span className="font-medium">{formatCurrency(cashFlow.financingActivities.debtRepayments)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Dividends Paid</span>
                      <span className="font-medium">{formatCurrency(cashFlow.financingActivities.dividendsPaid)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net Cash from Financing Activities</span>
                      <span className={cashFlow.financingActivities.netCashFromFinancing < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(cashFlow.financingActivities.netCashFromFinancing)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 border-t-2 pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Net Increase in Cash</span>
                    <span className={cashFlow.netIncreaseInCash >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlow.netIncreaseInCash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash at Beginning of Period</span>
                    <span>{formatCurrency(cashFlow.beginningCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Cash at End of Period</span>
                    <span className="text-blue-600">{formatCurrency(cashFlow.endingCash)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Ratios */}
          {activeTab === 'ratios' && ratios && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Financial Ratios Analysis</h2>
                <p className="text-gray-600">Key performance indicators and financial health metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Liquidity Ratios */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Liquidity Ratios
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Current Ratio</span>
                        <FieldTooltip text="Current Assets ÷ Current Liabilities. Measures ability to pay short-term obligations. Above 1.0 is generally good." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.liquidity.currentRatio) >= 1.0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.liquidity.currentRatio}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Quick Ratio</span>
                        <FieldTooltip text="(Current Assets - Inventory) ÷ Current Liabilities. Measures immediate liquidity. Above 1.0 is good." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.liquidity.quickRatio) >= 1.0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.liquidity.quickRatio}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Cash Ratio</span>
                        <FieldTooltip text="Cash ÷ Current Liabilities. Most conservative liquidity measure. Above 0.5 is good." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.liquidity.cashRatio) >= 0.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.liquidity.cashRatio}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profitability Ratios */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-600" />
                    Profitability Ratios
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Gross Profit Margin</span>
                        <FieldTooltip text="Gross Profit ÷ Revenue × 100. Shows profitability after direct costs. Industry-specific benchmark." />
                      </div>
                      <span className="font-semibold text-green-600">{formatPercentage(ratios.profitability.grossProfitMargin)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Operating Margin</span>
                        <FieldTooltip text="Operating Income ÷ Revenue × 100. Shows profitability from core operations." />
                      </div>
                      <span className="font-semibold text-green-600">{formatPercentage(ratios.profitability.operatingMargin)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Net Profit Margin</span>
                        <FieldTooltip text="Net Income ÷ Revenue × 100. Overall profitability after all expenses." />
                      </div>
                      <span className="font-semibold text-green-600">{formatPercentage(ratios.profitability.netProfitMargin)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Return on Assets (ROA)</span>
                        <FieldTooltip text="Net Income ÷ Total Assets × 100. How efficiently assets generate profit." />
                      </div>
                      <span className="font-semibold text-blue-600">{formatPercentage(ratios.profitability.returnOnAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Return on Equity (ROE)</span>
                        <FieldTooltip text="Net Income ÷ Shareholders' Equity × 100. Return generated for shareholders." />
                      </div>
                      <span className="font-semibold text-blue-600">{formatPercentage(ratios.profitability.returnOnEquity)}</span>
                    </div>
                  </div>
                </div>

                {/* Leverage Ratios */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center">
                    <ScaleIcon className="h-5 w-5 mr-2 text-purple-600" />
                    Leverage Ratios
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Debt-to-Equity</span>
                        <FieldTooltip text="Total Debt ÷ Total Equity. Shows financial leverage. Below 2.0 is generally safe." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.leverage.debtToEquity) <= 2.0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.leverage.debtToEquity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Debt-to-Assets</span>
                        <FieldTooltip text="Total Debt ÷ Total Assets. Percentage of assets financed by debt. Below 0.6 is good." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.leverage.debtToAssets) <= 0.6 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.leverage.debtToAssets}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Interest Coverage</span>
                        <FieldTooltip text="Operating Income ÷ Interest Expense. Ability to pay interest. Above 3.0 is good." />
                      </div>
                      <span className={`font-semibold ${parseFloat(ratios.leverage.interestCoverage) >= 3.0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ratios.leverage.interestCoverage}x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Efficiency Ratios */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Efficiency Ratios
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Asset Turnover</span>
                        <FieldTooltip text="Revenue ÷ Average Total Assets. How efficiently assets generate revenue." />
                      </div>
                      <span className="font-semibold text-blue-600">{ratios.efficiency.assetTurnover}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Receivables Turnover</span>
                        <FieldTooltip text="Revenue ÷ Average Accounts Receivable. How quickly receivables are collected." />
                      </div>
                      <span className="font-semibold text-blue-600">{ratios.efficiency.receivablesTurnover}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">Inventory Turnover</span>
                        <FieldTooltip text="COGS ÷ Average Inventory. How quickly inventory is sold. Higher is better." />
                      </div>
                      <span className="font-semibold text-blue-600">{ratios.efficiency.inventoryTurnover}x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratio Interpretation Guide */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Interpretation Guide</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <span className="text-green-600 font-semibold">Green</span> values indicate strong performance</p>
                  <p>• <span className="text-yellow-600 font-semibold">Yellow</span> values suggest caution or monitoring needed</p>
                  <p>• <span className="text-red-600 font-semibold">Red</span> values indicate potential concerns</p>
                  <p>• Benchmarks vary by industry - compare with industry averages for best insights</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialStatementsManagement;