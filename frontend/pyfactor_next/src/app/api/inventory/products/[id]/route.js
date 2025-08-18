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
    // Get session cookie for authentication
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      logger.error(`[API] Product PATCH failed - No session cookie found for ID: ${id}`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const productData = await request.json();
    logger.debug(`[API] Product PATCH data for ID: ${id}:`, productData);
    
    // Forward the request to backend with session authentication
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/inventory/products/${id}/`;
    logger.info(`[API] Forwarding PATCH to backend: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });
    
    const responseData = await response.text();
    logger.info(`[API] Backend PATCH response status: ${response.status}`);
    
    if (!response.ok) {
      logger.error(`[API] Backend PATCH failed:`, responseData);
      return NextResponse.json(
        { error: 'Failed to update product', details: responseData },
        { status: response.status }
      );
    }
    
    // Try to parse as JSON, but handle empty or non-JSON responses
    let parsedData;
    try {
      parsedData = responseData ? JSON.parse(responseData) : { success: true, is_active: productData.is_active };
    } catch (parseError) {
      logger.warn(`[API] Response is not JSON, returning success with request data`);
      // If backend doesn't return JSON, return the data we sent
      parsedData = { ...productData, id, success: true };
    }
    
    logger.info(`[API] Product PATCH successful for ID: ${id}`);
    return NextResponse.json(parsedData);
    
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
    
    // Get session cookie for authentication
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      logger.error(`[${requestId}] Missing session cookie`);
      return NextResponse.json(
        { error: 'No session found' }, 
        { status: 401 }
      );
    }
    
    logger.info(`[${requestId}] Updating product ${id} with session`);
    
    // Forward the request to the backend API with session auth
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(productData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error(`[${requestId}] Backend error: ${response.status} - ${data.detail || data.error}`);
      return NextResponse.json(
        {
          error: data.detail || data.error || 'Failed to update product',
          message: data.message || `Failed to update product`
        },
        { status: response.status }
      );
    }
    
    logger.info(`[${requestId}] Product ${id} updated successfully`);
    
    return NextResponse.json(data);
    
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
  
  console.log('🔴 [API DELETE] === START DELETE REQUEST ===');
  console.log(`🔴 [API DELETE] Request ID: ${requestId}`);
  console.log(`🔴 [API DELETE] Product ID: ${id}`);
  
  logger.info(`[${requestId}] DELETE /api/inventory/products/${id} - Start processing request`);
  
  try {
    console.log('🔴 [API DELETE] Step 1: Getting session cookie...');
    // Get session cookie for authentication
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    console.log('🔴 [API DELETE] Step 2: Session check:', {
      hasSession: !!sidCookie?.value,
      sessionLength: sidCookie?.value ? sidCookie.value.length : 0
    });
    
    if (!sidCookie?.value) {
      console.error('🔴 [API DELETE] ❌ Missing session cookie');
      logger.error(`[${requestId}] Missing session cookie`);
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Construct backend URL
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/inventory/products/${id}/`;
    console.log(`🔴 [API DELETE] Step 3: Backend URL: ${backendUrl}`);
    
    logger.info(`[${requestId}] Deleting product ${id} with session`);
    
    console.log('🔴 [API DELETE] Step 4: Sending DELETE to backend...');
    console.log('🔴 [API DELETE] Headers being sent:', {
      Authorization: `Session ${sidCookie.value.substring(0, 20)}...`
    });
    
    // Forward the request to the backend API with session auth
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      }
    });
    
    console.log('🔴 [API DELETE] Step 5: Backend response received');
    console.log('🔴 [API DELETE] Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔴 [API DELETE] Backend error:', errorData);
      logger.error(`[${requestId}] Backend error: ${response.status} - ${errorData.detail || errorData.error}`);
      
      return NextResponse.json(
        {
          error: errorData.detail || errorData.error || 'Failed to delete product',
          message: errorData.message || `Failed to delete product`
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('🔴 [API DELETE] Response data:', data);
    
    logger.info(`[${requestId}] Product ${id} deleted successfully`);
    
    console.log('🔴 [API DELETE] ✅ Successfully deleted product');
    console.log('🔴 [API DELETE] === END DELETE REQUEST (SUCCESS) ===');
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      productId: id
    });
    
  } catch (error) {
    console.error('🔴 [API DELETE] ❌ Error occurred:', error);
    console.error('🔴 [API DELETE] Error type:', error.constructor.name);
    console.error('🔴 [API DELETE] Error message:', error.message);
    
    if (error.response) {
      console.error('🔴 [API DELETE] Backend error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    if (error.config) {
      console.error('🔴 [API DELETE] Request config:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      });
    }
    
    logger.error(`[${requestId}] Error deleting product ${id}: ${error.message}`, error);
    
    // Handle specific error responses from backend
    if (error.response) {
      const errorMessage = error.response.data?.error || 
                          error.response.data?.detail || 
                          error.response.data?.message || 
                          'Failed to delete product';
      
      console.error(`🔴 [API DELETE] Returning error: ${errorMessage}`);
      console.error('🔴 [API DELETE] === END DELETE REQUEST (ERROR) ===');
      
      return NextResponse.json(
        {
          error: errorMessage,
          message: error.response.data?.message || error.message,
          details: error.response.data
        },
        { status: error.response.status }
      );
    }
    
    console.error('🔴 [API DELETE] Returning generic error');
    console.error('🔴 [API DELETE] === END DELETE REQUEST (ERROR) ===');
    
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        message: error.message
      },
      { status: 500 }
    );
  }
} 