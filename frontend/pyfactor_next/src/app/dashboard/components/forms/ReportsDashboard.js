'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ChartBar, CurrencyDollar, Receipt, Users, Buildings, ChartLine, FileText, Clock, Eye, Star, Download } from '@phosphor-icons/react';

const ReportsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState([]);
  const [favoriteReports, setFavoriteReports] = useState([]);
  const [reportStats, setReportStats] = useState({
    totalGenerated: 0,
    lastGenerated: null,
    mostViewed: null
  });
  const router = useRouter();

  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: <CurrencyDollar size={24} weight="duotone" className="text-green-600" />,
      reports: [
        { id: 'income_statement', name: 'Profit & Loss Statement', description: 'Revenue, expenses, and net income' },
        { id: 'balance_sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
        { id: 'cash_flow', name: 'Cash Flow Statement', description: 'Cash inflows and outflows' },
      ]
    },
    {
      title: 'Tax Reports',
      icon: <Receipt size={24} weight="duotone" className="text-yellow-600" />,
      reports: [
        { id: 'sales_tax_report', name: 'Sales Tax Report', description: 'Sales tax collected and due' },
        { id: 'payroll_wage_tax_report', name: 'Payroll & Wage Tax', description: 'Payroll taxes and wages' },
      ]
    },
    {
      title: 'Customer Reports',
      icon: <Users size={24} weight="duotone" className="text-blue-600" />,
      reports: [
        { id: 'income_by_customer', name: 'Income by Customer', description: 'Revenue breakdown by customer' },
        { id: 'aged_receivables', name: 'Aged Receivables', description: 'Outstanding customer invoices by age' },
      ]
    },
    {
      title: 'Vendor Reports',
      icon: <Buildings size={24} weight="duotone" className="text-purple-600" />,
      reports: [
        { id: 'purchases_by_vendor', name: 'Purchases by Vendor', description: 'Purchase breakdown by vendor' },
        { id: 'aged_payables', name: 'Aged Payables', description: 'Outstanding vendor bills by age' },
      ]
    },
    {
      title: 'Accounting Reports',
      icon: <ChartLine size={24} weight="duotone" className="text-indigo-600" />,
      reports: [
        { id: 'account_balances', name: 'Account Balances', description: 'Current balances for all accounts' },
        { id: 'trial_balance', name: 'Trial Balance', description: 'Debits and credits for all accounts' },
        { id: 'general_ledger', name: 'General Ledger', description: 'Detailed transaction history' },
      ]
    }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent reports
      const recentResponse = await reportsApi.getRecent();
      if (recentResponse.data) {
        setRecentReports(recentResponse.data);
      }
      
      // Fetch favorite reports
      const favoritesResponse = await reportsApi.getFavorites();
      if (favoritesResponse.data) {
        setFavoriteReports(favoritesResponse.data);
      }
      
      // Fetch report statistics
      const statsResponse = await reportsApi.getStats();
      if (statsResponse.data) {
        setReportStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data for now
      setRecentReports([
        { id: 1, name: 'Profit & Loss - Q4 2023', type: 'income_statement', generatedAt: new Date().toISOString() },
        { id: 2, name: 'Balance Sheet - Dec 2023', type: 'balance_sheet', generatedAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (reportId) => {
    // Navigate to the specific report
    window.dispatchEvent(new CustomEvent('menuNavigation', { 
      detail: { 
        item: reportId,
        navigationKey: `report-${Date.now()}`
      } 
    }));
  };

  const handleToggleFavorite = async (reportId) => {
    try {
      await reportsApi.toggleFavorite(reportId);
      toast.success('Favorite updated');
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <ChartBar size={24} weight="duotone" className="text-blue-600 mr-2" />
          Reports Dashboard
        </h1>
        <p className="text-gray-600 text-sm">Generate and view financial, tax, and business reports including profit & loss, balance sheets, cash flow statements, and tax summaries.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports Generated</p>
              <p className="text-2xl font-bold text-gray-900">{reportStats.totalGenerated}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <FileText size={24} weight="duotone" className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Generated</p>
              <p className="text-lg font-semibold text-gray-900">
                {reportStats.lastGenerated ? new Date(reportStats.lastGenerated).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Clock size={24} weight="duotone" className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Viewed Report</p>
              <p className="text-lg font-semibold text-gray-900">
                {reportStats.mostViewed || 'Income Statement'}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Eye size={24} weight="duotone" className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Favorite Reports */}
      {favoriteReports.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Favorite Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleReportClick(report.type)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{report.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Last run: {new Date(report.lastRun).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(report.id);
                    }}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    <Star size={20} weight="fill" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex justify-between items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => handleReportClick(report.type)}
              >
                <div>
                  <h3 className="font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-500">Generated on {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <Eye size={20} weight="duotone" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-800">
                    <Download size={20} weight="duotone" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;