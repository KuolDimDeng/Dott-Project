/**
 * CRUD Operations Debug Logger
 * Tracks user actions from form submission to database operations
 */

import { logger } from './logger';

class CRUDLogger {
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.operationId = 0;
  }

  // Generate unique operation ID
  getNextOperationId() {
    return `op_${++this.operationId}_${Date.now()}`;
  }

  // Log user action initiation
  logUserAction(action, component, data = {}) {
    const operationId = this.getNextOperationId();
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: 'USER_ACTION',
      component,
      action,
      tenantId: data.tenantId || 'unknown',
      userId: data.userId || 'unknown',
      userEmail: data.userEmail || 'unknown',
      formData: this.sanitizeFormData(data.formData),
      metadata: {
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      }
    };

    console.group(`🎯 [USER_ACTION] ${action} in ${component}`);
    console.log('Operation ID:', operationId);
    console.log('Tenant ID:', logData.tenantId);
    console.log('User:', logData.userEmail);
    console.log('Form Data:', logData.formData);
    console.groupEnd();

    logger.info('[CRUD_LOGGER] User action initiated', logData);
    return operationId;
  }

  // Log API request
  logApiRequest(operationId, method, endpoint, payload = {}, headers = {}) {
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: 'API_REQUEST',
      method: method.toUpperCase(),
      endpoint,
      tenantId: headers['X-Tenant-ID'] || payload.tenantId || 'unknown',
      payload: this.sanitizeFormData(payload),
      headers: this.sanitizeHeaders(headers),
      payloadSize: JSON.stringify(payload).length
    };

    console.group(`📡 [API_REQUEST] ${method.toUpperCase()} ${endpoint}`);
    console.log('Operation ID:', operationId);
    console.log('Tenant ID:', logData.tenantId);
    console.log('Payload:', logData.payload);
    console.log('Headers:', logData.headers);
    console.groupEnd();

    logger.info('[CRUD_LOGGER] API request sent', logData);
  }

  // Log API response
  logApiResponse(operationId, method, endpoint, response = {}, error = null) {
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: error ? 'API_ERROR' : 'API_SUCCESS',
      method: method.toUpperCase(),
      endpoint,
      statusCode: response.status || (error ? 'ERROR' : 200),
      responseData: error ? null : this.sanitizeResponseData(response.data),
      error: error ? {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
      } : null,
      responseTime: response.responseTime || 'unknown'
    };

    if (error) {
      console.group(`❌ [API_ERROR] ${method.toUpperCase()} ${endpoint}`);
      console.log('Operation ID:', operationId);
      console.log('Error:', error.message);
      console.log('Status Code:', logData.statusCode);
      console.groupEnd();
    } else {
      console.group(`✅ [API_SUCCESS] ${method.toUpperCase()} ${endpoint}`);
      console.log('Operation ID:', operationId);
      console.log('Status Code:', logData.statusCode);
      console.log('Response:', logData.responseData);
      console.groupEnd();
    }

    logger.info('[CRUD_LOGGER] API response received', logData);
  }

  // Log database operation
  logDatabaseOperation(operationId, operation, table, tenantId, query = {}, result = null, error = null) {
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: error ? 'DB_ERROR' : 'DB_SUCCESS',
      operation: operation.toUpperCase(), // CREATE, READ, UPDATE, DELETE
      table,
      schema: tenantId ? `tenant_${tenantId}` : 'public',
      tenantId,
      query: this.sanitizeQuery(query),
      result: error ? null : this.sanitizeDbResult(result),
      error: error ? {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail
      } : null,
      rlsEnabled: true,
      rlsPolicy: `rls_policy_${table}_${tenantId}`
    };

    if (error) {
      console.group(`🚨 [DB_ERROR] ${operation.toUpperCase()} on ${table}`);
      console.log('Operation ID:', operationId);
      console.log('Tenant ID:', tenantId);
      console.log('Table:', table);
      console.log('Schema:', logData.schema);
      console.log('Error:', error.message);
      console.log('RLS Policy:', logData.rlsPolicy);
      console.groupEnd();
    } else {
      console.group(`💾 [DB_SUCCESS] ${operation.toUpperCase()} on ${table}`);
      console.log('Operation ID:', operationId);
      console.log('Tenant ID:', tenantId);
      console.log('Table:', table);
      console.log('Schema:', logData.schema);
      console.log('Affected Rows:', result?.rowCount || result?.length || 1);
      console.log('RLS Policy:', logData.rlsPolicy);
      console.groupEnd();
    }

    logger.info('[CRUD_LOGGER] Database operation completed', logData);
  }

  // Log RLS policy check
  logRLSCheck(operationId, tenantId, table, userId, allowed = true, policy = null) {
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: allowed ? 'RLS_ALLOWED' : 'RLS_DENIED',
      tenantId,
      table,
      userId,
      policy: policy || `rls_policy_${table}_${tenantId}`,
      allowed,
      schema: `tenant_${tenantId}`
    };

    if (allowed) {
      console.group(`🔐 [RLS_ALLOWED] Access granted to ${table}`);
      console.log('Operation ID:', operationId);
      console.log('Tenant ID:', tenantId);
      console.log('User ID:', userId);
      console.log('Table:', table);
      console.log('Policy:', logData.policy);
      console.groupEnd();
    } else {
      console.group(`🚫 [RLS_DENIED] Access denied to ${table}`);
      console.log('Operation ID:', operationId);
      console.log('Tenant ID:', tenantId);
      console.log('User ID:', userId);
      console.log('Table:', table);
      console.log('Policy:', logData.policy);
      console.groupEnd();
    }

    logger.info('[CRUD_LOGGER] RLS policy check', logData);
  }

  // Log operation completion
  logOperationComplete(operationId, action, success = true, result = null, duration = null) {
    const logData = {
      operationId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: success ? 'OPERATION_SUCCESS' : 'OPERATION_FAILED',
      action,
      success,
      result: success ? this.sanitizeResponseData(result) : null,
      duration: duration ? `${duration}ms` : 'unknown',
      summary: success ? 'Operation completed successfully' : 'Operation failed'
    };

    if (success) {
      console.group(`🎉 [OPERATION_SUCCESS] ${action} completed`);
      console.log('Operation ID:', operationId);
      console.log('Duration:', logData.duration);
      console.log('Result:', logData.result);
      console.groupEnd();
    } else {
      console.group(`💥 [OPERATION_FAILED] ${action} failed`);
      console.log('Operation ID:', operationId);
      console.log('Duration:', logData.duration);
      console.groupEnd();
    }

    logger.info('[CRUD_LOGGER] Operation completed', logData);
  }

  // Utility methods
  sanitizeFormData(data) {
    if (!data) return null;
    const sanitized = { ...data };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  sanitizeHeaders(headers) {
    if (!headers) return {};
    const sanitized = { ...headers };
    // Remove sensitive headers
    delete sanitized.Authorization;
    delete sanitized.Cookie;
    delete sanitized['X-API-Key'];
    return sanitized;
  }

  sanitizeResponseData(data) {
    if (!data) return null;
    if (Array.isArray(data)) {
      return {
        type: 'array',
        count: data.length,
        sample: data.length > 0 ? this.sanitizeFormData(data[0]) : null
      };
    }
    return this.sanitizeFormData(data);
  }

  sanitizeQuery(query) {
    if (!query) return null;
    return {
      type: typeof query,
      keys: Object.keys(query),
      paramCount: Object.keys(query).length
    };
  }

  sanitizeDbResult(result) {
    if (!result) return null;
    if (Array.isArray(result)) {
      return {
        type: 'array',
        rowCount: result.length,
        columns: result.length > 0 ? Object.keys(result[0]) : []
      };
    }
    if (result.rows) {
      return {
        type: 'query_result',
        rowCount: result.rowCount || result.rows.length,
        columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : []
      };
    }
    return {
      type: 'object',
      keys: Object.keys(result)
    };
  }

  // Get operation summary for a session
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      totalOperations: this.operationId,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const crudLogger = new CRUDLogger();

export default crudLogger;
export { CRUDLogger };