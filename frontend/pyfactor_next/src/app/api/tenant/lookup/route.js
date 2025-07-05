import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { serverAxiosInstance } from '@/lib/axios/serverConfig';
import { getAuthHeaders } from '@/utils/serverAuth';

/**
 * API endpoint to look up a tenant by email
 * This is used to ensure each user has only one tenant
 */
export async function GET(request) {
  try {
    // Extract email from URL
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      logger.warn('[TenantLookup] No email provided');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    logger.info(`[TenantLookup] Looking up tenant for email: ${email}`);
    
    // Get auth headers for backend request
    let authHeaders;
    try {
      authHeaders = await getAuthHeaders();
    } catch (error) {
      logger.warn('[TenantLookup] Failed to get auth headers:', error);
      // Continue without auth headers - API endpoint allows anonymous access
    }
    
    // Make request to backend API
    try {
      const response = await serverAxiosInstance.get(
        `/api/tenant/by-email/${encodeURIComponent(email)}`,
        { headers: authHeaders || {} }
      );
      
      if (response.data) {
        logger.info(`[TenantLookup] Found tenant for email ${email}:`, {
          tenantId: response.data.tenantId
        });
        
        return NextResponse.json({
          tenantId: response.data.tenantId,
          schemaName: response.data.schemaName,
          name: response.data.name,
          isActive: response.data.isActive,
          source: 'email_lookup'
        });
      }
    } catch (error) {
      // If it's a 404, it just means no tenant was found for this email
      if (error.response?.status === 404) {
        logger.info(`[TenantLookup] No tenant found for email: ${email}`);
        return NextResponse.json(
          { message: 'No tenant found for this email' },
          { status: 404 }
        );
      }
      
      // Log other errors but don't fail
      logger.error(`[TenantLookup] Error looking up tenant for email ${email}:`, {
        error: error.message,
        status: error.response?.status
      });
    }
    
    // Return empty response if no tenant found or error occurred
    return NextResponse.json({ message: 'No tenant found' });
  } catch (error) {
    logger.error('[TenantLookup] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 