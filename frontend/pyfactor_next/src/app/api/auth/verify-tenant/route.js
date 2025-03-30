import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
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
    // Get tenant ID and user info from request body
    const body = await request.json();
    const { tenantId, userId, email } = body;

    logger.debug('[verify-tenant] Verifying tenant:', { 
      tenantId, 
      userId,
      email,
      hasEmail: !!email
    });

    // Get auth headers for backend requests
    const authHeaders = await getAuthHeaders();
    const accessToken = await getAccessToken();
    
    // If we don't have an access token, return an error
    if (!accessToken) {
      logger.error('[verify-tenant] No access token available');
      return NextResponse.json({
        success: false,
        message: 'Authentication required',
        error: 'No access token available'
      }, { status: 401 });
    }

    // First check if a tenant already exists for this user on the backend
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/current`, {
        headers: {
          ...authHeaders,
          Authorization: `Bearer ${accessToken}`
        }
      });

      // If user already has a tenant, use it
      if (response.data && response.data.id) {
        const existingTenantId = response.data.id;
        logger.info('[verify-tenant] Found existing tenant for user:', { 
          userId, 
          tenantId: existingTenantId
        });
      
        // Store the tenant ID in a cookie for future server-side access
        const cookieStore = cookies();
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
          schemaName: response.data.schema_name || `tenant_${existingTenantId.replace(/-/g, '_')}`,
          source: 'user_lookup'
        });
      }
    } catch (error) {
      // If the API returns 404, it means no tenant exists for this user
      if (error.response && error.response.status !== 404) {
        logger.error('[verify-tenant] Error checking for existing tenant:', { 
          error: error.message,
          status: error.response?.status
        });
      } else {
        logger.info('[verify-tenant] No existing tenant found for user');
      }
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
      const cookieStore = cookies();
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
    if (tenantId) {
      logger.info('[verify-tenant] Using provided tenant ID:', { tenantId });
      
      // Verify this tenant exists and isn't assigned to another user
      try {
        const tenantCheckResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/exists`, {
          tenantId
        }, {
          headers: {
            ...authHeaders,
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        // If the tenant exists but belongs to another user
        if (tenantCheckResponse.data.exists && tenantCheckResponse.data.correctTenantId) {
          const correctTenantId = tenantCheckResponse.data.correctTenantId;
          
          logger.warn('[verify-tenant] Tenant belongs to another user, using correct tenant ID:', { 
            providedTenantId: tenantId,
            correctTenantId
          });
          
          // Store the correct tenant ID in a cookie
          const cookieStore = cookies();
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
      } catch (e) {
        logger.error('[verify-tenant] Error checking tenant existence:', { error: e.message });
      }
      
      // Store the mapping for future reference in the backend
      if (email) {
        try {
          // Make an API call to associate the email with the tenant
          await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/associate-email`, {
            email,
            tenantId
          }, {
            headers: {
              ...authHeaders,
              Authorization: `Bearer ${accessToken}`
            }
          });
          
          logger.debug('[verify-tenant] Associated email with tenant ID in backend:', { 
            email, 
            tenantId
          });
        } catch (e) {
          logger.error('[verify-tenant] Error associating email with tenant in backend:', { error: e.message });
        }
      }
      
      // Store the tenant ID in a cookie
      const cookieStore = cookies();
      await cookieStore.set('tenantId', tenantId, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Tenant verified',
        tenantId: tenantId,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
        source: 'provided'
      });
    }
    
    // Create a new tenant for the user if no existing tenant was found
    try {
      logger.info('[verify-tenant] Creating new tenant for user on backend');
      
      // Generate a UUID for the new tenant (will be replaced by backend)
      const tempTenantId = uuidv4();
      
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
        const schemaName = createResponse.data.data.schema_name;
        
        logger.info('[verify-tenant] Successfully created new tenant on backend:', {
          tenantId: newTenantId,
          schemaName
        });
        
        // Store the new tenant ID in a cookie
        const cookieStore = cookies();
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
        
        return NextResponse.json({
          success: false,
          message: 'Failed to create new tenant',
          error: createResponse.data
        }, { status: 500 });
      }
    } catch (error) {
      logger.error('[verify-tenant] Error creating new tenant:', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return NextResponse.json({
        success: false,
        message: 'Error creating new tenant',
        error: error.message
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('[verify-tenant] Unhandled error in verify-tenant route:', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json({
      success: false,
      message: 'Unhandled error in verify-tenant route',
      error: error.message
    }, { status: 500 });
  }
} 