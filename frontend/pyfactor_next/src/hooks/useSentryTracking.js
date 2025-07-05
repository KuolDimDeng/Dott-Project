import { useCallback, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';

/**
 * Custom hook for Sentry tracking and performance monitoring
 * 
 * Usage:
 * const { trackUserAction, trackPerformance, captureError } = useSentryTracking();
 */
export const useSentryTracking = () => {
  
  // Track user actions with context
  const trackUserAction = useCallback((action, data = {}) => {
    try {
      logger.userAction(action, data);
      
      // Add breadcrumb for the action
      Sentry.addBreadcrumb({
        type: 'user',
        category: 'ui.click',
        message: action,
        data: data,
        level: 'info',
      });
      
      // Set context for any subsequent errors
      Sentry.setContext('lastUserAction', {
        action,
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }, []);

  // Track performance measurements
  const trackPerformance = useCallback((operationName, startTime, metadata = {}) => {
    try {
      const duration = Date.now() - startTime;
      logger.performance(operationName, duration, metadata);
      
      // Create a span for the operation
      Sentry.startSpan(
        { 
          name: operationName, 
          op: 'custom',
          description: `${operationName} took ${duration}ms`
        },
        (span) => {
          span.setData('duration', duration);
          span.setData('metadata', metadata);
          span.end();
        }
      );
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }, []);

  // Capture errors with context
  const captureError = useCallback((error, context = {}) => {
    try {
      logger.error('Captured error', error, context);
      
      Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
        tags: {
          component: 'custom-hook',
        },
      });
    } catch (sentryError) {
      console.error('Failed to capture error in Sentry:', sentryError);
    }
  }, []);

  // Track page views
  const trackPageView = useCallback((pageName, properties = {}) => {
    try {
      logger.info(`Page view: ${pageName}`, properties);
      
      Sentry.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `User viewed ${pageName}`,
        data: properties,
        level: 'info',
      });
      
      Sentry.setContext('currentPage', {
        name: pageName,
        timestamp: new Date().toISOString(),
        ...properties,
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }, []);

  // Track feature usage
  const trackFeatureUsage = useCallback((featureName, enabled = true, metadata = {}) => {
    try {
      logger.featureFlag(featureName, enabled, metadata);
      
      Sentry.setContext('featureUsage', {
        [featureName]: {
          enabled,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }, []);

  // Start a transaction for complex operations
  const startTransaction = useCallback((name, operation = 'custom') => {
    try {
      return Sentry.startSpan({ name, op: operation });
    } catch (error) {
      console.error('Failed to start transaction:', error);
      return null;
    }
  }, []);

  // Monitor API calls
  const trackApiCall = useCallback(async (url, method = 'GET', requestData = null) => {
    const startTime = Date.now();
    const span = Sentry.startSpan({ 
      name: `${method} ${url}`, 
      op: 'http.client' 
    });

    try {
      // This would be called around your actual API call
      const duration = Date.now() - startTime;
      logger.api(method, url, 200, duration, { requestData });
      
      span.setData('http.method', method);
      span.setData('http.url', url);
      span.setData('http.request_content_length', requestData ? JSON.stringify(requestData).length : 0);
      span.setStatus({ code: 1 }); // OK
      
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.api(method, url, 500, duration, { error: error.message });
      
      span.setStatus({ code: 2, message: error.message }); // ERROR
      captureError(error, { url, method, requestData });
      
      return { success: false, duration, error };
    } finally {
      span.end();
    }
  }, [captureError]);

  return {
    trackUserAction,
    trackPerformance,
    captureError,
    trackPageView,
    trackFeatureUsage,
    startTransaction,
    trackApiCall,
  };
};

export default useSentryTracking;