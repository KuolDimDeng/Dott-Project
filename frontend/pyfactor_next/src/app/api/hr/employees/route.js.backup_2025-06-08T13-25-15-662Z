/**
 * HR employees API route handler
 * Proxies requests to the backend HR API with improved authentication
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import https from 'https';

// Get the backend API URL from environment variable or use default
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';

// Create axios instance for backend requests with SSL verification disabled for local dev
const backendAxios = axios.create({
  baseURL: `${BACKEND_API_URL}/api/hr`,
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification for local dev
  })
});

/**
 * Helper function to forward headers from the original request with enhanced auth
 * @param {Request} request - The original Next.js request
 * @returns {Object} Headers to include in the backend request
 */
function getForwardedHeaders(request) {
  const headers = {};
  
  // Get the authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
    logger.debug('[HR API Proxy] Using authorization header from request');
  }
  
  // Get tenant-related headers
  const tenantId = request.headers.get('X-Tenant-ID') || 
                   request.headers.get('x-tenant-id') || 
                   request.headers.get('tenantId');
                   
  if (tenantId) {
    // Include multiple tenant header formats to ensure compatibility
    headers['X-Tenant-ID'] = tenantId;
    headers['tenant-id'] = tenantId;
    headers['x-schema-name'] = `tenant_${tenantId.replace(/-/g, '_')}`;
    logger.debug(`[HR API Proxy] Using tenant ID: ${tenantId}`);
  } else {
    logger.warn('[HR API Proxy] No tenant ID found in request headers');
  }
  
  // Add other important headers that may be needed by backend
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';
  
  return headers;
}

/**
 * Extract query parameters from request with enhanced tenant handling
 * @param {Request} request - The Next.js request
 * @returns {Object} The query parameters
 */
function getQueryParams(request) {
  const url = new URL(request.url);
  const params = {};
  
  // Get all parameters from URL
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }
  
  // Ensure tenantId is included in query params if in headers
  const tenantId = request.headers.get('X-Tenant-ID') || 
                  request.headers.get('x-tenant-id') || 
                  url.searchParams.get('tenantId');
                  
  if (tenantId && !params.tenantId) {
    params.tenantId = tenantId;
  }
  
  return params;
}

/**
 * Handle 403 errors with better diagnostics
 * @param {Error} error - The axios error
 * @returns {Response} Next.js response with detailed error info
 */
function handle403Error(error) {
  logger.error('[HR API] Received 403 Forbidden from backend API');
  
  // Log detailed headers and request info for debugging
  const requestDetails = {
    url: error.config?.url,
    method: error.config?.method,
    headers: Object.keys(error.config?.headers || {}).reduce((acc, key) => {
      // Mask authorization header value for security
      if (key.toLowerCase() === 'authorization') {
        acc[key] = 'Bearer [REDACTED]';
      } else {
        acc[key] = error.config?.headers[key];
      }
      return acc;
    }, {}),
    params: error.config?.params
  };
  
  logger.debug('[HR API] 403 Error request details:', requestDetails);
  
  // Check for specific error conditions in response
  const responseData = error.response?.data || {};
  
  if (responseData.detail && responseData.detail.includes('tenant')) {
    logger.error('[HR API] 403 Error related to tenant context:', responseData.detail);
    
    return NextResponse.json({
      error: 'Tenant Access Forbidden',
      message: 'Your account does not have access to this tenant. Please verify your permissions.',
      details: responseData
    }, { status: 403 });
  }
  
  if (responseData.detail && responseData.detail.includes('permission')) {
    logger.error('[HR API] 403 Error related to permissions:', responseData.detail);
    
    return NextResponse.json({
      error: 'Permission Denied',
      message: 'You do not have permission to access employee data. Please contact your administrator.',
      details: responseData
    }, { status: 403 });
  }
  
  // Default 403 error response
  return NextResponse.json({
    error: 'Access Forbidden',
    message: 'The server refused to authorize access to this resource. Verify your authentication and permissions.',
    details: responseData
  }, { status: 403 });
}

/**
 * GET handler for employees data - proxies to the real backend with improved error handling
 */
export async function GET(request) {
  try {
    logger.info('[HR API] Proxying employee GET request to backend');
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Get query parameters with tenant context
    const params = getQueryParams(request);
    
    // Log the request details for debugging (mask auth token)
    const debugHeaders = { ...headers };
    if (debugHeaders.Authorization) {
      debugHeaders.Authorization = 'Bearer [REDACTED]';
    }
    
    logger.debug('[HR API] Forwarding request to backend with:', {
      url: '/employees',
      headers: debugHeaders,
      params
    });
    
    // Forward the request to the backend
    const response = await backendAxios.get('/employees', {
      headers,
      params
    });
    
    // Log successful response
    logger.info(`[HR API] Successfully proxied request, received ${response.status} response`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API] Error proxying to backend:', error.message);
    
    if (error.response) {
      // Special handling for 403 errors
      if (error.response.status === 403) {
        return handle403Error(error);
      }
      
      // If we have any other response from the backend, return it
      logger.debug(`[HR API] Backend returned status ${error.response.status}`);
      
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      logger.error('[HR API] No response received from backend');
      
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      logger.error('[HR API] Request setup error:', error.message);
      
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}

/**
 * POST handler for creating employees - proxies to the real backend
 */
export async function POST(request) {
  try {
    logger.info('[HR API] Proxying employee POST request to backend');
    
    // Get the request body
    const body = await request.json();
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Get query parameters with tenant context
    const params = getQueryParams(request);
    
    // Forward the request to the backend
    const response = await backendAxios.post('/employees', body, {
      headers,
      params
    });
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API] Error proxying POST to backend:', error.message);
    
    if (error.response) {
      // Special handling for 403 errors
      if (error.response.status === 403) {
        return handle403Error(error);
      }
      
      // If we have any other response from the backend, return it
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}