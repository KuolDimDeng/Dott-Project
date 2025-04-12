import { NextResponse } from 'next/server';
import { getAuth } from '@/utils/auth-helpers';
import { serverLogger } from '@/utils/serverLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Server-side UUID validation function
 * @param {string} str - String to validate as UUID
 * @returns {boolean} - Whether the string is a valid UUID
 */
function isValidUUID(str) {
  if (!str) return false;
  // UUID pattern: 8-4-4-4-12 hex digits with hyphens
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

/**
 * Format tenant ID for database compatibility
 * @param {string} tenantId - The tenant ID to format
 * @returns {string} - The formatted tenant ID
 */
function formatTenantId(tenantId) {
  if (!tenantId) return '';
  return tenantId.replace(/-/g, '_');
}

/**
 * Verify tenant API - checks that a tenant ID is valid and accessible by the current user
 * This API provides a security boundary for tenant access validation
 */
export async function GET(request) {
  const requestId = uuidv4().slice(0, 8);
  serverLogger.info(`[tenant/verify] Request started: ${requestId}`);
  
  try {
    // Get tenant ID from query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Validate tenant ID format
    if (!tenantId || !isValidUUID(tenantId)) {
      return NextResponse.json(
        { 
          error: 'Invalid tenant ID format',
          requestId
        },
        { status: 400 }
      );
    }
    
    // Get authorization details
    const auth = await getAuth();
    
    // For unauthenticated requests, return minimal info
    if (!auth.user) {
      serverLogger.warn(`[tenant/verify] Unauthorized tenant verification attempt for tenant: ${tenantId}`);
      return NextResponse.json(
        { 
          error: 'Authentication required for full tenant verification',
          tenantExists: true, // Only verify the tenant exists, not access rights
          requestId
        },
        { status: 401 }
      );
    }
    
    // Check if the user has a tenant ID in their Cognito attributes
    // Prioritize custom:tenant_ID as the source of truth
    const cognitoTenantId = auth.user['custom:tenant_ID'] || 
                           auth.user['custom:tenant_id'] || 
                           auth.user['custom:tenantId'] || 
                           auth.user['custom:businessid'];
    
    // If there's a mismatch between requested tenant ID and Cognito tenant ID, return it
    if (cognitoTenantId && cognitoTenantId !== tenantId) {
      serverLogger.warn(`[tenant/verify] Tenant ID mismatch: Request=${tenantId}, Cognito=${cognitoTenantId}`);
      return NextResponse.json({
        mismatch: true,
        correctTenantId: cognitoTenantId,
        message: 'Tenant ID in request does not match user\'s tenant ID in Cognito',
        cognitoTenantId,
        requestId
      });
    }
    
    // For authenticated requests, call backend to verify tenant access
    const userId = auth.user.id || auth.user.sub;
    serverLogger.info(`[tenant/verify] Verifying tenant ${tenantId} for user ${userId}`, {
      cognitoTenantId: cognitoTenantId || 'not set'
    });
    
    // Make request to Django backend for full verification
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/tenant/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        tenantId,
        userId
      })
    });
    
    // Handle non-200 responses
    if (!response.ok) {
      try {
        const errorData = await response.json();
        serverLogger.error(`[tenant/verify] Backend verification failed:`, errorData);
        
        // If backend tells us there's a mismatch but provides the correct tenant ID
        if (errorData.correctTenantId) {
          return NextResponse.json({
            mismatch: true,
            correctTenantId: errorData.correctTenantId,
            error: errorData.error || 'Tenant mismatch',
            requestId
          }, { status: 409 }); // 409 Conflict - indicates a mismatch that can be fixed
        }
        
        return NextResponse.json(
          {
            error: errorData.error || 'Tenant verification failed',
            requestId
          },
          { status: response.status }
        );
      } catch (jsonError) {
        serverLogger.error(`[tenant/verify] Error parsing backend response:`, jsonError);
        return NextResponse.json(
          { 
            error: 'Backend verification error',
            status: response.status,
            requestId
          },
          { status: 500 }
        );
      }
    }
    
    // Process successful response
    const verificationResult = await response.json();
    
    // Check for tenant mismatch
    if (verificationResult.mismatch || verificationResult.correctTenantId) {
      serverLogger.warn(`[tenant/verify] Tenant mismatch detected: Requested ${tenantId}, actual ${verificationResult.correctTenantId}`);
      return NextResponse.json({
        mismatch: true,
        correctTenantId: verificationResult.correctTenantId,
        message: verificationResult.message || 'Tenant ID mismatch detected',
        requestId
      });
    }
    
    // Success case
    serverLogger.info(`[tenant/verify] Tenant ${tenantId} verified successfully for user ${userId}`);
    return NextResponse.json({
      verified: true,
      tenantId: verificationResult.tenantId || tenantId,
      name: verificationResult.name,
      isActive: verificationResult.isActive !== false,
      message: 'Tenant verification successful',
      requestId
    });
    
  } catch (error) {
    serverLogger.error(`[tenant/verify] Error processing request:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        requestId
      },
      { status: 500 }
    );
  }
}

// Add support for POST method
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { tenantId, userId } = body;
    
    if (!tenantId) {
      console.error('[TenantVerify] No tenant ID provided in request');
      return NextResponse.json(
        {
          isValid: false,
          error: 'No tenant ID provided'
        },
        { status: 400 }
      );
    }
    
    // Format tenant ID for database compatibility
    const formattedTenantId = formatTenantId(tenantId);
    
    console.info('[TenantVerify] Verifying tenant:', { 
      originalId: tenantId,
      formattedId: formattedTenantId,
      userId
    });
    
    // For development, since we may not have a database connection,
    // just return the tenant as valid if the UUID format is correct
    if (process.env.NODE_ENV === 'development' && isValidUUID(tenantId)) {
      console.info('[TenantVerify] Development mode: returning mock tenant data');
      
      return NextResponse.json({
        isValid: true,
        tenantId: tenantId,
        name: `Tenant ${tenantId.substring(0, 8)}`,
        message: 'Tenant verified in development mode',
        status: 'active'
      });
    }
    
    try {
      // Try to validate tenant ID with database
      const { Pool } = require('pg');
      
      const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME
      };
      
      // Only attempt direct DB connection if we have credentials
      if (dbConfig.user && dbConfig.password && dbConfig.host && dbConfig.database) {
        console.info('[TenantVerify] Attempting direct database check');
        
        const pool = new Pool(dbConfig);
        
        const query = `
          SELECT id, name, status
          FROM tenants
          WHERE id = $1
          LIMIT 1;
        `;
        
        const result = await pool.query(query, [formattedTenantId]);
        
        pool.end();
        
        if (result.rows && result.rows.length > 0) {
          console.info('[TenantVerify] Tenant found in database:', result.rows[0]);
          
          const tenant = result.rows[0];
          
          return NextResponse.json({
            isValid: true,
            tenant: {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
              tenant_id: formatTenantId(tenant.id)
            },
            direct_db: true
          });
        } else {
          console.warn('[TenantVerify] Tenant not found in database:', { tenantId: formattedTenantId });
          
          // Return invalid status to keep dashboard in loading state
          return NextResponse.json({
            isValid: false,
            message: 'Tenant not found in database',
            error: 'TENANT_NOT_FOUND',
            tenantId: formattedTenantId
          }, { status: 404 });
        }
      }
    } catch (dbError) {
      console.error('[TenantVerify] Database verification failed:', dbError);
      // Return error to keep dashboard in loading state
      return NextResponse.json({
        isValid: false,
        message: 'Database verification failed',
        error: 'DB_ERROR',
        details: dbError.message
      }, { status: 500 });
    }
    
    // For development without DB, accept valid UUID format
    if (process.env.NODE_ENV === 'development' && isValidUUID(tenantId)) {
      console.info('[TenantVerify] Development mode: returning mock tenant data');
      
      return NextResponse.json({
        isValid: true,
        tenantId: tenantId,
        name: `Tenant ${tenantId.substring(0, 8)}`,
        message: 'Tenant verified in development mode',
        status: 'active'
      });
    }
    
    // Return invalid status since no tenant was found
    return NextResponse.json({
      isValid: false,
      message: 'No valid tenant record found',
      error: 'TENANT_INVALID',
      tenantId: formattedTenantId
    }, { status: 404 });
    
  } catch (error) {
    console.error('[TenantVerify] Error in POST verify:', error);
    
    // Return error to keep dashboard in loading state
    return NextResponse.json({
      isValid: false,
      message: 'Error processing request',
      error: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 });
  }
} 