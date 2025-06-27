'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ShoppingCart, CurrencyDollar, FileText, Truck, ArrowsClockwise } from '@phosphor-icons/react';
import { purchasesApi } from '@/utils/apiClient';

const PurchasesDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSpent: 0,
    pendingBills: 0,
    activeVendors: 0,
    openPurchaseOrders: 0,
    recentPurchases: [],
    topVendors: []
  });
  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!tenantId) return;
    
    logger.debug('[PurchasesDashboard] Fetching dashboard data for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoints when backend is ready
      const mockData = {
        totalSpent: 85000,
        pendingBills: 12500,
        activeVendors: 24,
        openPurchaseOrders: 8,
        recentPurchases: [
          { id: 1, vendor: 'Office Supplies Inc', amount: 1200, date: '2025-01-05', status: 'completed' },
          { id: 2, vendor: 'Tech Equipment Ltd', amount: 5500, date: '2025-01-04', status: 'pending' },
          { id: 3, vendor: 'Facility Services', amount: 800, date: '2025-01-03', status: 'completed' },
          { id: 4, vendor: 'Raw Materials Co', amount: 3200, date: '2025-01-02', status: 'approved' }
        ],
        topVendors: [
          { name: 'Tech Equipment Ltd', totalPurchases: 25000, orderCount: 15 },
          { name: 'Office Supplies Inc', totalPurchases: 18000, orderCount: 42 },
          { name: 'Raw Materials Co', totalPurchases: 15000, orderCount: 8 }
        ]
      };

      setStats(mockData);
      logger.info('[PurchasesDashboard] Dashboard data loaded successfully');
    } catch (err) {
      logger.error('[PurchasesDashboard] Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <ShoppingCart size={24} weight="duotone" className="text-purple-600 mr-2" />
            Purchases Dashboard
          </h1>
          <p className="text-gray-600 text-sm">
            Monitor purchasing activities, track vendor relationships, and manage procurement operations.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <ArrowsClockwise size={16} weight="duotone" className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollar size={24} weight="duotone" className="text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spent</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalSpent)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText size={24} weight="duotone" className="text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Bills</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.pendingBills)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck size={24} weight="duotone" className="text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Vendors</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.activeVendors}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart size={24} weight="duotone" className="text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open POs</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.openPurchaseOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Purchases</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {purchase.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(purchase.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(purchase.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Vendors</h3>
            <div className="space-y-4">
              {stats.topVendors.map((vendor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-500">{vendor.orderCount} orders</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(vendor.totalPurchases)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PurchasesDashboard
      </div>
    </div>
  );
};

export default PurchasesDashboard;