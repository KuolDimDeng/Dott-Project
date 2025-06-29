'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { 
  productApi,
  locationApi,
  supplierApi
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import {
  Package,
  ArrowsDownUp,
  MapPin,
  Truck,
  Warning,
  ChartBar,
  ShoppingBag,
  CheckCircle,
  Lightning,
  Plus,
  ClipboardText
} from '@phosphor-icons/react';

import StandardSpinner from '@/components/ui/StandardSpinner';
const InventoryDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [tenantId, setTenantId] = useState(null);
  
  // Get tenant ID on mount
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);
  
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
      
      if (!tenantId) {
        logger.info('[InventoryDashboard] Waiting for tenant ID...');
        return;
      }
      
      logger.info('[InventoryDashboard] Fetching dashboard data...');
      
      // Verify APIs are available
      if (!productApi?.getAll) {
        throw new Error('productApi not properly initialized');
      }
      if (!locationApi?.getAll) {
        throw new Error('locationApi not properly initialized');
      }
      if (!supplierApi?.getAll) {
        throw new Error('supplierApi not properly initialized');
      }
      
      // Fetch all data in parallel
      const [
        productsRes,
        locationsRes,
        suppliersRes,
        adjustmentsRes
      ] = await Promise.allSettled([
        productApi.getAll(),
        locationApi.getAll(),
        supplierApi.getAll(),
        fetch('/api/inventory/stock-adjustments', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : [])
      ]);
      
      logger.info('[InventoryDashboard] API responses received:', {
        products: { status: productsRes.status, value: productsRes.value },
        locations: { status: locationsRes.status, value: locationsRes.value },
        suppliers: { status: suppliersRes.status, value: suppliersRes.value },
        adjustments: { status: adjustmentsRes.status, value: adjustmentsRes.value }
      });

      // Process products/inventory
      if (productsRes.status === 'fulfilled') {
        try {
          // Handle both array and paginated responses
          const productsData = productsRes.value || [];
          logger.info('[InventoryDashboard] Products raw data:', productsData);
          
          let products = [];
          if (Array.isArray(productsData)) {
            products = productsData;
          } else if (productsData && typeof productsData === 'object' && Array.isArray(productsData.results)) {
            products = productsData.results;
          } else {
            logger.error('[InventoryDashboard] Unexpected products data structure:', productsData);
          }
          
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
        } catch (error) {
          logger.error('[InventoryDashboard] Error processing products:', error);
          setMetrics(prev => ({
            ...prev,
            inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 }
          }));
          setRecentItems(prev => ({
            ...prev,
            lowStockItems: []
          }));
        }
      }

      // Process locations
      if (locationsRes.status === 'fulfilled') {
        try {
          // Handle both array and paginated responses
          const locationsData = locationsRes.value || [];
          logger.info('[InventoryDashboard] Locations raw data:', locationsData);
          
          let locations = [];
          if (Array.isArray(locationsData)) {
            locations = locationsData;
          } else if (locationsData && typeof locationsData === 'object' && Array.isArray(locationsData.results)) {
            locations = locationsData.results;
          } else {
            logger.error('[InventoryDashboard] Unexpected locations data structure:', locationsData);
          }
          
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
        } catch (error) {
          logger.error('[InventoryDashboard] Error processing locations:', error);
          setMetrics(prev => ({
            ...prev,
            locations: { total: 0, active: 0, warehouses: 0, stores: 0 }
          }));
        }
      }

      // Process suppliers
      if (suppliersRes.status === 'fulfilled') {
        try {
          // Handle both array and paginated responses
          const suppliersData = suppliersRes.value || [];
          logger.info('[InventoryDashboard] Suppliers raw data:', suppliersData);
          
          let suppliers = [];
          if (Array.isArray(suppliersData)) {
            suppliers = suppliersData;
          } else if (suppliersData && typeof suppliersData === 'object' && Array.isArray(suppliersData.results)) {
            suppliers = suppliersData.results;
          } else {
            logger.error('[InventoryDashboard] Unexpected suppliers data structure:', suppliersData);
          }
          
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
        } catch (error) {
          logger.error('[InventoryDashboard] Error processing suppliers:', error);
          setMetrics(prev => ({
            ...prev,
            suppliers: { total: 0, active: 0, newThisMonth: 0, topSupplier: 'N/A' }
          }));
        }
      }

      // Process stock adjustments
      if (adjustmentsRes.status === 'fulfilled') {
        const adjustments = Array.isArray(adjustmentsRes.value) ? adjustmentsRes.value : 
                           (adjustmentsRes.value?.results || []);
        
        const thisMonth = new Date();
        const thisMonthAdjustments = adjustments.filter(adj => {
          const adjDate = new Date(adj.created_at || adj.date);
          return adjDate.getMonth() === thisMonth.getMonth() && 
                 adjDate.getFullYear() === thisMonth.getFullYear();
        });
        
        const additions = adjustments.filter(adj => adj.type === 'addition' || adj.adjustment_type === 'in');
        const reductions = adjustments.filter(adj => adj.type === 'reduction' || adj.adjustment_type === 'out');
        
        setMetrics(prev => ({
          ...prev,
          stockAdjustments: {
            total: adjustments.length,
            additions: additions.length,
            reductions: reductions.length,
            thisMonth: thisMonthAdjustments.length
          },
          movements: {
            inbound: additions.filter(adj => adj.reason === 'purchase' || adj.reason === 'return').length,
            outbound: reductions.filter(adj => adj.reason === 'sale' || adj.reason === 'damaged').length,
            transfers: adjustments.filter(adj => adj.reason === 'transfer').length,
            damaged: adjustments.filter(adj => adj.reason === 'damaged').length
          }
        }));

        // Set recent adjustments
        const recentAdj = adjustments
          .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
          .slice(0, 5)
          .map(adj => ({
            id: adj.id,
            type: adj.type || adj.adjustment_type,
            quantity: adj.quantity || adj.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            item: adj.product_name || adj.items?.[0]?.product_name || 'Multiple Items',
            date: new Date(adj.created_at || adj.date)
          }));
        
        setRecentItems(prev => ({
          ...prev,
          adjustments: recentAdj
        }));
      } else {
        // Fallback to empty data if API fails
        setMetrics(prev => ({
          ...prev,
          stockAdjustments: {
            total: 0,
            additions: 0,
            reductions: 0,
            thisMonth: 0
          },
          movements: {
            inbound: 0,
            outbound: 0,
            transfers: 0,
            damaged: 0
          }
        }));
      }

      // TODO: Add recent receipts and pending orders when APIs are available
      // For now, keeping these empty to show real data only
      setRecentItems(prev => ({
        ...prev,
        recentReceipts: [],
        pendingOrders: []
      }));

    } catch (error) {
      logger.error('[InventoryDashboard] Error fetching data:', error);
      
      // More specific error messages
      if (error.message?.includes('productApi')) {
        toast.error('Failed to load product data');
      } else if (error.message?.includes('locationApi')) {
        toast.error('Failed to load location data');
      } else if (error.message?.includes('supplierApi')) {
        toast.error('Failed to load supplier data');
      } else {
        toast.error('Failed to load inventory dashboard');
      }
      
      // Set default empty data to prevent rendering errors
      setMetrics({
        inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 },
        stockAdjustments: { total: 0, additions: 0, reductions: 0, thisMonth: 0 },
        locations: { total: 0, active: 0, warehouses: 0, stores: 0 },
        suppliers: { total: 0, active: 0, newThisMonth: 0, topSupplier: 'N/A' },
        movements: { inbound: 0, outbound: 0, transfers: 0, damaged: 0 }
      });
      
      setRecentItems({
        adjustments: [],
        lowStockItems: [],
        recentReceipts: [],
        pendingOrders: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedPeriod]);

  useEffect(() => {
    if (tenantId) {
      fetchDashboardData();
    }
  }, [tenantId, fetchDashboardData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Metric Card Component - Memoized for performance
  const MetricCard = useMemo(() => ({ title, value, subValue, icon, color, trend, onClick }) => (
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
  ), []);

  // Recent Items Component - Memoized for performance
  const RecentItemsList = useMemo(() => ({ title, items, type }) => (
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
  ), []);

  // Wait for tenant ID to load
  if (!tenantId || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <Package weight="duotone" className="h-6 w-6 text-blue-600 mr-2" />
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
          icon={<Package weight="duotone" className="h-6 w-6 text-blue-600" />}
          color="blue"
          onClick={() => handleNavigation('inventory-management')}
        />
        <MetricCard
          title="Stock Adjustments"
          value={metrics.stockAdjustments.total}
          subValue={`${metrics.stockAdjustments.thisMonth} this month`}
          icon={<ArrowsDownUp weight="duotone" className="h-6 w-6 text-purple-600" />}
          color="purple"
          onClick={() => handleNavigation('inventory-stock-adjustments')}
        />
        <MetricCard
          title="Locations"
          value={metrics.locations.total}
          subValue={`${metrics.locations.active} active`}
          icon={<MapPin weight="duotone" className="h-6 w-6 text-green-600" />}
          color="green"
          onClick={() => handleNavigation('inventory-locations')}
        />
        <MetricCard
          title="Suppliers"
          value={metrics.suppliers.total}
          subValue={`${metrics.suppliers.active} active`}
          icon={<Truck weight="duotone" className="h-6 w-6 text-yellow-600" />}
          color="yellow"
          onClick={() => handleNavigation('inventory-suppliers')}
        />
        <MetricCard
          title="Low Stock Alert"
          value={metrics.inventory.lowStock}
          subValue={`${metrics.inventory.outOfStock} out of stock`}
          icon={<Warning weight="duotone" className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>

      {/* Stock Overview and Movement Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBar weight="duotone" className="h-5 w-5 text-blue-600 mr-2" />
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
            <ShoppingBag weight="duotone" className="h-5 w-5 text-purple-600 mr-2" />
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
            <CheckCircle weight="duotone" className="h-5 w-5 text-green-600 mr-2" />
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
          <Lightning weight="duotone" className="h-5 w-5 text-yellow-600 mr-2" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <button 
            onClick={() => handleNavigation('inventory-stock-adjustments')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <ArrowsDownUp weight="duotone" className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Stock Adjustment</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-locations')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <MapPin weight="duotone" className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Add Location</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-suppliers')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
          >
            <Truck weight="duotone" className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">New Supplier</span>
          </button>
          <button 
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <ClipboardText weight="duotone" className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Stock Count</span>
          </button>
          <button 
            onClick={() => handleNavigation('inventory-reports')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <ChartBar weight="duotone" className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;