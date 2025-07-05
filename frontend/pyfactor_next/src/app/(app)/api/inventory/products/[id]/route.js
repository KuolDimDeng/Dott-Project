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
    
    // Extract tenant info from request
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { error: 'Tenant ID is required' }, 
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Updating product ${id} for tenant: ${finalTenantId}`);
    
    // Import the RLS database utility
    const db = await import('@/utils/db/rls-database');
    
    // Update using tenant context for RLS
    const result = await db.transaction(async (client) => {
      // Update the product with tenant ID context for RLS
      const updateQuery = `
        UPDATE public.inventory_product 
        SET 
          name = $1,
          description = $2,
          sku = $3,
          price = $4,
          cost = $5,
          stock_quantity = $6,
          reorder_level = $7,
          for_sale = $8,
          for_rent = $9,
          supplier_id = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `;
      
      const params = [
        productData.name,
        productData.description || '',
        productData.sku || '',
        parseFloat(productData.price) || 0,
        parseFloat(productData.cost) || 0,
        parseInt(productData.stock_quantity) || 0,
        parseInt(productData.reorder_level) || 0,
        productData.for_sale === true,
        productData.for_rent === true,
        productData.supplier_id || null,
        id
      ];
      
      logger.debug(`[${requestId}] Executing product update with tenant context: ${finalTenantId}`);
      
      const result = await client.query(updateQuery, params);
      return result;
    }, {
      debug: true,
      requestId,
      tenantId: finalTenantId // Set the tenant context for RLS
    });
    
    if (result.rowCount === 0) {
      logger.warn(`[${requestId}] Product ${id} not found or not owned by tenant ${finalTenantId}`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    logger.info(`[${requestId}] Product ${id} updated successfully for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      success: true,
      product: result.rows[0],
      message: 'Product updated successfully'
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Error updating product ${id}: ${error.message}`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to update product',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    // Extract tenant info from request
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Deleting product ${id} for tenant: ${finalTenantId}`);
    
    // Import the RLS database utility
    const db = await import('@/utils/db/rls-database');
    
    // Delete using tenant context for RLS
    const result = await db.transaction(async (client) => {
      // Delete the product with tenant ID context for RLS
      const deleteQuery = `
        DELETE FROM public.inventory_product 
        WHERE id = $1
        RETURNING id
      `;
      
      const result = await client.query(deleteQuery, [id]);
      return result;
    }, {
      debug: true,
      requestId,
      tenantId: finalTenantId // Set the tenant context for RLS
    });
    
    if (result.rowCount === 0) {
      logger.warn(`[${requestId}] Product ${id} not found or not owned by tenant ${finalTenantId}`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    logger.info(`[${requestId}] Product ${id} deleted successfully for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Error deleting product ${id}: ${error.message}`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 