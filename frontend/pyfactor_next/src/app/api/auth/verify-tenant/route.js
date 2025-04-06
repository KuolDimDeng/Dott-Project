import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getAccessToken } from '@/utils/tokenUtils';
import { getAuthHeaders } from '@/utils/authHeaders';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

/**
 * Server-safe method to get email-to-tenant mapping
 * @param {string} email - Email to check
 * @returns {Promise<string|null>} Tenant ID if found or null
 */
async function getEmailToTenantMapping(email) {
  try {
    // For server-side, we can only check the backend API
    const accessToken = await getAccessToken();
    const headers = await getAuthHeaders();
    
    if (!accessToken) {
      logger.warn('[verify-tenant] No access token available for email check');
      return null;
    }
    
    try {
      const emailCheckResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/check-email`, {
        email
      }, {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (emailCheckResponse.data && emailCheckResponse.data.tenantId) {
        return emailCheckResponse.data.tenantId;
      }
    } catch (e) {
      logger.debug('[verify-tenant] Backend email check failed:', e.message);
    }
    
    return null;
  } catch (e) {
    logger.error('[verify-tenant] Error checking email-to-tenant mapping:', e.message);
    return null;
  }
}

/**
 * Verify tenant ID API route
 * This checks for existing tenants before creating a new one
 */
export async function POST(request) {
  try {
    // Get request data and headers
    const body = await request.json();
    
    // Extract data from request
    const { tenantId: providedTenantId, userId, email, username } = body;
    const requestId = request.headers.get('X-Request-ID') || uuidv4();

    logger.info('[verify-tenant] Tenant verification request', { 
      requestId,
      userId,
      email,
      providedTenantId,
      hasUsername: !!username
    });

    // Extract authentication headers
    const authorizationHeader = request.headers.get('Authorization');
    const idToken = request.headers.get('X-Id-Token');
    
    // Log headers for debugging
    logger.debug('[verify-tenant] Headers present', { 
      hasAuth: !!authorizationHeader,
      hasIdToken: !!idToken,
    });
    
    // Build headers for backend API calls
    const authHeaders = {
      'X-Request-ID': requestId
    };
    
    // Add ID token if available
    if (idToken) {
      authHeaders['X-Id-Token'] = idToken;
    }
    
    // Add user ID if available
    if (userId) {
      authHeaders['X-User-ID'] = userId;
    }
    
    // Extract access token from authorization header
    let accessToken = null;
    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      accessToken = authorizationHeader.substring(7);
      logger.debug('[verify-tenant] Extracted access token from authorization header');
    }
    
    if (!accessToken) {
      logger.warn('[verify-tenant] No access token provided');
    }
    
    // If email is provided, let's prioritize looking up tenant by email first
    // This is the most reliable way to find a user's tenant
    if (email) {
      try {
        logger.info('[verify-tenant] Looking up tenant by email:', { email });
        
        // Make API call to find tenant by email
        const emailLookupResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/by-email/${encodeURIComponent(email)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        
        // If email lookup succeeds, use that tenant ID
        if (emailLookupResponse.data && emailLookupResponse.data.tenantId) {
          const foundTenantId = emailLookupResponse.data.tenantId;
          logger.info('[verify-tenant] Found tenant by email lookup:', { 
            email, 
            tenantId: foundTenantId 
          });
          
          // Store the tenant ID in a cookie
          const cookieStore = cookies();
          cookieStore.set('tenantId', foundTenantId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          // Return the found tenant ID
          return NextResponse.json({
            success: true,
            message: 'Found existing tenant by email',
            tenantId: foundTenantId,
            schemaName: `tenant_${foundTenantId.replace(/-/g, '_')}`,
            source: 'email_tenant_lookup'
          });
        }
      } catch (error) {
        // Log error but continue with other verification methods
        logger.error('[verify-tenant] Error looking up tenant by email:', {
          error: error.message,
          email
        });
      }
    }
    
    // If a specific tenant ID is provided, verify it exists
    if (providedTenantId && accessToken) {
      try {
        // Check if tenant exists and is valid
        logger.info('[verify-tenant] Checking if provided tenant exists:', { providedTenantId });
        
        const tenantCheckResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/exists/${providedTenantId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
              Authorization: `Bearer ${accessToken}`
            }
          }
        ).then(res => res.json());
        
        if (tenantCheckResponse.exists) {
          logger.info('[verify-tenant] Provided tenant exists, using it:', { providedTenantId });
          
          // Store the tenant ID in a cookie
          const cookieStore = cookies();
          cookieStore.set('tenantId', providedTenantId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          return NextResponse.json({
            success: true,
            message: 'Using verified existing tenant',
            tenantId: providedTenantId,
            schemaName: `tenant_${providedTenantId.replace(/-/g, '_')}`,
            source: 'verified_existing'
          });
        } else {
          logger.warn('[verify-tenant] Provided tenant does not exist, will try other methods');
        }
      } catch (error) {
        logger.error('[verify-tenant] Error checking if tenant exists:', {
          error: error.message,
          providedTenantId
        });
      }
    }
    
    // Check if this is a dashboard request
    const referer = request.headers.get('referer') || '';
    const isDashboardRequest = referer.includes('/dashboard');
    
    // First check if a tenant already exists for this user on the backend
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        if (response.status !== 404) {
          logger.error('[verify-tenant] Error checking for existing tenant:', {
            status: response.status
          });
        } else {
          logger.info('[verify-tenant] No existing tenant found for user');
        }
        // Continue with the rest of the function
      } else {
        // Process the successful response
        const data = await response.json();
        
        // If user already has a tenant, use it
        if (data && data.tenantId) {
          const existingTenantId = data.tenantId;
          logger.info('[verify-tenant] Found existing tenant for user:', { 
            userId, 
            tenantId: existingTenantId
          });
        
          // Store the tenant ID in a cookie for future server-side access
          const cookieStore = await cookies();
          await cookieStore.set('tenantId', existingTenantId, { 
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
        
          return NextResponse.json({
            success: true,
            message: 'Using existing tenant for user',
            tenantId: existingTenantId,
            correctTenantId: existingTenantId,
            schemaName: `tenant_${existingTenantId.replace(/-/g, '_')}`,
            source: 'user_lookup'
          });
        }
      }
    } catch (error) {
      logger.error('[verify-tenant] Exception checking for existing tenant:', { 
        error: error.message
      });
    }

    // Check email-to-tenant mapping as a fallback
    let existingTenantId = null;
    
    if (email) {
      existingTenantId = await getEmailToTenantMapping(email);
      
      if (existingTenantId) {
        logger.info('[verify-tenant] Found existing tenant for email:', {
          email,
          existingTenantId
        });
      }
    }
    
    // If a tenant was found for this email, return it
    if (existingTenantId) {
      logger.info('[verify-tenant] Using existing tenant for email:', { 
        email, 
        tenantId: existingTenantId
      });
      
      // Store the tenant ID in a cookie for future server-side access
      const cookieStore = await cookies();
      await cookieStore.set('tenantId', existingTenantId, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Tenant verified by email',
        tenantId: existingTenantId,
        correctTenantId: existingTenantId,
        schemaName: `tenant_${existingTenantId.replace(/-/g, '_')}`,
        source: 'email_lookup'
      });
    }
    
    // If a valid tenant ID was provided and no existing tenant was found
    if (providedTenantId) {
      logger.info('[verify-tenant] Using provided tenant ID:', { tenantId: providedTenantId });
      
      // Verify this tenant exists and isn't assigned to another user
      try {
        // Use our temporary tenant/exists endpoint with fetch instead of axios
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/exists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ tenantId: providedTenantId })
        });
        
        // Proper error handling for the response
        if (!response.ok) {
          throw new Error(`Tenant check failed with status: ${response.status}`);
        }
        
        const tenantCheckResponse = await response.json();
        
        // If the tenant exists but belongs to another user
        if (tenantCheckResponse.exists && tenantCheckResponse.correctTenantId) {
          const correctTenantId = tenantCheckResponse.correctTenantId;
          
          logger.warn('[verify-tenant] Tenant belongs to another user, using correct tenant ID:', { 
            providedTenantId,
            correctTenantId
          });
          
          // Store the correct tenant ID in a cookie
          const cookieStore = await cookies();
          await cookieStore.set('tenantId', correctTenantId, { 
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          return NextResponse.json({
            success: true,
            message: 'Using correct tenant for user',
            tenantId: correctTenantId,
            correctTenantId,
            schemaName: `tenant_${correctTenantId.replace(/-/g, '_')}`,
            source: 'tenant_correction'
          });
        }
        
        // If the tenant exists, store it and return success
        if (tenantCheckResponse.exists) {
          logger.info('[verify-tenant] Tenant exists, storing in cookie:', { tenantId: providedTenantId });
          
          // Store the tenant ID in a cookie
          const cookieStore = await cookies();
          await cookieStore.set('tenantId', providedTenantId, { 
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          return NextResponse.json({
            success: true,
            message: 'Tenant verified',
            tenantId: providedTenantId,
            schemaName: `tenant_${providedTenantId.replace(/-/g, '_')}`,
            source: 'tenant_exists'
          });
        }
      } catch (e) {
        logger.error('[verify-tenant] Error checking tenant existence:', { error: e.message });
        // Continue execution - we'll create a new tenant below
      }
      
      // If we reach here, the tenant doesn't exist or couldn't be verified
      // Store the tenant ID in a cookie anyway and proceed with onboarding
      logger.info('[verify-tenant] Using provided tenant ID with no verification:', { tenantId: providedTenantId });
      const cookieStore = await cookies();
      await cookieStore.set('tenantId', providedTenantId, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Using provided tenant ID',
        tenantId: providedTenantId,
        schemaName: `tenant_${providedTenantId.replace(/-/g, '_')}`,
        source: 'provided_unverified'
      });
    }
    
    // Create a new tenant for the user if no existing tenant was found
    try {
      logger.info('[verify-tenant] Creating new tenant for user on backend');
      
      // Generate a UUID for the new tenant (will be replaced by backend)
      const tempTenantId = uuidv4();
      
      try {
        // Call backend API to create a new tenant
        const createResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/${tempTenantId}`, {
          // Any additional tenant data can go here
        }, {
          headers: {
            ...authHeaders,
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (createResponse.data && createResponse.data.success) {
          const newTenantId = createResponse.data.data.id;
          // Generate schema name from tenant ID instead of relying on backend
          const schemaName = `tenant_${newTenantId.replace(/-/g, '_')}`;
          
          logger.info('[verify-tenant] Successfully created new tenant on backend:', {
            tenantId: newTenantId,
            schemaName
          });
          
          // Store the new tenant ID in a cookie
          const cookieStore = await cookies();
          await cookieStore.set('tenantId', newTenantId, { 
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          // Store the mapping for future reference in the backend
          if (email) {
            try {
              // Make an API call to associate the email with the tenant
              await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/associate-email`, {
                email,
                tenantId: newTenantId
              }, {
                headers: {
                  ...authHeaders,
                  Authorization: `Bearer ${accessToken}`
                }
              });
              
              logger.debug('[verify-tenant] Associated email with new tenant ID in backend:', { 
                email, 
                tenantId: newTenantId
              });
            } catch (e) {
              logger.error('[verify-tenant] Error associating email with new tenant in backend:', { error: e.message });
            }
          }
          
          return NextResponse.json({
            success: true,
            message: 'Created new tenant for user',
            tenantId: newTenantId,
            schemaName,
            source: 'created'
          });
        } else {
          logger.error('[verify-tenant] Failed to create new tenant:', createResponse.data);
          
          // Provide a fallback tenant ID
          const fallbackTenantId = providedTenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
          
          // Store the fallback tenant ID in a cookie
          const cookieStore = await cookies();
          await cookieStore.set('tenantId', fallbackTenantId, { 
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict'
          });
          
          // Return success with fallback ID instead of error
          return NextResponse.json({
            success: true,
            message: 'Failed to create new tenant, using fallback',
            tenantId: fallbackTenantId,
            schemaName: `tenant_${fallbackTenantId.replace(/-/g, '_')}`,
            fallback: true,
            source: 'creation_fallback'
          });
        }
      } catch (tenantCreateError) {
        logger.error('[verify-tenant] Error creating new tenant:', { 
          error: tenantCreateError.message,
          status: tenantCreateError.response?.status,
          data: tenantCreateError.response?.data
        });
        
        // Provide a fallback tenant ID
        const fallbackTenantId = providedTenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
        
        // Store the fallback tenant ID in a cookie
        const cookieStore = await cookies();
        await cookieStore.set('tenantId', fallbackTenantId, { 
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'strict'
        });
        
        // Return success with fallback ID instead of error
        return NextResponse.json({
          success: true,
          message: 'Error creating tenant, using fallback',
          tenantId: fallbackTenantId,
          schemaName: `tenant_${fallbackTenantId.replace(/-/g, '_')}`,
          fallback: true,
          source: 'error_fallback'
        });
      }
    } catch (error) {
      logger.error('[verify-tenant] Unhandled error in tenant creation:', { 
        error: error.message,
        stack: error.stack
      });
      
      // Provide a fallback tenant ID
      const fallbackTenantId = providedTenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
      
      // Store the fallback tenant ID in a cookie
      try {
        const cookieStore = await cookies();
        await cookieStore.set('tenantId', fallbackTenantId, { 
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'strict'
        });
      } catch (cookieError) {
        logger.error('[verify-tenant] Error setting cookie for fallback tenant:', cookieError.message);
      }
      
      // Return success with fallback ID instead of error
      return NextResponse.json({
        success: true,
        message: 'Using fallback tenant due to unhandled error',
        tenantId: fallbackTenantId,
        schemaName: `tenant_${fallbackTenantId.replace(/-/g, '_')}`,
        fallback: true,
        source: 'unhandled_error_fallback'
      });
    }
  } catch (error) {
    logger.error('[verify-tenant] Unhandled error in verify-tenant route:', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Provide a fallback tenant ID even in case of catastrophic error
    const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    // Try to set cookie but don't fail if it doesn't work
    try {
      const cookieStore = await cookies();
      await cookieStore.set('tenantId', fallbackTenantId, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
    } catch (err) {
      logger.error('[verify-tenant] Error setting fallback cookie:', err.message);
    }
    
    // Return success with fallback ID instead of error
    return NextResponse.json({
      success: true,
      message: 'Catastrophic error in verify-tenant, using emergency fallback',
      tenantId: fallbackTenantId,
      schemaName: `tenant_${fallbackTenantId.replace(/-/g, '_')}`,
      fallback: true,
      emergency: true,
      source: 'catastrophic_error'
    });
  }
} 