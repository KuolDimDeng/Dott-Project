'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import DashboardSkeleton from '@/components/loading/DashboardSkeleton';

// Lazy load all components to prevent TDZ errors
const LazyComponents = {
  RevenueChart: lazy(() => import('../charts/RevenueChart')),
  MetricsGrid: lazy(() => import('../widgets/MetricsGrid')),
  RecentTransactions: lazy(() => import('../widgets/RecentTransactions')),
  QuickActions: lazy(() => import('../widgets/QuickActions'))
};

// Loading component for individual widgets
const WidgetSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

export default function BusinessOverviewDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartLibLoaded, setChartLibLoaded] = useState(false);
  const [hooks, setHooks] = useState(null);

  console.log('🏠 [BusinessOverviewDashboard-safe] Component mounted');

  // Dynamically load hooks to prevent TDZ errors
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        // Load hooks dynamically
        const [translationModule, sessionModule, dynamicImportsModule] = await Promise.all([
          import('react-i18next'),
          import('@/hooks/useSession-v2'),
          import('@/utils/dynamic-imports')
        ]);

        const { useTranslation } = translationModule;
        const { useSession } = sessionModule;
        const { loadChartJs } = dynamicImportsModule;

        // Initialize hooks
        const t = useTranslation('dashboard').t;
        const { session, user } = useSession();

        setHooks({ t, session, user });

        // Load Chart.js
        console.log('🏠 [BusinessOverviewDashboard-safe] Loading Chart.js...');
        const chartJs = await loadChartJs();
        if (chartJs) {
          console.log('✅ [BusinessOverviewDashboard-safe] Chart.js loaded successfully');
          setChartLibLoaded(true);
        }
      } catch (err) {
        console.error('❌ [BusinessOverviewDashboard-safe] Failed to load dependencies:', err);
        setError(err.message);
      }
    };

    loadDependencies();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (!hooks) return;

    const loadDashboardData = async () => {
      try {
        console.log('🏠 [BusinessOverviewDashboard-safe] Loading dashboard data...');
        
        // Mock data for now to test TDZ issue
        setDashboardData({
          metrics: {
            revenue: 125000,
            expenses: 75000,
            profit: 50000,
            customers: 234
          },
          recentTransactions: [],
          chartData: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Revenue',
              data: [30000, 35000, 32000, 38000, 40000, 45000]
            }]
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('❌ [BusinessOverviewDashboard-safe] Failed to load data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [hooks]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Dashboard Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (loading || !hooks) {
    return <DashboardSkeleton />;
  }

  const { t } = hooks;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {t ? t('businessOverview') : 'Business Overview'}
      </h1>

      {/* Metrics Grid */}
      <Suspense fallback={<WidgetSkeleton />}>
        <LazyComponents.MetricsGrid data={dashboardData?.metrics} />
      </Suspense>

      {/* Revenue Chart */}
      {chartLibLoaded && (
        <Suspense fallback={<WidgetSkeleton />}>
          <LazyComponents.RevenueChart data={dashboardData?.chartData} />
        </Suspense>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Suspense fallback={<WidgetSkeleton />}>
          <LazyComponents.RecentTransactions transactions={dashboardData?.recentTransactions} />
        </Suspense>

        {/* Quick Actions */}
        <Suspense fallback={<WidgetSkeleton />}>
          <LazyComponents.QuickActions />
        </Suspense>
      </div>
    </div>
  );
}