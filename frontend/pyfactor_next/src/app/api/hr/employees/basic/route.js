/**
 * HR employees basic list API route handler
 * Returns minimal employee data for dropdowns
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
 * Helper function to forward headers from the original request
 */
function getForwardedHeaders(request) {
  const headers = {};
  
  // Get session ID from sid cookie
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  
  if (sidCookie) {
    headers['Authorization'] = `Session ${sidCookie.value}`;
    logger.debug('[HR API Proxy] Using session ID from cookie');
  } else {
    // Fallback to authorization header if no cookie
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      logger.debug('[HR API Proxy] Using authorization header from request');
    }
  }
  
  // Get tenant-related headers
  const tenantId = request.headers.get('X-Tenant-ID') || 
                   request.headers.get('x-tenant-id') || 
                   request.headers.get('tenantId');
                   
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
    headers['tenant-id'] = tenantId;
    headers['x-schema-name'] = `tenant_${tenantId.replace(/-/g, '_')}`;
  }
  
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';
  
  return headers;
}

/**
 * GET handler for basic employees data
 */
export async function GET(request) {
  try {
    logger.info('🚀 [HR API] === START GET /api/hr/employees/basic ===');
    
    // Forward headers from the original request
    const headers = getForwardedHeaders(request);
    
    // Forward the request to the backend
    const response = await backendAxios.get('/employees/basic', {
      headers
    });
    
    logger.info(`✅ [HR API] Successfully fetched ${response.data?.length || 0} employees for dropdown`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    logger.error('[HR API] Error fetching basic employee list:', error.message);
    
    if (error.response) {
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}