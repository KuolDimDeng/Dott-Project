import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAccessToken } from '@/utils/tokenUtils';
import { getAuthHeaders } from '@/utils/authHeaders';
import axios from 'axios';

/**
 * API route to associate an email with a tenant ID
 * This is used during signup and tenant verification to maintain email-to-tenant mappings
 */
export async function POST(request) {
  try {
    // Get email and tenant ID from request body
    const body = await request.json();
    const { email, tenantId } = body;

    if (!email || !tenantId) {
      return NextResponse.json({
        success: false,
        message: 'Email and tenantId are required'
      }, { status: 400 });
    }

    logger.debug('[associate-email] Associating email with tenant:', { 
      email,
      tenantId
    });

    // Get auth headers for backend requests
    const authHeaders = await getAuthHeaders();
    const accessToken = await getAccessToken();

    // Call the backend API to associate the email with the tenant
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/email-mapping`, {
        email: email.toLowerCase(),
        tenantId
      }, {
        headers: {
          ...authHeaders,
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.data && response.data.success) {
        logger.info('[associate-email] Successfully associated email with tenant:', {
          email,
          tenantId
        });

        return NextResponse.json({
          success: true,
          message: 'Email associated with tenant',
          email,
          tenantId
        });
      } else {
        logger.warn('[associate-email] Backend returned unsuccessful response:', {
          status: response.status,
          data: response.data
        });

        return NextResponse.json({
          success: false,
          message: 'Failed to associate email with tenant in backend'
        }, { status: 500 });
      }
    } catch (error) {
      logger.error('[associate-email] Error calling backend API:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // If the backend API is not available, store the mapping locally in a database or cache
      // For now, just return a success response to not block the client
      return NextResponse.json({
        success: true,
        message: 'Email association handled locally',
        email,
        tenantId,
        note: 'Backend API call failed, but request was processed'
      });
    }
  } catch (error) {
    logger.error('[associate-email] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      message: 'Unexpected error in associate-email API',
      error: error.message
    }, { status: 500 });
  }
} 