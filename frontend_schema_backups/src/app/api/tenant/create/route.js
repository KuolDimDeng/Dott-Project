import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Get authenticated user
    const auth = await getAuth();
    
    if (!auth.accessToken) {
      logger.error('[TenantCreate] No access token available');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user ID either from auth.user or from request body
    let userId;
    
    if (auth.user && auth.user.id) {
      userId = auth.user.id;
    } else {
      // Try to get from request body as fallback
      try {
        const body = await request.json();
        userId = body.userId || body.user_id;
      } catch (parseError) {
        logger.warn('[TenantCreate] Could not parse request body:', parseError);
      }
      
      // If still no user ID, get from request headers
      if (!userId) {
        userId = request.headers.get('x-user-id');
      }
      
      // If still no user ID, extract from token
      if (!userId && auth.idToken) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(auth.idToken);
          if (decoded && decoded.sub) {
            userId = decoded.sub;
            logger.info('[TenantCreate] Extracted user ID from token:', userId);
          }
        } catch (tokenError) {
          logger.warn('[TenantCreate] Error extracting user ID from token:', tokenError);
        }
      }
    }
    
    if (!userId) {
      logger.error('[TenantCreate] Could not determine user ID');
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    // Call backend API to create schema
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/tenant/create/`;
    
    logger.debug('[TenantCreate] Calling backend API:', { 
      url: apiUrl,
      userId,
      hasToken: !!auth.accessToken
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Id-Token': auth.idToken || '' // Include ID token if available
      },
      body: JSON.stringify({
        user_id: userId
      })
    });

    if (!response.ok) {
      let errorData = { message: 'Unknown error' };
      
      try {
        errorData = await response.json();
      } catch (e) {
        errorData.message = await response.text();
      }
      
      logger.error('[TenantCreate] Error from backend API', { 
        status: response.status,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to create tenant schema',
          message: errorData.message || errorData.error || 'Backend API error',
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info('[TenantCreate] Successfully created tenant schema', { data });
    
    return NextResponse.json({
      success: true,
      tenant_id: data.tenant_id,
      /* RLS: tenant_id instead of schema_name */
    tenant_id: tenant.id,
      message: 'Tenant schema created successfully'
    });
  } catch (error) {
    logger.error('[TenantCreate] Error creating tenant schema', { 
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create tenant schema', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 