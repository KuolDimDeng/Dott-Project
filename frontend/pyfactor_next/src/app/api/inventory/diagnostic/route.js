import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { jwtDecode } from 'jwt-decode';
import { getTokens } from '@/utils/apiUtils';

/**
 * API route to diagnose authentication issues
 * This checks token validity and provides debugging information
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { tenantId } = data;
    
    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: tenantId',
        diagnosticInfo: null 
      }, { status: 400 });
    }
    
    logger.info(`[API][inventory/diagnostic] Running diagnostics for tenant ${tenantId}`);
    
    // Get auth headers for debugging (safe version)
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      // Safely include auth headers for diagnostic purposes
      if (key.toLowerCase().includes('authorization') || 
          key.toLowerCase().includes('token')) {
        headers[key] = '[REDACTED]';
      } else {
        headers[key] = value;
      }
    }
    
    // Extract tokens using the apiUtils function
    const { accessToken, idToken } = await getTokens(request);
    
    // Get raw headers for additional debugging
    const rawHeaders = {};
    for (const [key, value] of request.headers.entries()) {
      // Include all headers but redact sensitive values
      if (key.toLowerCase().includes('authorization') || 
          key.toLowerCase().includes('token')) {
        rawHeaders[key] = 'present-but-redacted';
      } else {
        rawHeaders[key] = value;
      }
    }
    
    // Check for cookies
    const cookies = {};
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name.includes('token') || name.includes('auth')) {
          cookies[name] = 'present-but-redacted';
        } else {
          cookies[name] = value;
        }
      });
    }
    
    // Check authentication status
    let authInfo = {};
    try {
      if (!accessToken) {
        authInfo.status = 'missing_access_token';
        authInfo.message = 'No access token provided';
      } else if (!idToken) {
        authInfo.status = 'missing_id_token';
        authInfo.message = 'No ID token provided';
      } else {
        // Decode the tokens to check validity
        try {
          const decodedAccess = jwtDecode(accessToken);
          const decodedId = jwtDecode(idToken);
          
          const now = Math.floor(Date.now() / 1000);
          const accessTokenExpiry = decodedAccess.exp || 0;
          const idTokenExpiry = decodedId.exp || 0;
          
          // Check if tokens are expired
          const isAccessTokenExpired = now >= accessTokenExpiry;
          const isIdTokenExpired = now >= idTokenExpiry;
          
          if (isAccessTokenExpired || isIdTokenExpired) {
            authInfo.status = 'token_expired';
            authInfo.message = 'One or more tokens are expired';
          } else {
            authInfo.status = 'valid';
            authInfo.message = 'Tokens are valid';
          }
          
          // Add token details
          authInfo.userId = decodedAccess.sub || decodedId.sub || null;
          authInfo.accessTokenExpiry = accessTokenExpiry;
          authInfo.idTokenExpiry = idTokenExpiry;
          authInfo.currentTime = now;
          authInfo.timeRemaining = Math.min(
            accessTokenExpiry - now,
            idTokenExpiry - now
          );
        } catch (decodeError) {
          authInfo.status = 'invalid_token_format';
          authInfo.message = `Error decoding token: ${decodeError.message}`;
        }
      }
    } catch (authError) {
      authInfo.status = 'auth_check_error';
      authInfo.message = `Error checking authentication: ${authError.message}`;
    }
      
    // Create diagnostic info structure
    const diagnosticInfo = {
      tenant: {
        id: tenantId,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`
      },
      auth: authInfo,
      requestInfo: {
        method: request.method,
        headers: headers,
        rawHeaders: rawHeaders,
        cookies: cookies,
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      diagnosticInfo,
      message: 'Authentication diagnostic information retrieved successfully'
    });
  } catch (error) {
    logger.error('[API][inventory/diagnostic] Error:', error);
    return NextResponse.json({ 
      error: 'Error running diagnostics',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on diagnostic results
 */
function generateRecommendations(diagnosticInfo) {
  const recommendations = [];
  
  if (!diagnosticInfo.schema.exists) {
    recommendations.push("The tenant schema doesn't exist. Try logging out and back in or contact support.");
  }
  
  if (diagnosticInfo.schema.exists && !diagnosticInfo.schema.hasInventoryProductTable) {
    if (diagnosticInfo.migrations.applied) {
      recommendations.push("The inventory_product table was created through migrations. Try loading the inventory page again.");
    } else if (diagnosticInfo.migrations.error) {
      recommendations.push("The inventory_product table is missing and migrations failed. Contact support for database initialization.");
    } else {
      recommendations.push("The inventory_product table is missing. Try running migrations or contact support.");
    }
  }
  
  if (diagnosticInfo.schema.hasInventoryProductTable && !diagnosticInfo.testData.created && diagnosticInfo.testData.error) {
    recommendations.push("Failed to create test data. Try creating a product manually through the UI.");
  }
  
  if (diagnosticInfo.schema.hasInventoryProductTable && diagnosticInfo.testData.created) {
    recommendations.push("Test product was successfully created. You should be able to see it in the inventory list.");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("No specific recommendations. If you're still having issues, contact support.");
  }
  
  return recommendations;
}