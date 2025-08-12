import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Query keys
export const businessKeys = {
  all: ['business'],
  details: () => [...businessKeys.all, 'details'],
  settings: () => [...businessKeys.all, 'settings'],
  logo: () => [...businessKeys.all, 'logo'],
  subscription: () => [...businessKeys.all, 'subscription'],
};

// Fetch business details
export function useBusinessDetails() {
  return useQuery({
    queryKey: businessKeys.details(),
    queryFn: () => api.get('/business/details'),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
}

// Fetch business settings
export function useBusinessSettings() {
  return useQuery({
    queryKey: businessKeys.settings(),
    queryFn: () => api.get('/backend/api/business/settings/'),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Update business settings
export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.put('/backend/api/business/settings/', data),
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(businessKeys.settings(), data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}

// Fetch business logo
export function useBusinessLogo() {
  return useQuery({
    queryKey: businessKeys.logo(),
    queryFn: () => api.get('/business/logo'),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Upload business logo
export function useUploadBusinessLogo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => 
      api.post('/business/logo/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.logo() });
    },
  });
}

// Prefetch business data (call on app load)
export function usePrefetchBusinessData() {
  const queryClient = useQueryClient();
  
  return async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: businessKeys.details(),
        queryFn: () => api.get('/business/details'),
        staleTime: 30 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: businessKeys.settings(),
        queryFn: () => api.get('/backend/api/business/settings/'),
        staleTime: 15 * 60 * 1000,
      }),
    ]);
  };
}