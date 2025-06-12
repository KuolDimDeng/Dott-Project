/**
 * Examples of how to use the retry utilities
 * This file demonstrates various patterns for implementing retry logic
 */

import { withRetry, fetchWithRetry, makeRetryable } from '@/utils/retryUtils';
import { useErrorHandler } from '@/utils/errorHandler';
import { axiosInstance } from '@/lib/axiosConfig';

// Example 1: Basic retry wrapper for any async function
export async function fetchUserProfileWithRetry(userId) {
  return withRetry(
    async () => {
      const response = await axiosInstance.get(`/user/profile/${userId}`);
      return response.data;
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      context: 'fetchUserProfile',
      onRetry: (error, attempt, delay) => {
        console.log(`Retrying fetchUserProfile (attempt ${attempt}) after ${delay}ms`);
      }
    }
  );
}

// Example 2: Using fetchWithRetry for native fetch calls
export async function fetchBusinessInfoWithRetry(tenantId) {
  const response = await fetchWithRetry(
    `/api/tenant/business-info?tenantId=${tenantId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    {
      maxRetries: 2,
      initialDelay: 1500,
      backoffMultiplier: 2
    }
  );
  
  return response.json();
}

// Example 3: Creating a retryable version of an existing function
const originalFetchEmployees = async (tenantId) => {
  const response = await axiosInstance.get(`/employees?tenantId=${tenantId}`);
  return response.data;
};

export const fetchEmployeesWithRetry = makeRetryable(originalFetchEmployees, {
  maxRetries: 3,
  initialDelay: 2000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
});

// Example 4: Using the error handler's retry functionality
export function useRetryableApi() {
  const { executeWithRetry, makeRetryable } = useErrorHandler();

  const fetchWithRetryAndErrorHandling = async (url, options = {}) => {
    return executeWithRetry(
      async () => {
        const response = await axiosInstance.get(url, options);
        return response.data;
      },
      {
        context: 'api-fetch',
        maxRetries: 3,
        showToast: true,
        customMessage: 'Failed to load data. Retrying...'
      }
    );
  };

  const retryablePost = makeRetryable(
    async (url, data, options = {}) => {
      const response = await axiosInstance.post(url, data, options);
      return response.data;
    },
    {
      context: 'api-post',
      maxRetries: 2,
      initialDelay: 1000,
      showToast: true
    }
  );

  return {
    fetchWithRetryAndErrorHandling,
    retryablePost
  };
}

// Example 5: Retry with custom condition
export async function fetchCriticalDataWithCustomRetry(dataId) {
  return withRetry(
    async () => {
      const response = await axiosInstance.get(`/critical-data/${dataId}`);
      
      // Custom validation - retry if data is incomplete
      if (!response.data || !response.data.isComplete) {
        const error = new Error('Data incomplete');
        error.response = { status: 503 }; // Treat as service unavailable
        throw error;
      }
      
      return response.data;
    },
    {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 10000,
      shouldRetry: (error) => {
        // Custom retry logic
        return (
          error.message === 'Data incomplete' ||
          (error.response && [408, 429, 500, 502, 503, 504].includes(error.response.status))
        );
      }
    }
  );
}

// Example 6: React component with retry functionality
import React, { useState, useEffect } from 'react';

export function RetryableDataComponent({ tenantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { executeWithRetry } = useErrorHandler();

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await executeWithRetry(
        async () => {
          const response = await axiosInstance.get(`/business-data/${tenantId}`);
          return response.data;
        },
        {
          context: 'business-data',
          maxRetries: 3,
          showToast: true,
          onRetry: (error, attempt) => {
            console.log(`Retrying data fetch, attempt ${attempt}`);
          }
        }
      );
      
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message} <button onClick={loadData}>Retry</button></div>;
  if (!data) return <div>No data</div>;

  return <div>Data loaded: {JSON.stringify(data)}</div>;
}

// Example 7: Batch operations with retry
export async function processBatchWithRetry(items, processFunction) {
  const results = [];
  const errors = [];

  for (const item of items) {
    try {
      const result = await withRetry(
        () => processFunction(item),
        {
          maxRetries: 2,
          initialDelay: 500,
          onRetry: (error, attempt) => {
            console.log(`Retrying item ${item.id}, attempt ${attempt}`);
          }
        }
      );
      results.push({ item, result, success: true });
    } catch (error) {
      errors.push({ item, error, success: false });
    }
  }

  return { results, errors };
}

// Example 8: Circuit breaker integration
import { CircuitBreaker } from '@/utils/retryUtils';

const payrollCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000 // 30 seconds
});

export async function fetchPayrollDataWithCircuitBreaker(employeeId) {
  return payrollCircuitBreaker.execute(async () => {
    return withRetry(
      async () => {
        const response = await axiosInstance.get(`/payroll/${employeeId}`);
        return response.data;
      },
      {
        maxRetries: 2,
        initialDelay: 1000,
        context: 'payroll-fetch'
      }
    );
  });
}

// Export all examples for easy testing
export const retryExamples = {
  fetchUserProfileWithRetry,
  fetchBusinessInfoWithRetry,
  fetchEmployeesWithRetry,
  useRetryableApi,
  fetchCriticalDataWithCustomRetry,
  RetryableDataComponent,
  processBatchWithRetry,
  fetchPayrollDataWithCircuitBreaker
};