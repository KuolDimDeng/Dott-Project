import { NextResponse } from 'next/server';
import { serverAxiosInstance } from '@/lib/axiosConfig';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';

// Function to extract tenant ID from Cognito attributes
const getTenantIdFromCognito = (user) => {
  if (!user || !user.attributes) return null;
  
  // Check in priority order
  if (user.attributes['custom:tenant_ID']) {
    return user.attributes['custom:tenant_ID'];
  }
  if (user.attributes['custom:businessid']) {
    return user.attributes['custom:businessid'];
  }
  if (user.attributes['custom:tenantId']) {
    return user.attributes['custom:tenantId'];
  }
  if (user.attributes['custom:tenant_id']) {
    return user.attributes['custom:tenant_id'];
  }
  
  return null;
};

export async function GET(request) {
  try {
    // Validate the session and get tokens
    let session;
    try {
      session = await validateServerSession();
      if (!session || !session.tokens || !session.tokens.accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } catch (authError) {
      logger.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    // Get tenant ID from Cognito attributes
    const tenantId = getTenantIdFromCognito(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found in Cognito attributes' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Correctly determine the API URL - ensure it uses HTTP in development to avoid SSL errors
    const API_URL = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8000'  // Force HTTP in development
      : (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');
    
    logger.info(`Fetching employees from ${API_URL}/api/hr/employees/ with tenant ID: ${tenantId}`);

    try {
      // Create a custom config that disables SSL verification in development
      const axiosConfig = {
        headers: {
          'Authorization': `Bearer ${session.tokens.accessToken}`,
          'X-Id-Token': session.tokens.idToken,
          'X-Tenant-ID': tenantId,
          'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
          'X-Business-ID': tenantId,
        },
        timeout: 15000, // 15 second timeout
      };
      
      // Disable SSL verification in development to prevent EPROTO errors
      if (process.env.NODE_ENV === 'development') {
        axiosConfig.httpsAgent = new (require('https').Agent)({
          rejectUnauthorized: false
        });
      }

      const response = await serverAxiosInstance.get(`${API_URL}/api/hr/employees/?q=${query}`, axiosConfig);

      // If successful, return the data
      return NextResponse.json(response.data);
    } catch (apiError) {
      logger.error('API request error:', apiError.message, {
        code: apiError.code,
        status: apiError.response?.status,
        data: apiError.response?.data
      });

      // Handle SSL errors gracefully
      if (apiError.code === 'EPROTO' || apiError.message?.includes('SSL')) {
        logger.error('SSL/TLS error detected. This may be due to a protocol mismatch or certificate issue.');
        
        // Use mock data in development when there's an SSL error
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Development mode: Returning mock employee data due to SSL error');
          return NextResponse.json([
            {
              id: '1',
              employee_number: 'EMP-000001',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com',
              job_title: 'Software Engineer',
              department: 'Engineering',
              salary: 85000,
              date_joined: '2022-01-15',
              active: true,
              is_mock: true
            },
            {
              id: '2',
              employee_number: 'EMP-000002',
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane.smith@example.com',
              job_title: 'Product Manager',
              department: 'Product',
              salary: 95000,
              date_joined: '2022-02-01',
              active: true,
              is_mock: true
            }
          ]);
        }
      }

      // Check if we should use mock data in development
      const useMockData = process.env.NODE_ENV === 'development' && 
                         (process.env.USE_MOCK_DATA === 'true' ||
                          apiError.code === 'ECONNREFUSED' || 
                          apiError.code === 'ECONNABORTED' ||
                          apiError.code === 'EPROTO');
      
      if (useMockData) {
        logger.warn('Development mode with mock data enabled: Returning mock employees array due to backend connection issue');
        return NextResponse.json([
          {
            id: '1',
            employee_number: 'EMP-000001',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            job_title: 'Software Engineer',
            department: 'Engineering',
            salary: 85000,
            date_joined: '2022-01-15',
            active: true,
            is_mock: true
          }
        ], { status: 200 });
      }

      // Otherwise return the real error details
      return NextResponse.json(
        { 
          error: 'Failed to fetch employees', 
          details: apiError.message,
          code: apiError.code || 'UNKNOWN_ERROR',
          status: apiError.response?.status || 500
        },
        { status: apiError.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error('Error in employees route handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Validate the session and get tokens
    let session;
    try {
      session = await validateServerSession();
      if (!session || !session.tokens || !session.tokens.accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } catch (authError) {
      logger.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    // Get tenant ID from Cognito attributes instead of cookies
    const tenantId = getTenantIdFromCognito(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found in Cognito attributes' }, { status: 400 });
    }
    
    logger.info(`Creating employee with owner's tenant ID: ${tenantId}`);

    const body = await request.json();
    
    // Add tenant ID to the employee data explicitly to ensure it's set
    const employeeData = {
      ...body,
      tenant_id: tenantId  // Ensure the employee belongs to the owner's tenant
    };

    // Correctly determine the API URL - ensure it uses HTTP in development to avoid SSL errors
    const API_URL = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8000'  // Force HTTP in development
      : (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');
    
    try {
      // Create a custom config that disables SSL verification in development
      const axiosConfig = {
        headers: {
          'Authorization': `Bearer ${session.tokens.accessToken}`,
          'X-Id-Token': session.tokens.idToken,
          'X-Tenant-ID': tenantId,
          'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
          'X-Business-ID': tenantId,
        },
        timeout: 15000, // 15 second timeout
      };
      
      // Disable SSL verification in development to prevent EPROTO errors
      if (process.env.NODE_ENV === 'development') {
        axiosConfig.httpsAgent = new (require('https').Agent)({
          rejectUnauthorized: false
        });
      }

      const response = await serverAxiosInstance.post(`${API_URL}/api/hr/employees/create/`, employeeData, axiosConfig);

      return NextResponse.json(response.data);
    } catch (apiError) {
      logger.error('API request error in employee creation:', apiError.message, {
        code: apiError.code,
        status: apiError.response?.status,
        data: apiError.response?.data
      });

      // Handle SSL errors gracefully
      if (apiError.code === 'EPROTO' || apiError.message?.includes('SSL')) {
        logger.error('SSL/TLS error detected during employee creation. This may be due to a protocol mismatch or certificate issue.');
        
        if (process.env.NODE_ENV === 'development') {
          // Generate a mock employee response
          const mockId = crypto.randomUUID();
          logger.warn(`Development mode: Returning mock employee creation response with ID: ${mockId}`);
          return NextResponse.json({
            id: mockId,
            employee_number: `EMP-${Date.now().toString().substring(7)}`,
            first_name: body.first_name || 'New',
            last_name: body.last_name || 'Employee',
            email: body.email || 'new.employee@example.com',
            job_title: body.job_title || 'Staff',
            is_mock: true,
            success: true
          });
        }
      }

      // Check if we should use mock data in development
      const useMockData = process.env.NODE_ENV === 'development' && 
                         (process.env.USE_MOCK_DATA === 'true' ||
                          apiError.code === 'ECONNREFUSED' || 
                          apiError.code === 'ECONNABORTED' ||
                          apiError.code === 'EPROTO');
      
      if (useMockData) {
        const mockId = crypto.randomUUID();
        logger.warn(`Development mode with mock data enabled: Returning mock employee creation response with ID: ${mockId}`);
        return NextResponse.json({
          id: mockId,
          employee_number: `EMP-${Date.now().toString().substring(7)}`,
          first_name: body.first_name || 'New',
          last_name: body.last_name || 'Employee',
          email: body.email || 'new.employee@example.com',
          job_title: body.job_title || 'Staff',
          is_mock: true,
          success: true
        }, { status: 200 });
      }

      return NextResponse.json(
        { 
          error: 'Failed to create employee', 
          details: apiError.message,
          code: apiError.code || 'UNKNOWN_ERROR',
          status: apiError.response?.status || 500
        },
        { status: apiError.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error('Error in employee creation route handler:', error);
    return NextResponse.json(
      { error: 'Failed to create employee', details: error.message },
      { status: 500 }
    );
  }
} 