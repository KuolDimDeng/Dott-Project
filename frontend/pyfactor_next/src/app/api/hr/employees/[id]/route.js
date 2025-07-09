/**
 * HR employee detail API route handler
 * Handles individual employee operations (GET, PUT, DELETE)
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import axios from 'axios';
import https from 'https';

// Get the backend API URL from environment variable or use default
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Create axios instance for backend requests
const backendAxios = axios.create({
  baseURL: `${BACKEND_API_URL}/api/hr`,
  timeout: 30000,
  // Only disable SSL verification in development
  ...(process.env.NODE_ENV === 'development' && {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  })
});

/**
 * Helper function to forward headers from the original request with enhanced auth
 * @param {Request} request - The original Next.js request
 * @returns {Object} Headers to include in the backend request
 */
function getForwardedHeaders(request) {
  const headers = {};
  
  // Get session ID from sid cookie
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  
  if (sidCookie) {
    headers['Authorization'] = `Session ${sidCookie.value}`;
    logger.debug('[HR API Detail] Using session ID from cookie');
  } else {
    // Fallback to authorization header if no cookie
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      logger.debug('[HR API Detail] Using authorization header from request');
    } else {
      logger.warn('[HR API Detail] No authentication found');
    }
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
    logger.debug(`[HR API Detail] Using tenant ID: ${tenantId}`);
  } else {
    logger.warn('[HR API Detail] No tenant ID found in request headers');
  }
  
  // Add other important headers that may be needed by backend
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';
  
  return headers;
}

/**
 * GET handler for single employee data
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`🚀 [HR API Detail] === START GET /api/hr/employees/${id} ===`);
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Log the request details for debugging (mask auth token)
    const debugHeaders = { ...headers };
    if (debugHeaders.Authorization) {
      debugHeaders.Authorization = 'Bearer [REDACTED]';
    }
    
    logger.info('[HR API Detail] Request details:', {
      url: `/employees/${id}`,
      headers: debugHeaders,
      backendUrl: `${BACKEND_API_URL}/api/hr/employees/${id}`
    });
    
    // Forward the request to the backend
    const response = await backendAxios.get(`/employees/${id}`, {
      headers
    });
    
    // Log successful response
    logger.info(`✅ [HR API Detail] Successfully retrieved employee ${id}`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API Detail] Error proxying GET to backend:', error.message);
    
    if (error.response) {
      // If we have any response from the backend, return it
      logger.debug(`[HR API Detail] Backend returned status ${error.response.status}`);
      
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      logger.error('[HR API Detail] No response received from backend');
      
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      logger.error('[HR API Detail] Request setup error:', error.message);
      
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}

/**
 * PUT handler for updating employee data
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info(`🚀 [HR API Detail] === START PUT /api/hr/employees/${id} ===`);
    
    // Get the request body
    const body = await request.json();
    
    logger.info('[HR API Detail] Updating employee with data:', {
      ...body,
      email: body.email ? `${body.email.substring(0, 3)}***@***` : 'not provided' // Mask email for privacy
    });
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Forward the request to the backend
    const response = await backendAxios.put(`/employees/${id}`, body, {
      headers
    });
    
    logger.info(`✅ [HR API Detail] Employee ${id} updated successfully`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API Detail] Error proxying PUT to backend:', error.message);
    
    if (error.response) {
      // If we have any response from the backend, return it
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

/**
 * DELETE handler for removing employee
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info(`🚀 [HR API Detail] === START DELETE /api/hr/employees/${id} ===`);
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Forward the request to the backend
    const response = await backendAxios.delete(`/employees/${id}`, {
      headers
    });
    
    logger.info(`✅ [HR API Detail] Employee ${id} deleted successfully`);
    
    // Return the response from the backend
    return NextResponse.json(response.data || { success: true }, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API Detail] Error proxying DELETE to backend:', error.message);
    
    if (error.response) {
      // If we have any response from the backend, return it
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