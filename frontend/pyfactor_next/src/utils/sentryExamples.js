/**
 * Sentry Integration Examples for Dott Application
 * 
 * This file demonstrates the exact patterns used throughout the application
 * for error tracking, performance monitoring, and structured logging.
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';

// ============================================================================
// 1. EXCEPTION HANDLING EXAMPLES
// ============================================================================

/**
 * Example: Capturing exceptions with context
 */
export const handleUserError = (error, userAction) => {
  logger.error('User action failed', error, { action: userAction });
  
  Sentry.captureException(error, {
    tags: {
      component: 'user-interface',
      errorType: 'user-action'
    },
    contexts: {
      userAction: {
        action: userAction,
        timestamp: new Date().toISOString()
      }
    }
  });
};

/**
 * Example: API call error handling
 */
export const handleApiError = async (url, method, error) => {
  logger.error(`API call failed: ${method} ${url}`, error);
  
  Sentry.captureException(error, {
    tags: {
      endpoint: url,
      method: method,
      errorType: 'api-error'
    },
    contexts: {
      api: {
        url,
        method,
        timestamp: new Date().toISOString()
      }
    }
  });
};

// ============================================================================
// 2. PERFORMANCE MONITORING EXAMPLES
// ============================================================================

/**
 * Example: Component render time tracking
 */
export const trackComponentRender = (componentName, renderStartTime) => {
  const duration = Date.now() - renderStartTime;
  
  Sentry.startSpan(
    { name: `${componentName}-render`, op: 'ui.render' },
    (span) => {
      span.setData('duration', duration);
      span.setData('component', componentName);
      logger.performance(`${componentName} render`, duration);
      span.end();
    }
  );
};

/**
 * Example: API call performance tracking
 */
export const trackApiPerformance = async (apiCall, url, method = 'GET') => {
  const startTime = Date.now();
  
  return Sentry.startSpan(
    { name: `${method} ${url}`, op: 'http.client' },
    async (span) => {
      try {
        const result = await apiCall();
        const duration = Date.now() - startTime;
        
        span.setData('http.method', method);
        span.setData('http.url', url);
        span.setStatus({ code: 1 }); // OK
        
        logger.api(method, url, 200, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        span.setStatus({ code: 2, message: error.message }); // ERROR
        logger.api(method, url, 500, duration, { error: error.message });
        
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

/**
 * Example: Database operation tracking
 */
export const trackDatabaseOperation = async (operation, table, dbCall) => {
  const startTime = Date.now();
  
  return Sentry.startSpan(
    { name: `db.${operation}`, op: 'db.query' },
    async (span) => {
      try {
        span.setData('db.operation', operation);
        span.setData('db.table', table);
        
        const result = await dbCall();
        const duration = Date.now() - startTime;
        
        logger.performance(`Database ${operation} on ${table}`, duration);
        
        return result;
      } catch (error) {
        logger.error(`Database ${operation} failed`, error, { table });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

// ============================================================================
// 3. STRUCTURED LOGGING EXAMPLES
// ============================================================================

/**
 * Example: User action logging with context
 */
export const logUserAction = (action, user, metadata = {}) => {
  const logData = logger.fmt(`User action: ${action}`, {
    userId: user.id,
    userEmail: user.email,
    tenantId: user.tenant_id,
    action,
    ...metadata
  });
  
  Sentry.addBreadcrumb({
    type: 'user',
    category: 'ui.click',
    message: action,
    data: logData,
    level: 'info'
  });
  
  return logData;
};

/**
 * Example: Business logic logging
 */
export const logBusinessEvent = (event, data = {}) => {
  const logData = logger.fmt(`Business event: ${event}`, data);
  
  Sentry.addBreadcrumb({
    type: 'default',
    category: 'business-logic',
    message: event,
    data: logData,
    level: 'info'
  });
  
  return logData;
};

// ============================================================================
// 4. REAL-WORLD USAGE EXAMPLES
// ============================================================================

/**
 * Example: Complete form submission with tracking
 */
export const handleFormSubmission = async (formData, submitFunction) => {
  const startTime = Date.now();
  
  return Sentry.startSpan(
    { name: 'form-submission', op: 'ui.action' },
    async (span) => {
      try {
        logUserAction('Form Submission Started', { 
          formType: formData.type,
          fields: Object.keys(formData)
        });
        
        const result = await submitFunction(formData);
        const duration = Date.now() - startTime;
        
        logger.performance('Form submission', duration, { 
          formType: formData.type,
          success: true 
        });
        
        logBusinessEvent('Form Submitted Successfully', {
          formType: formData.type,
          duration
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        handleUserError(error, 'form-submission');
        
        logger.performance('Form submission', duration, { 
          formType: formData.type,
          success: false,
          error: error.message 
        });
        
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

/**
 * Example: File upload with progress tracking
 */
export const handleFileUpload = async (file, uploadFunction) => {
  const startTime = Date.now();
  
  return Sentry.startSpan(
    { name: 'file-upload', op: 'ui.action' },
    async (span) => {
      try {
        span.setData('file.name', file.name);
        span.setData('file.size', file.size);
        span.setData('file.type', file.type);
        
        logUserAction('File Upload Started', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        
        const result = await uploadFunction(file);
        const duration = Date.now() - startTime;
        
        logger.performance('File upload', duration, {
          fileName: file.name,
          fileSize: file.size,
          success: true
        });
        
        return result;
      } catch (error) {
        handleUserError(error, 'file-upload');
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

/**
 * Example: Feature flag usage tracking
 */
export const trackFeatureUsage = (featureName, enabled, user) => {
  logger.featureFlag(featureName, enabled, {
    userId: user.id,
    userPlan: user.subscriptionPlan
  });
  
  Sentry.setContext('featureFlags', {
    [featureName]: {
      enabled,
      userId: user.id,
      userPlan: user.subscriptionPlan,
      timestamp: new Date().toISOString()
    }
  });
};

// ============================================================================
// 5. COMPONENT INTEGRATION PATTERNS
// ============================================================================

/**
 * Example: Hook for component-level Sentry integration
 */
export const useComponentTracking = (componentName) => {
  const trackRender = (startTime) => {
    trackComponentRender(componentName, startTime);
  };
  
  const trackAction = (action, data = {}) => {
    logUserAction(`${componentName}: ${action}`, data);
  };
  
  const trackError = (error, context = {}) => {
    handleUserError(error, `${componentName}-error`);
  };
  
  return { trackRender, trackAction, trackError };
};

export default {
  handleUserError,
  handleApiError,
  trackComponentRender,
  trackApiPerformance,
  trackDatabaseOperation,
  logUserAction,
  logBusinessEvent,
  handleFormSubmission,
  handleFileUpload,
  trackFeatureUsage,
  useComponentTracking
};