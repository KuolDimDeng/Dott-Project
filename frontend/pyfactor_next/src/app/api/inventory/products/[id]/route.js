import { NextResponse } from 'next/server';
import { serverAxiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTokens } from '@/utils/apiUtils';

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
 * DELETE handler for removing a specific product by ID
 * @param {Request} request 
 * @param {Object} params - Contains the route parameters
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  logger.info(`[API] Product DELETE request received for ID: ${id}`);
  
  try {
    // DEVELOPMENT MODE: Delete from mock data
    if (mockProducts[id]) {
      delete mockProducts[id];
      logger.info(`[API] DEVELOPMENT MODE: Deleted mock product with ID: ${id}`);
      return NextResponse.json({ success: true });
    } else {
      logger.error(`[API] DEVELOPMENT MODE: Product with ID ${id} not found`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // COMMENTED OUT FOR DEVELOPMENT - RESTORE IN PRODUCTION
    /*
    // Get authentication tokens
    const { accessToken, idToken, tenantId } = await getTokens(request);
    if (!accessToken || !idToken) {
      logger.error(`[API] Product DELETE failed - Missing authentication tokens for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Log the request with tenant context
    logger.debug(`[API] Product DELETE processing for ID: ${id}, tenantId: ${tenantId}`);
    
    // Forward the request to the backend API using serverAxiosInstance
    await serverAxiosInstance.delete(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId
      }
    });
    
    logger.info(`[API] Product DELETE successful for ID: ${id}`);
    return NextResponse.json({ success: true });
    */
  } catch (error) {
    logger.error(`[API] Product DELETE error for ID: ${id}:`, error.message);
    return NextResponse.json({ error: `Failed to delete product with ID: ${id}` }, { status: 500 });
  }
} 