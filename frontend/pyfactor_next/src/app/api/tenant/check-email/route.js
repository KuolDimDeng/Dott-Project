import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAccessToken } from '@/utils/tokenUtils';
import { getAuthHeaders } from '@/utils/authHeaders';
import axios from 'axios';

/**
 * API route to check if an email is associated with a tenant
 * This is used during signup and tenant verification to prevent duplicate tenants
 */
export async function POST(request) {
  try {
    // Get email from request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 });
    }

    logger.debug('[check-email] Checking if email has an associated tenant:', { 
      email
    });

    // Get auth headers for backend requests
    const authHeaders = await getAuthHeaders();
    const accessToken = await getAccessToken();

    // Call the backend API to check if the email is associated with a tenant
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tenant/check-email-mapping`, {
        email: email.toLowerCase()
      }, {
        headers: {
          ...authHeaders,
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.data && response.data.tenantId) {
        logger.info('[check-email] Email is associated with tenant:', {
          email,
          tenantId: response.data.tenantId
        });

        return NextResponse.json({
          success: true,
          message: 'Email is associated with tenant',
          tenantId: response.data.tenantId,
          exists: true
        });
      } else {
        logger.info('[check-email] Email is not associated with any tenant:', {
          email
        });

        return NextResponse.json({
          success: true,
          message: 'Email is not associated with any tenant',
          exists: false
        });
      }
    } catch (error) {
      logger.error('[check-email] Error calling backend API:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // Return a failure response but don't block the client
      return NextResponse.json({
        success: false,
        message: 'Failed to check email association',
        exists: false,
        error: error.message
      });
    }
  } catch (error) {
    logger.error('[check-email] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      message: 'Unexpected error in check-email API',
      error: error.message
    }, { status: 500 });
  }
} 