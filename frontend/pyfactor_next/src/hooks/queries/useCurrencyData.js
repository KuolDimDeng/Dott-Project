import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Query keys
export const currencyKeys = {
  all: ['currency'],
  list: () => [...currencyKeys.all, 'list'],
  preferences: () => [...currencyKeys.all, 'preferences'],
  exchangeRate: (from, to) => [...currencyKeys.all, 'rate', from, to],
};

// Fetch currency list
export function useCurrencyList() {
  return useQuery({
    queryKey: currencyKeys.list(),
    queryFn: () => api.get('/currency/list'),
    staleTime: 4 * 60 * 60 * 1000, // 4 hours (rarely changes)
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Fetch currency preferences
export function useCurrencyPreferences() {
  return useQuery({
    queryKey: currencyKeys.preferences(),
    queryFn: () => api.get('/backend/api/currency/preferences/'),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Update currency preferences with optimistic update
export function useUpdateCurrencyPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.put('/backend/api/currency/preferences/', data),
    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: currencyKeys.preferences() });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(currencyKeys.preferences());
      
      // Optimistically update
      queryClient.setQueryData(currencyKeys.preferences(), (old) => ({
        ...old,
        ...newData,
      }));
      
      // Return context with snapshot
      return { previousData };
    },
    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(currencyKeys.preferences(), context.previousData);
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.preferences() });
    },
  });
}

// Fetch exchange rate with caching
export function useExchangeRate(fromCurrency, toCurrency) {
  return useQuery({
    queryKey: currencyKeys.exchangeRate(fromCurrency, toCurrency),
    queryFn: () => api.get('/currency/exchange-rate', {
      params: { from: fromCurrency, to: toCurrency }
    }),
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 4 * 60 * 60 * 1000, // 4 hours
    enabled: !!(fromCurrency && toCurrency && fromCurrency !== toCurrency),
  });
}

// Prefetch common currencies
export function usePrefetchCurrencies() {
  const queryClient = useQueryClient();
  
  return async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: currencyKeys.list(),
        queryFn: () => api.get('/currency/list'),
        staleTime: 4 * 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: currencyKeys.preferences(),
        queryFn: () => api.get('/backend/api/currency/preferences/'),
        staleTime: 30 * 60 * 1000,
      }),
    ]);
  };
}