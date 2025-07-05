import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import https from 'https';
import axios from 'axios';

// Create a direct proxy instance with circuit breaker disabled
const createProxyInstance = (baseURL) => {
  // Log the base URL for debugging
  console.log('[HR-Proxy] Creating proxy instance with base URL:', baseURL);
  
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    // For HTTPS in local development, disable SSL verification
    ...(process.env.NODE_ENV !== 'production' ? {
      httpsAgent: new https.Agent({ 
        rejectUnauthorized: false,
        requestCert: false
      })
    } : {}),
    // Add automatic retry configuration
    maxRedirects: 5,
    validateStatus: () => true, // Accept all status codes for debugging
  });
};

/**
 * Direct proxy handler for employee API - bypasses circuit breakers and other middleware
 */
export async function GET(request) {
  try {
    logger.info('[HR-Proxy] Received proxy request');
    
    // Extract all headers from the request
    const headers = {};
    request.headers.forEach((value, key) => {
      // Forward all headers except host and connection which can cause issues
      if (key !== 'host' && key !== 'connection') {
        headers[key] = value;
      }
    });
    
    // Add tenant ID if it exists in the URL parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
      headers['X-Business-ID'] = tenantId;
      headers['X-Schema-Name'] = `tenant_${tenantId.replace(/-/g, '_')}`;
    }
    
    // Extract authorization from headers or searchParams
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Get environment variables
    const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    
    // Create a fresh proxy instance
    const proxyInstance = createProxyInstance(BACKEND_API_URL);
    
    // Add a direct copy of all tenant IDs from the parameters for maximum compatibility
    if (tenantId) {
      // Add tenant ID directly to URL as a query parameter
      searchParams.set('tenant_id', tenantId);
      searchParams.set('tenantId', tenantId);
      searchParams.set('business_id', tenantId);
    }
    
    // Log the request details
    logger.info('[HR-Proxy] Making proxy request to HR API:', {
      url: `${BACKEND_API_URL}/api/hr/employees`,
      headers: {
        ...headers,
        Authorization: headers.Authorization ? '(present but hidden)' : '(not present)'
      }
    });
    
    // For debugging, add "mock" parameter support
    const useMock = searchParams.get('mock') === 'true';
    if (useMock) {
      logger.info('[HR-Proxy] Using mock data instead of making backend request');
      return NextResponse.json({
        status: 200,
        data: [
          { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '555-1234' },
          { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '555-5678' }
        ],
        mock: true
      });
    }
    
    // Make the direct request to the backend API
    const response = await proxyInstance.get('/api/hr/employees', {
      headers,
      params: Object.fromEntries(searchParams)
    });
    
    // Log the response status and data structure
    logger.info(`[HR-Proxy] Received response with status ${response.status}:`, {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataType: response.data ? (Array.isArray(response.data) ? 'array' : typeof response.data) : 'none',
      dataLength: Array.isArray(response.data) ? response.data.length : 'n/a'
    });
    
    // Return the response with appropriate headers
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      config: {
        url: response.config.url,
        method: response.config.method,
        headers: {
          ...response.config.headers,
          Authorization: '(hidden for security)'
        }
      }
    });
  } catch (error) {
    logger.error('[HR-Proxy] Error proxying request:', error);
    
    // Return a structured error response
    return NextResponse.json({
      error: true,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: process.env.NODE_ENV !== 'production' ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
    }, { status: error.response?.status || 500 });
  }
} 