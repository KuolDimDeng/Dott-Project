import { NextResponse } from 'next/server';
import { applyRLS, verifyTenantId, getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
import { createDbConnector } from '@/config/database';
import { logger } from '@/utils/serverLogger';

/**
 * GET handler for product listing with tenant-aware RLS
 */
export async function GET(request) {
  logger.log('[API] Product GET request received');
  try {
    // Extract the URL parameters
    const { searchParams } = new URL(request.url);
    const urlTenantId = searchParams.get('tenant_id');
    const schema = searchParams.get('schema');
    
    // Extract tenant ID from headers and cookies
    const headerTenantId = request.headers.get('x-tenant-id');
    
    // First check Authorization and ID Token headers for JWT-derived tenant ID
    const idToken = request.headers.get('X-Id-Token');
    let jwtTenantId = null;
    
    if (idToken) {
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decoded = jwtDecode(idToken);
        
        // Extract business ID from token as tenant ID
        jwtTenantId = decoded['custom:businessid'] || null;
        
        if (jwtTenantId) {
          logger.debug('Found tenant ID in JWT token:', jwtTenantId);
        }
      } catch (error) {
        logger.error('Error decoding JWT token:', error.message);
      }
    }
    
    const cookieHeader = request.headers.get('cookie');
    let cookieTenantId = null;
    let devTenantId = null;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          cookieTenantId = value;
        } else if (name === 'dev-tenant-id') {
          devTenantId = value;
        }
      });
    }
    
    // Check if schema parameter was provided and convert it to tenant_id if needed
    let schemaTenantId = null;
    if (schema && schema !== 'default_schema') {
      // Try to extract tenant ID from schema name (if format is tenant_{id})
      const schemaMatch = schema.match(/tenant_([a-f0-9_-]+)/i);
      if (schemaMatch && schemaMatch[1]) {
        schemaTenantId = schemaMatch[1].replace(/_/g, '-');
      }
    }
    
    // Determine tenant ID with priority
    const kuolDengTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const isKuolDeng = cookieHeader?.includes('authUser=kuol.deng@example.com');
    
    const tenantId = urlTenantId || 
                     jwtTenantId ||  // Prioritize JWT token tenant ID
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     schemaTenantId ||
                     (isKuolDeng ? kuolDengTenantId : null) ||
                     getDefaultTenantId();
    
    logger.log(`[API] Listing products for tenant: ${tenantId}, schema: ${schema}`);
    
    // Verify tenant exists (development only)
    const tenant = verifyTenantId(tenantId);
    if (!tenant && process.env.NODE_ENV !== 'production') {
      logger.warn(`[API] Invalid tenant ID: ${tenantId}, using default`);
    }
    
    // DEVELOPMENT MODE: Use the development database connector
    if (process.env.NODE_ENV !== 'production') {
      const dbConnector = createDbConnector({ tenantId });
      
      // Handle special case for schema=default_schema from older components
      if (schema === 'default_schema') {
        logger.log('[API] Using default_schema compatibility mode');
      }
      
      // Fetch products from the dev database (localStorage)
      let products = await dbConnector.find('products');
      
      // If no products exist yet, create some default ones
      if (products.length === 0) {
        logger.log('[API] No products found, creating default products');
        
        // Create default products
        const defaultProducts = [
          {
            name: 'Sample Product 1',
            description: 'This is a sample product',
            price: 19.99,
            inventory: 100,
            stock_quantity: 100,
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          },
          {
            name: 'Sample Product 2',
            description: 'Another sample product',
            price: 29.99,
            inventory: 50,
            stock_quantity: 50,
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }
        ];
        
        // Insert default products
        for (const product of defaultProducts) {
          await dbConnector.insert('products', product);
        }
        
        // Fetch products again
        products = await dbConnector.find('products');
      }
      
      // Return data in the format expected by the frontend
      if (schema) {
        // Older format expected by some components
        return NextResponse.json(products);
      } else {
        // Newer format with tenant ID
        return NextResponse.json({
          products,
          _tenantId: tenantId,
          _devMode: true,
          _storeLocally: true,
          _checkLocalStorage: true
        });
      }
    }
    
    // PRODUCTION CODE BELOW
    // Get products from backend API
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    // Format endpoint based on whether schema or tenant_id is used
    const endpoint = schema 
      ? `${process.env.API_ENDPOINT}/products?schema=${schema}`
      : `${process.env.API_ENDPOINT}/products?tenant_id=${tenantId}`;
      
    // RLS: Apply tenant filter to ensure only the tenant's products are returned
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // Additional RLS filter to ensure only the tenant's products are returned
    const filteredProducts = applyRLS(data.products || data, tenantId);
    
    // Return in the expected format based on request
    if (schema) {
      return NextResponse.json(filteredProducts);
    } else {
      return NextResponse.json({ products: filteredProducts });
    }
  } catch (error) {
    logger.error('[API] Product GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler for product creation with tenant-aware RLS
 */
export async function POST(request) {
  logger.log('[API] Product POST request received');
  try {
    // Get request body
    const productData = await request.json();
    logger.debug('[API] Product POST data:', productData);
    
    // Check URL parameters for schema
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get('schema');
    
    // Extract tenant info from request
    const headerTenantId = request.headers.get('x-tenant-id');

    // First check Authorization and ID Token headers for JWT-derived tenant ID
    const idToken = request.headers.get('X-Id-Token');
    let jwtTenantId = null;
    
    if (idToken) {
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decoded = jwtDecode(idToken);
        
        // Extract business ID from token as tenant ID
        jwtTenantId = decoded['custom:businessid'] || null;
        
        if (jwtTenantId) {
          logger.debug('Found tenant ID in JWT token:', jwtTenantId);
        }
      } catch (error) {
        logger.error('Error decoding JWT token:', error.message);
      }
    }
    
    const cookieHeader = request.headers.get('cookie');
    let cookieTenantId = null;
    let devTenantId = null;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          cookieTenantId = value;
        } else if (name === 'dev-tenant-id') {
          devTenantId = value;
        }
      });
    }
    
    // Check if schema parameter was provided and convert it to tenant_id if needed
    let schemaTenantId = null;
    if (schema && schema !== 'default_schema') {
      // Try to extract tenant ID from schema name (if format is tenant_{id})
      const schemaMatch = schema.match(/tenant_([a-f0-9_-]+)/i);
      if (schemaMatch && schemaMatch[1]) {
        schemaTenantId = schemaMatch[1].replace(/_/g, '-');
      }
    }
    
    // Determine tenant ID with priority
    const kuolDengTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const isKuolDeng = cookieHeader?.includes('authUser=kuol.deng@example.com');
    
    const tenantId = productData.tenant_id || 
                     jwtTenantId ||  // Prioritize JWT token tenant ID
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     schemaTenantId ||
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    logger.debug('Tenant ID determined for product creation:', tenantId);
    logger.debug('Schema parameter:', schema);
    
    // DEVELOPMENT MODE: Use the development database connector
    if (process.env.NODE_ENV !== 'production') {
      const dbConnector = createDbConnector({ tenantId });
      
      // Create product with tenant ID
      const enhancedProductData = {
        ...productData,
        tenant_id: tenantId,
        // Ensure product has both tenantId and tenant_id for compatibility
        tenantId: tenantId
      };
      
      // Insert into dev database
      const createdProduct = await dbConnector.insert('products', enhancedProductData);
      
      logger.info('Created product with RLS tenant_id:', tenantId);
      
      // Return in the format expected by the client
      if (schema === 'default_schema') {
        return NextResponse.json(createdProduct, { status: 201 });
      } else {
        // Add dev flags to support local storage in the client
        return NextResponse.json({
          ...createdProduct,
          _devMode: true,
          _storeLocally: true
        }, { status: 201 });
      }
    }
    
    // PRODUCTION CODE BELOW
    // Ensure the product data includes the tenant ID for RLS
    const enhancedProductData = {
      ...productData,
      tenant_id: tenantId,
      tenantId: tenantId // Include both formats for compatibility
    };
    
    // Call the real API endpoint to create the product
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    // Format the endpoint based on schema or tenant_id
    const endpoint = schema 
      ? `${process.env.API_ENDPOINT}/products?schema=${schema}`
      : `${process.env.API_ENDPOINT}/products`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify(enhancedProductData)
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }
    
    const createdProduct = await response.json();
    
    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    logger.error('Product POST error:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Failed to create product',
      message: error.message 
    }, { status: 500 });
  }
}
