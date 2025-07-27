import * as Sentry from '@sentry/nextjs';

// Custom Web Vitals instrumentation
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: 'LCP',
      level: 'info',
      data: {
        value: lastEntry.renderTime || lastEntry.loadTime,
        size: lastEntry.size,
        element: lastEntry.element?.tagName,
        url: lastEntry.url,
      },
    });

    // Send as custom measurement
    const transaction = Sentry.getCurrentScope()?.getTransaction();
    if (transaction) {
      transaction.setMeasurement('lcp', lastEntry.renderTime || lastEntry.loadTime, 'millisecond');
    }
  });

  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // LCP is not available
  }

  // Track First Input Delay (FID)
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: 'FID',
        level: 'info',
        data: {
          value: entry.processingStart - entry.startTime,
          name: entry.name,
          duration: entry.duration,
        },
      });

      const transaction = Sentry.getCurrentScope()?.getTransaction();
      if (transaction) {
        transaction.setMeasurement('fid', entry.processingStart - entry.startTime, 'millisecond');
      }
    });
  });

  try {
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // FID is not available
  }

  // Track Cumulative Layout Shift (CLS)
  let clsValue = 0;
  let clsEntries = [];

  const clsObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        clsEntries.push(entry);
      }
    });

    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: 'CLS',
      level: 'info',
      data: {
        value: clsValue,
        entries: clsEntries.length,
      },
    });

    const transaction = Sentry.getCurrentScope()?.getTransaction();
    if (transaction) {
      transaction.setMeasurement('cls', clsValue, 'none');
    }
  });

  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // CLS is not available
  }

  // Track First Contentful Paint (FCP)
  const fcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
    
    if (fcpEntry) {
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: 'FCP',
        level: 'info',
        data: {
          value: fcpEntry.startTime,
        },
      });

      const transaction = Sentry.getCurrentScope()?.getTransaction();
      if (transaction) {
        transaction.setMeasurement('fcp', fcpEntry.startTime, 'millisecond');
      }
    }
  });

  try {
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Paint timing is not available
  }

  // Track Time to First Byte (TTFB)
  const navigationObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.type === 'navigation') {
        const ttfb = entry.responseStart - entry.requestStart;
        
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: 'TTFB',
          level: 'info',
          data: {
            value: ttfb,
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            connection: entry.connectEnd - entry.connectStart,
            request: entry.responseStart - entry.requestStart,
          },
        });

        const transaction = Sentry.getCurrentScope()?.getTransaction();
        if (transaction) {
          transaction.setMeasurement('ttfb', ttfb, 'millisecond');
        }
      }
    });
  });

  try {
    navigationObserver.observe({ type: 'navigation', buffered: true });
  } catch (e) {
    // Navigation timing is not available
  }

  // Track resource loading performance
  const resourceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      // Track slow resources
      if (entry.duration > 1000) {
        Sentry.addBreadcrumb({
          category: 'resource',
          message: `Slow resource: ${entry.name}`,
          level: 'warning',
          data: {
            duration: entry.duration,
            transferSize: entry.transferSize,
            initiatorType: entry.initiatorType,
          },
        });
      }

      // Track specific asset types
      const transaction = Sentry.getCurrentScope()?.getTransaction();
      if (transaction) {
        if (entry.initiatorType === 'script') {
          transaction.setMeasurement('resource.script.duration', entry.duration, 'millisecond');
        } else if (entry.initiatorType === 'css') {
          transaction.setMeasurement('resource.css.duration', entry.duration, 'millisecond');
        } else if (entry.initiatorType === 'img') {
          transaction.setMeasurement('resource.img.duration', entry.duration, 'millisecond');
        }
      }
    });
  });

  try {
    resourceObserver.observe({ type: 'resource', buffered: true });
  } catch (e) {
    // Resource timing is not available
  }

  // Track long tasks (blocking the main thread)
  const longTaskObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: 'Long Task',
        level: 'warning',
        data: {
          duration: entry.duration,
          startTime: entry.startTime,
        },
      });
    });
  });

  try {
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (e) {
    // Long task timing is not available
  }
}

// Track user interactions
export function trackInteraction(action, target, data = {}) {
  Sentry.addBreadcrumb({
    category: 'ui.interaction',
    message: `${action} on ${target}`,
    level: 'info',
    data: {
      action,
      target,
      timestamp: Date.now(),
      ...data,
    },
  });
}

// Track network requests
export function trackNetworkRequest(url, method, duration, status, size) {
  const transaction = Sentry.getCurrentScope()?.getTransaction();
  if (transaction) {
    const span = transaction.startChild({
      op: 'http.client',
      description: `${method} ${url}`,
    });
    
    span.setData('http.method', method);
    span.setData('http.url', url);
    span.setData('http.status_code', status);
    span.setData('http.response_content_length', size);
    span.setData('duration', duration);
    
    span.finish();
  }

  // Also add as breadcrumb
  Sentry.addBreadcrumb({
    category: 'fetch',
    message: `${method} ${url}`,
    level: status >= 400 ? 'error' : 'info',
    data: {
      method,
      url,
      status_code: status,
      duration,
      size,
    },
  });
}

// Enhanced fetch wrapper with automatic tracking
export function instrumentFetch() {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const startTime = performance.now();
    const [resource, config] = args;
    const method = config?.method || 'GET';
    const url = typeof resource === 'string' ? resource : resource.url;
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = performance.now() - startTime;
      
      // Get response size if available
      const size = response.headers.get('content-length') || 0;
      
      trackNetworkRequest(url, method, duration, response.status, size);
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackNetworkRequest(url, method, duration, 0, 0);
      throw error;
    }
  };
}

// Custom measurement helper
export function measureCustomMetric(name, value, unit = 'none') {
  const transaction = Sentry.getCurrentScope()?.getTransaction();
  if (transaction) {
    transaction.setMeasurement(name, value, unit);
  }
  
  // Also send as breadcrumb
  Sentry.addBreadcrumb({
    category: 'custom-metric',
    message: name,
    level: 'info',
    data: {
      value,
      unit,
    },
  });
}

// Initialize all instrumentations
export function initSentryInstrumentation() {
  if (typeof window === 'undefined') return;
  
  initWebVitals();
  instrumentFetch();
  
  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    Sentry.addBreadcrumb({
      category: 'ui.lifecycle',
      message: `Page visibility: ${document.visibilityState}`,
      level: 'info',
      data: {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      },
    });
  });
  
  // Track memory usage (if available)
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = performance.memory;
      const usedPercentage = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
      
      if (usedPercentage > 90) {
        Sentry.addBreadcrumb({
          category: 'memory',
          message: 'High memory usage',
          level: 'warning',
          data: {
            usedJSHeapSize: memoryUsage.usedJSHeapSize,
            totalJSHeapSize: memoryUsage.totalJSHeapSize,
            jsHeapSizeLimit: memoryUsage.jsHeapSizeLimit,
            percentage: usedPercentage,
          },
        });
      }
    }, 30000); // Check every 30 seconds
  }
}