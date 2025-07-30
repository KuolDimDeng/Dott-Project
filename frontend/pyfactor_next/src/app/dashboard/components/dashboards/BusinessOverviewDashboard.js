'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSkeleton from '@/components/loading/DashboardSkeleton';
import { useSession } from '@/hooks/useSession';
import { loadChartJs } from '@/utils/dynamic-imports';

// Lazy load chart components
const RevenueChart = lazy(() => import('../charts/RevenueChart'));
const MetricsGrid = lazy(() => import('../widgets/MetricsGrid'));
const RecentTransactions = lazy(() => import('../widgets/RecentTransactions'));
const QuickActions = lazy(() => import('../widgets/QuickActions'));

// Loading component for individual widgets
const WidgetSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

export default function BusinessOverviewDashboard() {
  const { t } = useTranslation('dashboard');
  const { session, user } = useSession();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartLibLoaded, setChartLibLoaded] = useState(false);

  // Load Chart.js library when component mounts
  useEffect(() => {
    const loadChartLibrary = async () => {
      try {
        const chartJs = await loadChartJs();
        if (chartJs) {
          setChartLibLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Chart.js:', err);
      }
    };
    loadChartLibrary();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.sid) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/overview', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Dashboard data error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.sid]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-semibold mb-2">{t('errors.loadFailed')}</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('errors.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.businessOverview.title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.businessOverview.subtitle')}
        </p>
      </div>

      {/* Metrics Grid */}
      <Suspense fallback={<WidgetSkeleton />}>
        <MetricsGrid data={dashboardData?.metrics} />
      </Suspense>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        {chartLibLoaded && (
          <Suspense fallback={<WidgetSkeleton />}>
            <RevenueChart data={dashboardData?.revenue} />
          </Suspense>
        )}

        {/* Recent Transactions */}
        <Suspense fallback={<WidgetSkeleton />}>
          <RecentTransactions 
            transactions={dashboardData?.recentTransactions} 
            limit={5} 
          />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <Suspense fallback={<WidgetSkeleton />}>
        <QuickActions userRole={user?.role} />
      </Suspense>

      {/* Additional Widgets based on business type */}
      {user?.business_type === 'RETAIL' && (
        <Suspense fallback={<WidgetSkeleton />}>
          <lazy(() => import('../widgets/InventoryAlerts')} 
            alerts={dashboardData?.inventoryAlerts} 
          />
        </Suspense>
      )}

      {user?.business_type === 'SERVICE' && (
        <Suspense fallback={<WidgetSkeleton />}>
          <lazy(() => import('../widgets/UpcomingAppointments')} 
            appointments={dashboardData?.appointments} 
          />
        </Suspense>
      )}
    </div>
  );
}