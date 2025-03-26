import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTokens } from '@/utils/apiUtils';

/**
 * GET handler for fetching products
 * @param {Request} request 
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  logger.info('[API] Product GET request received');
  try {
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error('[API] Product GET failed - Missing authentication tokens');
      return NextResponse.json({
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug('[API] Product GET processing with tenantId:', tenantId);
    
    // Forward the request to the backend API
    const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info('[API] Product GET successful, returned', response.data?.length || 0, 'products');
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('[API] Product GET error:', error.message);
    
    // Handle specific authentication errors
    if (error.message?.includes('No valid session') || 
        error.message?.includes('Authentication required')) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    if (error.response) {
      logger.error('[API] Product GET backend response:', {
        status: error.response.status,
        data: error.response.data
      });
      return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

/**
 * POST handler for creating a new product
 * @param {Request} request 
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  logger.info('[API] Product POST request received');
  try {
    // Get request body
    const productData = await request.json();
    logger.debug('[API] Product POST data:', productData);
    
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error('[API] Product POST failed - Missing authentication tokens');
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug('[API] Product POST processing with tenantId:', tenantId);
    
    // Forward the request to the backend API
    const response = await axiosInstance.post(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/`, productData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info('[API] Product POST successful, created product with ID:', response.data?.id);
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('[API] Product POST error:', error.message);
    
    // Handle specific authentication errors
    if (error.message?.includes('No valid session') || 
        error.message?.includes('Authentication required')) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    if (error.response) {
      logger.error('[API] Product POST backend response:', {
        status: error.response.status,
        data: error.response.data
      });
      return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
