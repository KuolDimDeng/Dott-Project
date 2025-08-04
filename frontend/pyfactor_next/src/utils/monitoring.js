/**
 * Production Monitoring Utilities
 * Tracks performance, errors, and usage metrics
 */

import * as Sentry from '@sentry/nextjs';

// Performance monitoring
export const performanceMonitor = {
  // Track component render time
  measureComponent: (componentName, callback) => {
    if (typeof window === 'undefined') return callback();
    
    const startTime = performance.now();
    const result = callback();
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log slow renders
    if (duration > 100) {
      console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
      
      // Send to Sentry
      Sentry.captureMessage(`Slow component render: ${componentName}`, {
        level: 'warning',
        tags: {
          component: componentName,
          duration: Math.round(duration),
        },
      });
    }

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: 'component_render',
        value: Math.round(duration),
        event_category: 'Performance',
        event_label: componentName,
      });
    }

    return result;
  },

  // Track API call performance
  measureApiCall: async (endpoint, callback) => {
    const startTime = performance.now();
    
    try {
      const result = await callback();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log slow API calls
      if (duration > 1000) {
        console.warn(`[API Performance] ${endpoint} took ${duration.toFixed(2)}ms`);
        
        Sentry.captureMessage(`Slow API call: ${endpoint}`, {
          level: 'warning',
          tags: {
            endpoint,
            duration: Math.round(duration),
          },
        });
      }

      // Track success
      trackApiMetric(endpoint, 'success', duration);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Track failure
      trackApiMetric(endpoint, 'failure', duration);
      
      throw error;
    }
  },

  // Track memory usage
  trackMemoryUsage: () => {
    if (typeof window === 'undefined' || !performance.memory) return;

    const memoryInfo = {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576), // MB
    };

    const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;

    // Warn if memory usage is high
    if (usagePercent > 80) {
      console.warn('[Memory] High memory usage detected:', memoryInfo);
      
      Sentry.captureMessage('High memory usage', {
        level: 'warning',
        contexts: {
          memory: memoryInfo,
        },
      });
    }

    return memoryInfo;
  },
};

// Error tracking
export const errorTracker = {
  // Track user actions that lead to errors
  trackUserAction: (action, metadata = {}) => {
    Sentry.addBreadcrumb({
      message: action,
      category: 'user',
      level: 'info',
      data: metadata,
      timestamp: Date.now() / 1000,
    });
  },

  // Track feature usage
  trackFeatureUsage: (feature, metadata = {}) => {
    if (window.gtag) {
      window.gtag('event', 'feature_usage', {
        event_category: 'Engagement',
        event_label: feature,
        ...metadata,
      });
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Feature Usage] ${feature}`, metadata);
    }
  },

  // Track errors with context
  trackError: (error, context = {}) => {
    console.error('[Error Tracker]', error);
    
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
      tags: {
        ...context.tags,
      },
    });
  },
};

// Build health monitoring
export const buildHealthMonitor = {
  // Check if using new architecture
  checkArchitecture: () => {
    const checks = {
      domainStructure: !!window.__DOMAIN_ARCHITECTURE__,
      routerSystem: !!window.__ROUTER_SYSTEM__,
      serviceLayer: !!window.__SERVICE_LAYER__,
      errorBoundaries: !!window.__ERROR_BOUNDARIES__,
      performanceOptimizations: !!window.__PERFORMANCE_OPTS__,
    };

    const healthScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100;

    return {
      checks,
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    };
  },

  // Track bundle size
  trackBundleSize: () => {
    if (typeof window === 'undefined') return;

    // Get all script tags
    const scripts = Array.from(document.getElementsByTagName('script'));
    const totalSize = scripts.reduce((total, script) => {
      if (script.src && script.src.includes('/_next/')) {
        // Estimate size from script name (Next.js includes size in filename)
        const sizeMatch = script.src.match(/\.([0-9a-f]+)\.js/);
        if (sizeMatch) {
          return total + sizeMatch[1].length * 100; // Rough estimate
        }
      }
      return total;
    }, 0);

    const sizeMB = (totalSize / 1048576).toFixed(2);
    
    console.log(`[Bundle Size] Total: ${sizeMB}MB`);
    
    if (window.gtag) {
      window.gtag('event', 'bundle_size', {
        event_category: 'Performance',
        value: Math.round(totalSize / 1024), // KB
      });
    }

    return { totalSize, sizeMB };
  },
};

// Helper to track API metrics
function trackApiMetric(endpoint, status, duration) {
  if (window.gtag) {
    window.gtag('event', 'api_call', {
      event_category: 'API',
      event_label: endpoint,
      value: Math.round(duration),
      custom_map: {
        dimension1: status,
      },
    });
  }
}

// Initialize monitoring on page load
if (typeof window !== 'undefined') {
  // Track initial page load performance
  window.addEventListener('load', () => {
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      
      console.log(`[Performance] Page load time: ${loadTime}ms`);
      
      if (window.gtag) {
        window.gtag('event', 'page_load_time', {
          event_category: 'Performance',
          value: loadTime,
        });
      }
    }

    // Check build health
    const health = buildHealthMonitor.checkArchitecture();
    console.log('[Build Health]', health);

    // Track bundle size
    setTimeout(() => {
      buildHealthMonitor.trackBundleSize();
    }, 1000);
  });

  // Monitor memory periodically
  setInterval(() => {
    performanceMonitor.trackMemoryUsage();
  }, 60000); // Every minute
}

export default {
  performanceMonitor,
  errorTracker,
  buildHealthMonitor,
};