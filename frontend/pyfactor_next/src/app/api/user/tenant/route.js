import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/utils/getServerUser';
import { verifyToken } from '@/utils/serverAuth';
import { COGNITO_ATTRIBUTES } from '@/constants/onboarding';
import { v5 as uuidv5 } from 'uuid';
import { logger } from '@/utils/serverLogger';

// Namespace for deterministic tenant ID generation
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';

/**
 * GET endpoint to retrieve the user's tenant ID
 * Retrieves tenant ID from Cognito attributes or generates one if not found
 */
export async function GET(request) {
  try {
    logger.info('Retrieving user tenant ID');
    
    // Get the current user from the server
    const user = await getServerUser(request);
    
    if (!user) {
      logger.warn('No authenticated user found');
      return NextResponse.json({
        message: 'User not authenticated',
        authenticated: false
      }, { status: 401 });
    }
    
    // First check cookies for existing tenant ID
    const cookieStore = cookies();
    const tenantIdCookie = cookieStore.get('tenantId')?.value;
    
    // Next, check auth token claims for tenant ID
    let tenantIdFromToken = null;
    if (user.token) {
      try {
        const tokenPayload = await verifyToken(user.token);
        if (tokenPayload) {
          tenantIdFromToken = tokenPayload['custom:businessid'] || tokenPayload['custom:tenant_id'];
          if (tenantIdFromToken) {
            logger.debug('Found tenant ID in token claims:', tenantIdFromToken);
          }
        }
      } catch (tokenError) {
        logger.error('Error verifying token:', tokenError);
      }
    }
    
    // Check Cognito attributes directly 
    const tenantIdFromAttributes = user.attributes?.[COGNITO_ATTRIBUTES.BUSINESS_ID] || 
                                  user.attributes?.['custom:businessid'] || 
                                  user.attributes?.['custom:tenant_id'];
    
    // If we have a tenant ID from any source, return it
    if (tenantIdFromAttributes || tenantIdFromToken || tenantIdCookie) {
      // Prioritize in this order: Cognito attributes, token claims, cookie
      const effectiveTenantId = tenantIdFromAttributes || tenantIdFromToken || tenantIdCookie;
      
      logger.info('Using tenant ID:', {
        source: tenantIdFromAttributes ? 'cognito_attributes' : 
                tenantIdFromToken ? 'token_claims' : 'cookie',
        tenantId: effectiveTenantId?.substring(0, 8) + '...'
      });
      
      // Store in cookie for future use (renew/refresh)
      cookieStore.set('tenantId', effectiveTenantId, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      return NextResponse.json({
        tenantId: effectiveTenantId,
        source: tenantIdFromAttributes ? 'cognito_attributes' : 
                tenantIdFromToken ? 'token_claims' : 'cookie'
      });
    }
    
    // If we don't have a tenant ID yet, generate one deterministically from user ID
    if (user.sub) {
      try {
        // Generate a deterministic ID based on user sub (Cognito user ID)
        const generatedTenantId = uuidv5(user.sub, TENANT_NAMESPACE);
        
        logger.info('Generated tenant ID from user sub:', {
          userId: user.sub?.substring(0, 8) + '...',
          tenantId: generatedTenantId?.substring(0, 8) + '...'
        });
        
        // Store in cookie
        cookieStore.set('tenantId', generatedTenantId, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        
        return NextResponse.json({
          tenantId: generatedTenantId,
          source: 'generated',
          userId: user.sub
        });
      } catch (generationError) {
        logger.error('Error generating tenant ID:', generationError);
      }
    }
    
    // If we reach here, we couldn't get or generate a tenant ID
    return NextResponse.json({
      message: 'Could not determine tenant ID',
      error: 'tenant_id_missing',
      authenticated: true
    }, { status: 404 });
    
  } catch (error) {
    logger.error('Error processing request:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    return NextResponse.json({
      message: 'Error retrieving tenant information',
      error: error.message,
      errorType: error.name
    }, { status: 500 });
  }
}

/**
 * POST endpoint to create/update the user's tenant ID
 * Allows clients to explicitly set a tenant ID 
 */
export async function POST(request) {
  try {
    // Get the current user from the server
    const user = await getServerUser(request);
    
    if (!user) {
      logger.warn('No authenticated user found');
      return NextResponse.json({
        message: 'User not authenticated',
        authenticated: false
      }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json({
        message: 'Tenant ID is required',
        error: 'missing_tenant_id'
      }, { status: 400 });
    }
    
    // Validate format (only accept UUID format)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(tenantId)) {
      logger.warn('Invalid tenant ID format in request:', tenantId);
      return NextResponse.json({
        message: 'Invalid tenant ID format - must be UUID format',
        error: 'invalid_tenant_id_format'
      }, { status: 400 });
    }
    
    logger.info('Updated tenant ID:', {
      userId: user.sub?.substring(0, 8) + '...',
      tenantId: tenantId?.substring(0, 8) + '...'
    });
    
    // Create response
    const response = NextResponse.json({
      tenantId,
      updated: true,
      message: 'Tenant ID updated successfully'
    });
    
    // Store in cookie
    response.cookies.set('tenantId', tenantId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
    
  } catch (error) {
    logger.error('Error processing request:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    return NextResponse.json({
      message: 'Error updating tenant information',
      error: error.message
    }, { status: 500 });
  }
}