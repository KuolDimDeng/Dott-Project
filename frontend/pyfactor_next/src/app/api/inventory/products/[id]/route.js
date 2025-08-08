import { NextResponse } from 'next/server';
import { serverAxiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTokens } from '@/utils/apiUtils';
import { extractTenantId } from '@/utils/auth/tenant';

// Mock product database for development
const mockProducts = {
  '1': {
    id: '1',
    name: 'Demo Product 1',
    description: 'This is a demo product for development',
    price: 19.99,
    stock_quantity: 100,
    reorder_level: 10,
    product_code: 'DEMO-001',
    is_for_sale: true,
    is_for_rent: false,
    salestax: 5,
    height: 10,
    width: 20,
    height_unit: 'cm',
    width_unit: 'cm',
    weight: 0.5,
    weight_unit: 'kg',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  '2': {
    id: '2',
    name: 'Demo Product 2',
    description: 'Another test product for development',
    price: 29.99,
    stock_quantity: 50,
    reorder_level: 5,
    product_code: 'DEMO-002',
    is_for_sale: true,
    is_for_rent: true,
    salestax: 5,
    height: 15,
    width: 25,
    height_unit: 'cm',
    width_unit: 'cm',
    weight: 1.2,
    weight_unit: 'kg',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  },
  '3': {
    id: '3',
    name: 'Demo Product 3',
    description: 'Third test product for development',
    price: 39.99,
    stock_quantity: 25,
    reorder_level: 5,
    product_code: 'DEMO-003',
    is_for_sale: true,
    is_for_rent: false,
    salestax: 5,
    height: 30,
    width: 40,
    height_unit: 'cm',
    width_unit: 'cm',
    weight: 2.0,
    weight_unit: 'kg',
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z'
  }
};

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
    // DEVELOPMENT MODE: Return mock data
    if (mockProducts[id]) {
      logger.info(`[API] DEVELOPMENT MODE: Returning mock product data for ID: ${id}`);
      return NextResponse.json(mockProducts[id]);
    } else {
      logger.error(`[API] DEVELOPMENT MODE: Product with ID ${id} not found`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // COMMENTED OUT FOR DEVELOPMENT - RESTORE IN PRODUCTION
    /*
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product GET by ID failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product GET by ID processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API using serverAxiosInstance
    const response = await serverAxiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info(`[API] Product GET by ID successful for ID: ${id}`);
    return NextResponse.json(response.data);
    */
  } catch (error) {
    logger.error(`[API] Product GET by ID error for ID: ${id}:`, error.message);
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
    
    // DEVELOPMENT MODE: Update mock data
    if (mockProducts[id]) {
      mockProducts[id] = {
        ...mockProducts[id],
        ...productData,
        updated_at: new Date().toISOString()
      };
      logger.info(`[API] DEVELOPMENT MODE: Updated mock product data for ID: ${id}`);
      return NextResponse.json(mockProducts[id]);
    } else {
      logger.error(`[API] DEVELOPMENT MODE: Product with ID ${id} not found`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // COMMENTED OUT FOR DEVELOPMENT - RESTORE IN PRODUCTION
    /*
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product PATCH failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product PATCH processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API using serverAxiosInstance
    const response = await serverAxiosInstance.patch(
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
    */
  } catch (error) {
    logger.error(`[API] Product PATCH error for ID: ${id}:`, error.message);
    return NextResponse.json({ error: `Failed to update product with ID: ${id}` }, { status: 500 });
  }
}

/**
 * PUT handler for updating a specific product by ID
 * @param {Request} request 
 * @param {Object} params - Contains the route parameters
 * @returns {Promise<NextResponse>}
 */
export async function PUT(request, { params }) {
  const { id } = params;
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  logger.info(`[${requestId}] PUT /api/inventory/products/${id} - Start processing request`);
  
  try {
    // Get request body
    const productData = await request.json();
    logger.debug(`[${requestId}] Product PUT data for ID: ${id}:`, productData);
    
    // Get authentication tokens - use the proper approach
    const { accessToken, idToken, tenantId } = await getTokens(request);
    
    if (!accessToken || !tenantId) {
      logger.error(`[${requestId}] Missing authentication tokens`);
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    logger.info(`[${requestId}] Updating product ${id} for tenant: ${tenantId}`);
    
    // Forward the request to the backend API
    const response = await serverAxiosInstance.put(
      `${process.env.NEXT_PUBLIC_API_URL}/products/products/${id}/`,
      productData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Id-Token': idToken || '',
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info(`[${requestId}] Product ${id} updated successfully`);
    
    return NextResponse.json(response.data);
    
  } catch (error) {
    logger.error(`[${requestId}] Error updating product ${id}: ${error.message}`, error);
    
    // Handle specific error responses from backend
    if (error.response) {
      return NextResponse.json(
        {
          error: error.response.data?.error || 'Failed to update product',
          message: error.response.data?.message || error.message
        },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to update product',
        message: error.message
      }, 
      { status: 500 }
    );
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
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  logger.info(`[${requestId}] DELETE /api/inventory/products/${id} - Start processing request`);
  
  try {
    // Get authentication tokens - use the proper approach
    const { accessToken, idToken, tenantId } = await getTokens(request);
    
    if (!accessToken || !tenantId) {
      logger.error(`[${requestId}] Missing authentication tokens`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    logger.info(`[${requestId}] Deleting product ${id} for tenant: ${tenantId}`);
    
    // Forward the request to the backend API
    const response = await serverAxiosInstance.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/products/products/${id}/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Id-Token': idToken || '',
          'X-Tenant-ID': tenantId
        }
      }
    );
    
    logger.info(`[${requestId}] Product ${id} deleted successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Error deleting product ${id}: ${error.message}`, error);
    
    // Handle specific error responses from backend
    if (error.response) {
      return NextResponse.json(
        {
          error: error.response.data?.error || 'Failed to delete product',
          message: error.response.data?.message || error.message
        },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        message: error.message
      },
      { status: 500 }
    );
  }
} 