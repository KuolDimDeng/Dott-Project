import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';
import { getTenantId } from '@/lib/tenantUtils';
import { serverAxiosInstance } from '@/lib/axiosConfig';

// Mock employee data for development when backend is not available
const MOCK_EMPLOYEES = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    department: 'Engineering',
    role: 'Software Engineer',
    hire_date: '2023-01-15',
    employment_status: 'ACTIVE',
    employee_type: 'FULL_TIME',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    department: 'Marketing',
    role: 'Marketing Manager',
    hire_date: '2022-11-05',
    employment_status: 'ACTIVE',
    employee_type: 'FULL_TIME',
  },
  {
    id: '3',
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice.johnson@example.com',
    phone: '555-123-4567',
    department: 'Finance',
    role: 'Financial Analyst',
    hire_date: '2023-03-20',
    employment_status: 'ACTIVE',
    employee_type: 'PART_TIME',
  }
];

/**
 * Extract tokens and tenant ID from request headers
 * @param {Request} request - The incoming request
 * @returns {Object} Object containing tokens and tenant ID
 */
async function extractAuthInfoFromRequest(request) {
  // Extract Authorization header
  const authHeader = request.headers.get('Authorization');
  const tenantHeader = request.headers.get('X-Tenant-ID') || request.headers.get('x-tenant-id');
  
  let idToken = null;
  let tenantId = null;
  
  // Get ID token from Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.substring(7);
    
    // Try to extract tenant ID from token
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonPayload);
      
      tenantId = payload['custom:businessid'] || 
                 payload['custom:tenant_ID'] || 
                 payload['custom:tenantId'] || 
                 payload['custom:tenant_ID'];
      
      logger.debug('[API] Extracted tenant ID from token:', tenantId);
    } catch (e) {
      logger.warn('[API] Error extracting tenant ID from token:', e);
    }
  }
  
  // Use tenant ID from header if available
  if (!tenantId && tenantHeader) {
    tenantId = tenantHeader;
    logger.debug('[API] Using tenant ID from header:', tenantId);
  }
  
  // Use tenant ID from URL if available
  if (!tenantId) {
    tenantId = await getTenantId(request);
    logger.debug('[API] Using tenant ID from URL:', tenantId);
  }
  
  return { idToken, tenantId };
}

/**
 * GET handler for employees API
 */
export async function GET(request) {
  try {
    // Always check for authentication in both dev and prod
    const { idToken, tenantId } = await extractAuthInfoFromRequest(request);
    
    // Try to get session from validateServerSession as well
    const session = await validateServerSession();
    
    // Combine auth info from both sources
    const finalIdToken = idToken || session?.tokens?.idToken;
    let finalTenantId = tenantId;
    
    // If still no tenant ID, try to get from session
    if (!finalTenantId && session?.user?.attributes) {
      finalTenantId = session.user.attributes['custom:tenant_ID'] || 
                      session.user.attributes['custom:tenantId'] || 
                      session.user.attributes['custom:businessid'] || 
                      session.user.attributes['custom:tenant_ID'];
    }
    
    // Require authentication token
    if (!finalIdToken) {
      logger.error('[API] Authentication required but not provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Require tenant ID
    if (!finalTenantId) {
      logger.error('[API] Tenant ID not found in request or session');
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }
    
    logger.info(`[API] Fetching employees for tenant: ${finalTenantId}`);

    // Extract search query
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    // Use real database when in production mode or when PROD_MODE is explicitly set
    const isProdMode = process.env.NODE_ENV === 'production' || process.env.PROD_MODE === 'true';
    
    if (!isProdMode) {
      // Filter employees by query if provided
      const filteredEmployees = query 
        ? MOCK_EMPLOYEES.filter(emp => 
            emp.first_name.toLowerCase().includes(query.toLowerCase()) || 
            emp.last_name.toLowerCase().includes(query.toLowerCase()) ||
            emp.email.toLowerCase().includes(query.toLowerCase()))
        : MOCK_EMPLOYEES;
      
      logger.info(`[API] Returning ${filteredEmployees.length} mock employees`);
      
      // Add a delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return NextResponse.json(filteredEmployees);
    }
    
    // Production mode - connect to real backend
    logger.info('[API] Using production mode, connecting to real backend API');
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await serverAxiosInstance.get(`${API_URL}/api/hr/employees/`, {
        headers: {
          'Authorization': `Bearer ${finalIdToken}`,
          'X-Tenant-ID': finalTenantId,
          'X-Schema-Name': `tenant_${finalTenantId.replace(/-/g, '_')}`,
          'X-Business-ID': finalTenantId,
        },
        params: {
          q: query,
        }
      });
      
      logger.info(`[API] Successfully fetched ${response.data.length} employees from backend`);
      return NextResponse.json(response.data);
    } catch (error) {
      // Check specifically for SSL protocol errors
      if (error.code === 'EPROTO') {
        logger.error('[API] SSL Protocol error - possible mismatch between HTTP/HTTPS:', error.message);
        return NextResponse.json(
          { 
            error: 'SSL Protocol error - possible mismatch between HTTP/HTTPS', 
            details: error.message,
            solution: 'Ensure both frontend and backend are using the same protocol (HTTP or HTTPS)'
          },
          { status: 500 }
        );
      }
      
      logger.error('[API] Error connecting to backend API:', error);
      return NextResponse.json(
        { error: 'Failed to connect to backend API', details: error.message },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error('[API] Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler for employees API
 */
export async function POST(request) {
  try {
    // Always check for authentication in both dev and prod
    const { idToken, tenantId } = await extractAuthInfoFromRequest(request);
    
    // Try to get session from validateServerSession as well
    const session = await validateServerSession();
    
    // Combine auth info from both sources
    const finalIdToken = idToken || session?.tokens?.idToken;
    let finalTenantId = tenantId;
    
    // If still no tenant ID, try to get from session
    if (!finalTenantId && session?.user?.attributes) {
      finalTenantId = session.user.attributes['custom:tenant_ID'] || 
                      session.user.attributes['custom:tenantId'] || 
                      session.user.attributes['custom:businessid'] || 
                      session.user.attributes['custom:tenant_ID'];
    }
    
    // Require authentication token
    if (!finalIdToken) {
      logger.error('[API] Authentication required but not provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Require tenant ID
    if (!finalTenantId) {
      logger.error('[API] Tenant ID not found in request or session');
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }
    
    logger.info(`[API] Creating employee for tenant: ${finalTenantId}`);

    // Parse request body
    const employeeData = await request.json();
    
    // Use real database when in production mode or when PROD_MODE is explicitly set
    const isProdMode = process.env.NODE_ENV === 'production' || process.env.PROD_MODE === 'true';
    
    if (!isProdMode) {
      const mockEmployee = {
        id: Math.floor(Math.random() * 10000).toString(),
        ...employeeData,
        tenant_id: finalTenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add a delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      logger.info('[API] Created mock employee:', mockEmployee);
      return NextResponse.json(mockEmployee);
    }
    
    // Production mode - connect to real backend
    logger.info('[API] Using production mode, connecting to real backend API');
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Include the tenant ID in the employee data
      const dataWithTenant = {
        ...employeeData,
        tenant_id: finalTenantId,
      };
      
      const response = await serverAxiosInstance.post(`${API_URL}/api/hr/employees/create/`, dataWithTenant, {
        headers: {
          'Authorization': `Bearer ${finalIdToken}`,
          'X-Tenant-ID': finalTenantId,
          'X-Schema-Name': `tenant_${finalTenantId.replace(/-/g, '_')}`,
          'X-Business-ID': finalTenantId,
        }
      });
      
      logger.info('[API] Successfully created employee in backend', response.data);
      return NextResponse.json(response.data);
    } catch (error) {
      logger.error('[API] Error connecting to backend API:', error);
      return NextResponse.json(
        { error: 'Failed to connect to backend API', details: error.message },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error('[API] Error creating employee:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create employee',
        details: error.message
      },
      { status: 500 }
    );
  }
} 