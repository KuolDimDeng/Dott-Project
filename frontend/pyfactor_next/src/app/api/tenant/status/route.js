import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverAuth';
import { serverAxiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Get auth session
    let session;
    try {
      session = await validateServerSession();
      logger.debug('[API:tenant/status] Session validated successfully', { 
        hasSession: !!session,
        hasTokens: session?.tokens ? 'yes' : 'no'
      });
    } catch (error) {
      logger.error('[API:tenant/status] Session validation failed', {
        error: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session || !session.tokens?.accessToken) {
      logger.error('[API:tenant/status] Missing tokens in session', { 
        session: session ? 'exists' : 'missing',
        accessToken: session?.tokens?.accessToken ? 'exists' : 'missing'
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract tenant ID from cookies or headers
    const cookieStore = cookies();
    let tenantId = cookieStore.get('tenantId')?.value;
    if (!tenantId) {
      tenantId = request.headers.get('x-tenant-id');
    }

    if (!tenantId) {
      logger.error('[API:tenant/status] No tenant ID found in cookies or headers');
      return NextResponse.json(
        { error: 'No tenant ID available' },
        { status: 400 }
      );
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    logger.info('[API:tenant/status] Tenant status check - triggering schema creation:', { 
      tenantId,
      schemaName
    });

    // Prepare headers with auth tokens
    const headers = {
      'Authorization': `Bearer ${session.tokens.accessToken}`,
      'X-Id-Token': session.tokens.idToken,
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      'X-Schema-Name': schemaName
    };

    try {
      // First check if schema exists using a direct endpoint to avoid initialization if already present
      const checkResponse = await serverAxiosInstance.get(
        '/api/tenant/exists/', 
        { headers }
      );
      
      logger.debug('[API:tenant/status] Schema existence check response:', checkResponse.data);
      
      if (checkResponse.data.exists && checkResponse.data.schema_exists) {
        logger.info('[API:tenant/status] Tenant schema already exists, returning success');
        return NextResponse.json({
          success: true,
          message: 'Tenant schema already exists',
          schema_exists: true,
          schema_name: schemaName,
          tenant_id: tenantId
        });
      }
    } catch (checkError) {
      logger.warn('[API:tenant/status] Schema existence check failed, proceeding to creation', {
        error: checkError.message
      });
      // Continue to creation attempt if check fails
    }

    // Call dashboard schema setup endpoint directly instead of the /tenant/ensure-schema endpoint
    try {
      logger.debug('[API:tenant/status] Calling dashboard schema setup endpoint');
      
      const response = await serverAxiosInstance.post(
        '/api/dashboard/schema-setup/',
        { 
          tenantId,
          force: true // Force schema creation even if it exists
        },
        { headers }
      );
      
      logger.info('[API:tenant/status] Schema setup response:', response.data);
      
      return NextResponse.json({
        success: true,
        message: 'Tenant schema creation triggered',
        ...response.data
      });
    } catch (setupError) {
      logger.error('[API:tenant/status] Schema setup request failed', {
        error: setupError.message,
        response: setupError.response?.data,
        status: setupError.response?.status
      });
      
      // Fall back to a lighter-weight tenant creation endpoint if dashboard setup fails
      try {
        const fallbackResponse = await serverAxiosInstance.post(
          '/api/tenant/create/',
          { tenantId },
          { headers }
        );
        
        logger.info('[API:tenant/status] Fallback tenant creation successful:', fallbackResponse.data);
        
        return NextResponse.json({
          success: true,
          message: 'Tenant schema created via fallback',
          ...fallbackResponse.data
        });
      } catch (fallbackError) {
        throw new Error(`Both schema setup and fallback creation failed: ${fallbackError.message}`);
      }
    }
  } catch (error) {
    logger.error('[API:tenant/status] Error processing request:', {
      error: error.message,
      stack: error.stack,
      cause: error.cause?.message
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create tenant schema',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 