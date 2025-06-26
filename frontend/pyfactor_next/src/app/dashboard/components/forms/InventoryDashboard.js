'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  productApi,
  locationApi,
  supplierApi
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';

const InventoryDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Navigation handler following the standard pattern
  const handleNavigation = useCallback((section) => {
    console.log(`[InventoryDashboard] Navigating to ${section}`);
    
    // Create a unique navigation key
    const navigationKey = `nav-${Date.now()}`;
    
    // Store navigation key in session storage
    try {
      window.sessionStorage.setItem('lastNavKey', navigationKey);
    } catch (error) {
      console.warn('[InventoryDashboard] Error setting navigation key:', error);
    }
    
    // Create event payload
    const payload = {
      item: section,
      navigationKey,
      originalItem: section
    };
    
    // Dispatch navigation events
    window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
    
    // Cleanup previous state
    try {
      window.sessionStorage.removeItem('inventoryState');
      window.sessionStorage.removeItem('inventoryFilters');
    } catch (error) {
      console.warn('[InventoryDashboard] Error cleaning up state:', error);
    }
  }, []);
  
  // Dashboard metrics state
  const [metrics, setMetrics] = useState({
    inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 },
    stockAdjustments: { total: 0, additions: 0, reductions: 0, thisMonth: 0 },
    locations: { total: 0, active: 0, warehouses: 0, stores: 0 },
    suppliers: { total: 0, active: 0, newThisMonth: 0, topSupplier: '' },
    movements: { inbound: 0, outbound: 0, transfers: 0, damaged: 0 }
  });

  // Recent items for quick access
  const [recentItems, setRecentItems] = useState({
    adjustments: [],
    lowStockItems: [],
    recentReceipts: [],
    pendingOrders: []
  });

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = getSecureTenantId();
      
      logger.info('[InventoryDashboard] Fetching dashboard data...');
      
      // Fetch all data in parallel
      const [
        productsRes,
        locationsRes,
        suppliersRes
      ] = await Promise.allSettled([
        productApi.getAll(),
        locationApi.getAll(),
        supplierApi.getAll()
      ]);

      // Process products/inventory
      if (productsRes.status === 'fulfilled') {
        const products = productsRes.value || [];
        const lowStockItems = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < (p.reorder_level || 10));
        const outOfStockItems = products.filter(p => p.stock_quantity === 0);
        const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);
        
        setMetrics(prev => ({
          ...prev,
          inventory: {
            totalItems: products.length,
            totalValue: totalValue,
            lowStock: lowStockItems.length,
            outOfStock: outOfStockItems.length
          }
        }));

        // Set recent low stock items
        setRecentItems(prev => ({
          ...prev,
          lowStockItems: lowStockItems.slice(0, 5).map(item => ({
            id: item.id,
            name: item.name,
            currentStock: item.stock_quantity,
            reorderLevel: item.reorder_level || 10,
            value: item.price * item.stock_quantity
          }))
        }));
      }

      // Process locations
      if (locationsRes.status === 'fulfilled') {
        const locations = locationsRes.value || [];
        const activeLocations = locations.filter(l => l.is_active !== false);
        
        setMetrics(prev => ({
          ...prev,
          locations: {
            total: locations.length,
            active: activeLocations.length,
            warehouses: locations.filter(l => l.type === 'warehouse').length,
            stores: locations.filter(l => l.type === 'store').length
          }
        }));
      }

      // Process suppliers
      if (suppliersRes.status === 'fulfilled') {
        const suppliers = suppliersRes.value || [];
        const activeSuppliers = suppliers.filter(s => s.is_active !== false);
        const thisMonth = new Date();
        const newSuppliers = suppliers.filter(s => {
          const createdDate = new Date(s.created_at);
          return createdDate.getMonth() === thisMonth.getMonth() && 
                 createdDate.getFullYear() === thisMonth.getFullYear();
        });
        
        setMetrics(prev => ({
          ...prev,
          suppliers: {
            total: suppliers.length,
            active: activeSuppliers.length,
            newThisMonth: newSuppliers.length,
            topSupplier: suppliers[0]?.name || 'N/A'
          }
        }));
      }

      // Mock stock adjustments data (replace with actual API when available)
      setMetrics(prev => ({
        ...prev,
        stockAdjustments: {
          total: 45,
          additions: 28,
          reductions: 17,
          thisMonth: 12
        },
        movements: {
          inbound: 156,
          outbound: 234,
          transfers: 45,
          damaged: 8
        }
      }));

      // Mock recent adjustments
      setRecentItems(prev => ({
        ...prev,
        adjustments: [
          { id: 1, type: 'addition', quantity: 100, item: 'Product A', date: new Date() },
          { id: 2, type: 'reduction', quantity: 50, item: 'Product B', date: new Date() },
          { id: 3, type: 'addition', quantity: 200, item: 'Product C', date: new Date() }
        ]
      }));

    } catch (error) {
      logger.error('[InventoryDashboard] Error fetching data:', error);
      toast.error('Failed to load inventory dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Metric Card Component
  const MetricCard = ({ title, value, subValue, icon, color, trend, onClick }) => (
    <div 
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {subValue && <p className="text-sm text-gray-600 mt-1">{subValue}</p>}
    </div>
  );

  // Recent Items Component
  const RecentItemsList = ({ title, items, type }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">No {type} yet</p>
        ) : (
          items.map((item, index) => (
            <div key={item.id || index} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {item.name || item.item}
                </p>
                <p className="text-xs text-gray-500">
                  {item.type || `Stock: ${item.currentStock || 0}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {item.quantity ? `${item.quantity} units` : formatCurrency(item.value || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {item.date ? format(new Date(item.date), 'MMM dd') : `Reorder: ${item.reorderLevel || 0}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Inventory Dashboard
        </h1>
        <p className="text-gray-600">Monitor stock levels, track movements, and manage your inventory efficiently across all locations.</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex justify-end">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <MetricCard
          title="Total Inventory"
          value={metrics.inventory.totalItems}
          subValue={formatCurrency(metrics.inventory.totalValue)}
          icon={
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          color="blue"
          onClick={() => handleNavigation('inventory-management')}
        />
        <MetricCard
          title="Stock Adjustments"
          value={metrics.stockAdjustments.total}
          subValue={`${metrics.stockAdjustments.thisMonth} this month`}
          icon={
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
          color="purple"
          onClick={() => handleNavigation('inventory-stock-adjustments')}
        />
        <MetricCard
          title="Locations"
          value={metrics.locations.total}
          subValue={`${metrics.locations.active} active`}
          icon={
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="green"
          onClick={() => handleNavigation('inventory-locations')}
        />
        <MetricCard
          title="Suppliers"
          value={metrics.suppliers.total}
          subValue={`${metrics.suppliers.active} active`}
          icon={
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          }
          color="yellow"
          onClick={() => handleNavigation('inventory-suppliers')}
        />
        <MetricCard
          title="Low Stock Alert"
          value={metrics.inventory.lowStock}
          subValue={`${metrics.inventory.outOfStock} out of stock`}
          icon={
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="red"
        />
      </div>

      {/* Stock Overview and Movement Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stock Overview
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.inventory.totalValue)}</p>
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-xl font-semibold text-yellow-600">{metrics.inventory.lowStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-xl font-semibold text-red-600">{metrics.inventory.outOfStock}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Stock Movements
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inbound</span>
              <span className="text-sm font-semibold text-green-600">+{metrics.movements.inbound}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outbound</span>
              <span className="text-sm font-semibold text-red-600">-{metrics.movements.outbound}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transfers</span>
              <span className="text-sm font-semibold text-blue-600">{metrics.movements.transfers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Damaged</span>
              <span className="text-sm font-semibold text-gray-600">{metrics.movements.damaged}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Stock Health
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Stock Availability</span>
                <span className="text-sm font-semibold">
                  {metrics.inventory.totalItems > 0 
                    ? `${Math.round(((metrics.inventory.totalItems - metrics.inventory.outOfStock) / metrics.inventory.totalItems) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${metrics.inventory.totalItems > 0 ? ((metrics.inventory.totalItems - metrics.inventory.outOfStock) / metrics.inventory.totalItems) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Adjustment Accuracy</span>
                <span className="text-sm font-semibold">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <RecentItemsList 
          title="Recent Adjustments" 
          items={recentItems.adjustments} 
          type="adjustments"
        />
        <RecentItemsList 
          title="Low Stock Items" 
          items={recentItems.lowStockItems} 
          type="items"
        />
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">ABC Supplies Inc.</p>
                <p className="text-xs text-gray-500">45 orders</p>
              </div>
              <span className="text-sm font-semibold text-green-600">$12,450</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Global Parts Ltd.</p>
                <p className="text-xs text-gray-500">32 orders</p>
              </div>
              <span className="text-sm font-semibold text-green-600">$8,230</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">TechSupply Co.</p>
                <p className="text-xs text-gray-500">28 orders</p>
              </div>
              <span className="text-sm font-semibold text-green-600">$6,890</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Stock</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Main Warehouse</p>
                <p className="text-xs text-gray-500">1,234 items</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">75%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Downtown Store</p>
                <p className="text-xs text-gray-500">456 items</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">18%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">North Branch</p>
                <p className="text-xs text-gray-500">178 items</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">7%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <button 
            onClick={() => handleNavigation('inventory-stock-adjustments')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <svg className="h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm text-gray-700">Stock Adjustment</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-locations')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <svg className="h-8 w-8 text-green-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-gray-700">Add Location</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-suppliers')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
          >
            <svg className="h-8 w-8 text-yellow-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="text-sm text-gray-700">New Supplier</span>
          </button>
          <button 
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <svg className="h-8 w-8 text-purple-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-sm text-gray-700">Stock Count</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-reports')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <svg className="h-8 w-8 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;