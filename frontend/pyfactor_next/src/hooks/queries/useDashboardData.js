import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useEffect } from 'react';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'],
  overview: (params) => [...dashboardKeys.all, 'overview', params],
  metrics: () => [...dashboardKeys.all, 'metrics'],
  notifications: () => [...dashboardKeys.all, 'notifications'],
  recentActivity: () => [...dashboardKeys.all, 'activity'],
};

// Fetch dashboard overview data
export function useDashboardOverview(startDate, endDate) {
  const params = { startDate, endDate };
  
  return useQuery({
    queryKey: dashboardKeys.overview(params),
    queryFn: () => api.get('/dashboard/overview', { params }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: false,
  });
}

// Fetch dashboard metrics
export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: () => api.get('/dashboard/metrics/summary'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
}

// Fetch notifications with real-time updates
export function useNotifications() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: dashboardKeys.notifications(),
    queryFn: () => api.get('/notifications/user'),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check every minute
  });
  
  // Set up WebSocket for real-time notifications (Phase 4)
  useEffect(() => {
    // This will be implemented in Phase 4
    // For now, just use polling
  }, [queryClient]);
  
  return query;
}

// Prefetch dashboard data
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();
  
  return async () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.overview({ startDate, endDate }),
        queryFn: () => api.get('/dashboard/overview', { params: { startDate, endDate } }),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.metrics(),
        queryFn: () => api.get('/dashboard/metrics/summary'),
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.notifications(),
        queryFn: () => api.get('/notifications/user'),
        staleTime: 30 * 1000,
      }),
    ]);
  };
}

// Invalidate dashboard data (call after mutations)
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };
}