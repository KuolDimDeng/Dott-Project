import { NextResponse } from 'next/server';
import { serverAxiosInstance, backendHrApiInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import https from 'https';

/**
 * Extract tenant ID from request headers or authentication context
 * Uses dynamic extraction instead of hardcoded values
 * @param {Request} request - The incoming request object  
 * @returns {string} - The tenant ID or fallback value
 */
function extractTenantIdFromRequest(request) {
  // Check for tenant ID in headers first
  const tenantIdHeader = request.headers.get('X-Tenant-ID') || 
                        request.headers.get('x-tenant-id') ||
                        request.headers.get('Tenant-ID');
  
  if (tenantIdHeader && tenantIdHeader !== 'test-tenant-id') {
    return tenantIdHeader;
  }
  
  // Fallback for testing - in production this should extract from JWT
  console.warn('[TestConnection] No tenant ID in headers, using fallback');
  return 'tenant-id-required';
}


/**
 * GET handler for testing backend connection
 */
export async function GET(request) {
  const results = {
    tests: [],
    success: false,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'employees';
    
    // Get environment variables
    const envVars = {
      BACKEND_API_URL: process.env.BACKEND_API_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'Not set'
    };
    
    results.environment = envVars;
    
    // Test direct fetch to backend API using serverAxiosInstance
    try {
      logger.info('[TestConnection] Testing direct backend connection');
      
      const agentOptions = {
        rejectUnauthorized: false
      };
      
      const response = await serverAxiosInstance.get('/api/health', {
        httpsAgent: new https.Agent(agentOptions),
        timeout: 5000
      });
      
      results.tests.push({
        name: 'Backend Health',
        endpoint: '/api/health',
        success: true,
        status: response.status,
        data: response.data
      });
    } catch (error) {
      results.tests.push({
        name: 'Backend Health',
        endpoint: '/api/health',
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }
    
    // Test HR API connection
    if (target === 'employees') {
      try {
        logger.info('[TestConnection] Testing HR API connection');
        
        const response = await backendHrApiInstance.get('/employees', {
          timeout: 5000,
          headers: {
            'X-Test-Mode': 'true',
            'X-Tenant-ID': extractTenantIdFromRequest(request)
          }
        });
        
        results.tests.push({
          name: 'HR API',
          endpoint: '/employees',
          success: true,
          status: response.status,
          dataCount: Array.isArray(response.data) ? response.data.length : 'Not an array'
        });
      } catch (error) {
        results.tests.push({
          name: 'HR API',
          endpoint: '/employees',
          success: false,
          errorMessage: error.message,
          errorCode: error.code,
          errorResponse: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : 'No response',
          errorStack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
      }
    }
    
    // Mark overall success if at least one test passed
    results.success = results.tests.some(test => test.success);
    
    // Return the results
    return NextResponse.json(results);
  } catch (error) {
    logger.error('[TestConnection] Error testing connection:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 