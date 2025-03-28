import { NextResponse } from 'next/server';
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
    // DEVELOPMENT MODE: Return mock data to bypass subscription requirements
    // In production, remove this condition and always make the actual API call
    
    // Mock data for development
    const mockProducts = [
      {
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
        weight_unit: 'kg'
      },
      {
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
        weight_unit: 'kg'
      },
      {
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
        weight_unit: 'kg'
      }
    ];
    
    logger.info('[API] DEVELOPMENT MODE: Returning mock product data');
    return NextResponse.json(mockProducts);
    
    // COMMENTED OUT FOR DEVELOPMENT - RESTORE IN PRODUCTION
    /*
    // Extract all cookies from request for debugging
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = {};
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name.toLowerCase().includes('token')) {
          cookies[name] = 'present';
        } else {
          cookies[name] = value;
        }
      });
      logger.debug('[API] Request cookies:', cookies);
    }
    
    // Attempt to get tokens from request
    const { accessToken, idToken, tenantId } = await getTokens(request);
    
    // Direct extraction from cookie header as fallback
    let finalAccessToken = accessToken;
    let finalIdToken = idToken;
    let finalTenantId = tenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    if (!finalAccessToken || !finalIdToken) {
      logger.debug('[API] Tokens not found via standard methods, attempting direct extraction');
      
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (!name || !value) return;
          
          const lowerName = name.toLowerCase();
          if ((lowerName.includes('access') || lowerName.includes('auth')) && !finalAccessToken) {
            finalAccessToken = value;
            logger.debug('[API] Directly extracted access token from cookies');
          } else if (lowerName.includes('id') && lowerName.includes('token') && !finalIdToken) {
            finalIdToken = value;
            logger.debug('[API] Directly extracted ID token from cookies');
          } else if ((lowerName.includes('tenant') || lowerName.includes('business')) && !finalTenantId) {
            finalTenantId = value;
            logger.debug('[API] Directly extracted tenant ID from cookies');
          }
        });
      }
    }
    
    // If still no tokens, check for direct headers
    if (!finalAccessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        finalAccessToken = authHeader.replace('Bearer ', '');
        logger.debug('[API] Extracted access token from Authorization header');
      }
    }
    
    if (!finalIdToken) {
      finalIdToken = request.headers.get('x-id-token');
      if (finalIdToken) {
        logger.debug('[API] Extracted ID token from X-Id-Token header');
      }
    }
    
    if (!finalTenantId) {
      finalTenantId = request.headers.get('x-tenant-id');
      if (finalTenantId) {
        logger.debug('[API] Extracted tenant ID from X-Tenant-ID header');
      }
    }
    
    // Log the results of our extraction attempts
    logger.debug('[API] Final token status:', {
      hasAccessToken: !!finalAccessToken,
      hasIdToken: !!finalIdToken,
      hasTenantId: !!finalTenantId,
      tenantId: finalTenantId
    });
    
    // If we still don't have tokens, return error
    if (!finalAccessToken || !finalIdToken) {
      logger.error('[API] Failed to extract required tokens after all attempts');
      return NextResponse.json({
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    // Use direct fetch instead of axiosInstance to bypass interceptors
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/inventory/products/`;
    logger.debug(`[API] Making direct fetch request to ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalAccessToken}`,
        'X-Id-Token': finalIdToken,
        'X-Tenant-ID': finalTenantId,
        'X-Schema-Name': `tenant_${finalTenantId.replace(/-/g, '_')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[API] Backend API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      return NextResponse.json(errorData || {
        error: 'Backend API error',
        message: response.statusText
      }, { status: response.status });
    }
    
    const data = await response.json();
    logger.info(`[API] Product GET successful, returned ${data?.length || 0} products`);
    return NextResponse.json(data);
    */
  } catch (error) {
    logger.error('[API] Product GET error:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      message: error.message 
    }, { status: 500 });
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
    
    // DEVELOPMENT MODE: Create a mock response with the submitted data
    const mockCreatedProduct = {
      id: Math.floor(Math.random() * 1000).toString(), // Generate random ID
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_code: `PROD-${Math.floor(Math.random() * 10000)}`
    };
    
    logger.info('[API] DEVELOPMENT MODE: Returning mock created product');
    return NextResponse.json(mockCreatedProduct, { status: 201 });
    
    // COMMENTED OUT FOR DEVELOPMENT - RESTORE IN PRODUCTION
    /*
    // Extract all cookies from request for debugging
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = {};
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name.toLowerCase().includes('token')) {
          cookies[name] = 'present';
        } else {
          cookies[name] = value;
        }
      });
      logger.debug('[API] Request cookies:', cookies);
    }
    
    // Attempt to get tokens from request
    const { accessToken, idToken, tenantId } = await getTokens(request);
    
    // Direct extraction from cookie header as fallback
    let finalAccessToken = accessToken;
    let finalIdToken = idToken;
    let finalTenantId = tenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    if (!finalAccessToken || !finalIdToken) {
      logger.debug('[API] Tokens not found via standard methods, attempting direct extraction');
      
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (!name || !value) return;
          
          const lowerName = name.toLowerCase();
          if ((lowerName.includes('access') || lowerName.includes('auth')) && !finalAccessToken) {
            finalAccessToken = value;
            logger.debug('[API] Directly extracted access token from cookies');
          } else if (lowerName.includes('id') && lowerName.includes('token') && !finalIdToken) {
            finalIdToken = value;
            logger.debug('[API] Directly extracted ID token from cookies');
          } else if ((lowerName.includes('tenant') || lowerName.includes('business')) && !finalTenantId) {
            finalTenantId = value;
            logger.debug('[API] Directly extracted tenant ID from cookies');
          }
        });
      }
    }
    
    // If still no tokens, check for direct headers
    if (!finalAccessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        finalAccessToken = authHeader.replace('Bearer ', '');
        logger.debug('[API] Extracted access token from Authorization header');
      }
    }
    
    if (!finalIdToken) {
      finalIdToken = request.headers.get('x-id-token');
      if (finalIdToken) {
        logger.debug('[API] Extracted ID token from X-Id-Token header');
      }
    }
    
    if (!finalTenantId) {
      finalTenantId = request.headers.get('x-tenant-id');
      if (finalTenantId) {
        logger.debug('[API] Extracted tenant ID from X-Tenant-ID header');
      }
    }
    
    // Log the results of our extraction attempts
    logger.debug('[API] Final token status:', {
      hasAccessToken: !!finalAccessToken,
      hasIdToken: !!finalIdToken,
      hasTenantId: !!finalTenantId,
      tenantId: finalTenantId
    });
    
    // If we still don't have tokens, return error
    if (!finalAccessToken || !finalIdToken) {
      logger.error('[API] Failed to extract required tokens after all attempts');
      return NextResponse.json({
        error: 'Authentication required',
        code: 'session_expired',
        message: 'Your session has expired. Please sign in again.'
      }, { status: 401 });
    }
    
    // Use direct fetch instead of axiosInstance to bypass interceptors
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/inventory/products/`;
    logger.debug(`[API] Making direct fetch request to ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalAccessToken}`,
        'X-Id-Token': finalIdToken,
        'X-Tenant-ID': finalTenantId,
        'X-Schema-Name': `tenant_${finalTenantId.replace(/-/g, '_')}`
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[API] Backend API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      return NextResponse.json(errorData || {
        error: 'Backend API error',
        message: response.statusText
      }, { status: response.status });
    }
    
    const data = await response.json();
    logger.info(`[API] Product POST successful, created product with ID: ${data?.id || 'unknown'}`);
    return NextResponse.json(data);
    */
  } catch (error) {
    logger.error('[API] Product POST error:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Failed to create product',
      message: error.message 
    }, { status: 500 });
  }
}
