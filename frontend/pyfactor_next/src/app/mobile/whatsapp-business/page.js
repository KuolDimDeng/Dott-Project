'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  PlusIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ShareIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function MobileWhatsAppBusinessPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [activeTab, setActiveTab] = useState('catalogs');
  const [stats, setStats] = useState(null);
  const [catalogs, setCatalogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch stats
      const statsResponse = await fetch('/api/proxy/whatsapp-business/analytics/dashboard_stats/');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch catalogs
      const catalogsResponse = await fetch('/api/proxy/whatsapp-business/catalogs/');
      if (catalogsResponse.ok) {
        const catalogsData = await catalogsResponse.json();
        setCatalogs(catalogsData.results || catalogsData || []);
      }

      // Fetch recent orders
      const ordersResponse = await fetch('/api/proxy/whatsapp-business/orders/');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders((ordersData.results || ordersData || []).slice(0, 5)); // Get last 5
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShareCatalog = async (catalogId, catalogName) => {
    try {
      const phone = prompt('Enter WhatsApp number (with country code):');
      if (!phone) return;

      const response = await fetch(`/api/proxy/whatsapp-business/catalogs/${catalogId}/share_catalog/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });

      if (response.ok) {
        alert('Catalog shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing catalog:', error);
    }
  };

  const handleQuickSync = async () => {
    if (!catalogs.length) {
      alert('Please create a catalog first');
      return;
    }

    try {
      setRefreshing(true);
      const response = await fetch('/api/proxy/whatsapp-business/products/sync_from_inventory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: catalogs[0].id,
          sync_all: true,
          item_type: 'product'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Synced ${result.synced_count} products!`);
        await fetchData();
      }
    } catch (error) {
      console.error('Error syncing products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <ChatBubbleLeftRightIcon className="w-16 h-16 text-green-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Business</h2>
        <p className="text-gray-600 text-center mb-6">Sign in to manage your WhatsApp Business</p>
        <Link
          href="/auth/mobile-login"
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-600 text-white">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/mobile')}
                className="mr-3"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold">WhatsApp Business</h1>
            </div>
            <button
              onClick={fetchData}
              className={`p-2 ${refreshing ? 'animate-spin' : ''}`}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-lg p-3">
              <p className="text-sm opacity-90">Today\'s Orders</p>
              <p className="text-2xl font-bold">{stats?.today_orders || 0}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">${stats?.total_revenue || '0.00'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('catalogs')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'catalogs'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600'
            }`}
          >
            Catalogs
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'orders'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'quick'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600'
            }`}
          >
            Quick Actions
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'catalogs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Your Catalogs</h2>
              <Link
                href={`/${session.tenantId}/dashboard`}
                className="text-green-600 text-sm font-medium"
              >
                Manage →
              </Link>
            </div>
            
            {catalogs.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No catalogs yet</p>
                <button
                  onClick={handleQuickSync}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Quick Sync from Inventory
                </button>
              </div>
            ) : (
              catalogs.map((catalog) => (
                <div key={catalog.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{catalog.name}</h3>
                      <p className="text-sm text-gray-600">{catalog.product_count || 0} products</p>
                    </div>
                    <button
                      onClick={() => handleShareCatalog(catalog.id, catalog.name)}
                      className="text-green-600 p-2"
                    >
                      <ShareIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {catalog.description && (
                    <p className="text-sm text-gray-600">{catalog.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <Link
                href={`/${session.tenantId}/dashboard`}
                className="text-green-600 text-sm font-medium"
              >
                View All →
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No orders yet</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">#{order.id.split('-')[0]}</p>
                      <p className="text-sm text-gray-600">{order.customer_name || order.customer_phone}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.order_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p className="font-semibold">{order.currency} {order.total_amount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'quick' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            
            <button
              onClick={handleQuickSync}
              className="w-full bg-white rounded-lg p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <ArrowPathIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Sync Products</h3>
                  <p className="text-sm text-gray-600">Import from inventory</p>
                </div>
              </div>
              <ChevronLeftIcon className="w-5 h-5 text-gray-400 transform rotate-180" />
            </button>

            <Link
              href={`/${session.tenantId}/dashboard`}
              className="w-full bg-white rounded-lg p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Manage Catalogs</h3>
                  <p className="text-sm text-gray-600">Add products & categories</p>
                </div>
              </div>
              <ChevronLeftIcon className="w-5 h-5 text-gray-400 transform rotate-180" />
            </Link>

            <Link
              href={`/${session.tenantId}/dashboard`}
              className="w-full bg-white rounded-lg p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">View Analytics</h3>
                  <p className="text-sm text-gray-600">Performance insights</p>
                </div>
              </div>
              <ChevronLeftIcon className="w-5 h-5 text-gray-400 transform rotate-180" />
            </Link>

            <div className="mt-8 bg-green-50 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900">WhatsApp Business Active</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your business can receive orders and payments through WhatsApp
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/mobile')}
            className="flex flex-col items-center py-2 text-gray-600"
          >
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 text-green-600">
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
            <span className="text-xs mt-1">WhatsApp</span>
          </button>
          <button
            onClick={() => router.push('/pos')}
            className="flex flex-col items-center py-2 text-gray-600"
          >
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">POS</span>
          </button>
          <button
            onClick={() => router.push(`/${session.tenantId}/dashboard`)}
            className="flex flex-col items-center py-2 text-gray-600"
          >
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}