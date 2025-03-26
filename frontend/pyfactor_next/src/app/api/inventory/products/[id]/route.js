import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTokens } from '@/utils/apiUtils';

/**
 * GET handler for fetching a specific product by ID
 * @param {Request} request 
 * @param {Object} params - Contains the route parameters
 * @returns {Promise<NextResponse>}
 */
export async function GET(request, { params }) {
  const { id } = params;
  logger.info(`[API] Product GET by ID request received for ID: ${id}`);
  
  try {
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product GET by ID failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product GET by ID processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API
    const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info(`[API] Product GET by ID successful for ID: ${id}`);
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error(`[API] Product GET by ID error for ID: ${id}:`, error.message);
    if (error.response) {
      logger.error(`[API] Product GET by ID backend response for ID: ${id}:`, {
        status: error.response.status,
        data: error.response.data
      });
      return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json({ error: `Failed to fetch product with ID: ${id}` }, { status: 500 });
  }
}

/**
 * PATCH handler for updating a specific product by ID
 * @param {Request} request 
 * @param {Object} params - Contains the route parameters
 * @returns {Promise<NextResponse>}
 */
export async function PATCH(request, { params }) {
  const { id } = params;
  logger.info(`[API] Product PATCH request received for ID: ${id}`);
  
  try {
    // Get request body
    const productData = await request.json();
    logger.debug(`[API] Product PATCH data for ID: ${id}:`, productData);
    
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product PATCH failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product PATCH processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API
    const response = await axiosInstance.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`, 
      productData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-Tenant-ID': tenantId
        }
      }
    );
    
    logger.info(`[API] Product PATCH successful for ID: ${id}`);
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error(`[API] Product PATCH error for ID: ${id}:`, error.message);
    if (error.response) {
      logger.error(`[API] Product PATCH backend response for ID: ${id}:`, {
        status: error.response.status,
        data: error.response.data
      });
      return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json({ error: `Failed to update product with ID: ${id}` }, { status: 500 });
  }
}

/**
 * DELETE handler for removing a specific product by ID
 * @param {Request} request 
 * @param {Object} params - Contains the route parameters
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  logger.info(`[API] Product DELETE request received for ID: ${id}`);
  
  try {
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product DELETE failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product DELETE processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API
    await axiosInstance.delete(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info(`[API] Product DELETE successful for ID: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`[API] Product DELETE error for ID: ${id}:`, error.message);
    if (error.response) {
      logger.error(`[API] Product DELETE backend response for ID: ${id}:`, {
        status: error.response.status,
        data: error.response.data
      });
      return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json({ error: `Failed to delete product with ID: ${id}` }, { status: 500 });
  }
} 