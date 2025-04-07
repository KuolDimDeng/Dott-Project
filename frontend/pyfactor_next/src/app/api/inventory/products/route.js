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
    let businessIdCookie = null;
    
    if (cookieHeader) {
      logger.debug('Cookie header:', cookieHeader);
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          cookieTenantId = value;
          logger.debug('Found tenantId cookie:', value);
        } else if (name === 'dev-tenant-id') {
          devTenantId = value;
          logger.debug('Found dev-tenant-id cookie:', value);
        } else if (name === 'businessid') {
          businessIdCookie = value;
          logger.debug('Found businessid cookie:', value);
        }
      });
    }
    
    console.log('DEBUG: API GET - Browser using tenant IDs:', {
      cookieTenantId,
      devTenantId,
      businessIdCookie,
      headerTenantId,
      jwtTenantId,
      urlTenantId,
      schema
    });
    
    // Get active tenant ID from AWS RDS database
    // Import PostgreSQL
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
      port: process.env.RDS_PORT || 5432,
      database: process.env.RDS_DB_NAME || 'dott_main',
      user: process.env.RDS_USERNAME || 'dott_admin',
      password: process.env.RDS_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
      ssl: { rejectUnauthorized: false }
    });
    
    let tenantId;
    try {
      // Find the first active tenant in the database
      const result = await pool.query(`
        SELECT id, schema_name
        FROM custom_auth_tenant
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        tenantId = result.rows[0].id;
        console.log(`DEBUG: API GET - Found active tenant in database: ${tenantId}`);
      } else {
        // Fallback to the tenant ID from the request if no active tenant found
        tenantId = urlTenantId || jwtTenantId || headerTenantId || 
                 businessIdCookie || cookieTenantId || devTenantId || 
                 getDefaultTenantId();
        console.log(`DEBUG: API GET - No active tenant found, using fallback: ${tenantId}`);
      }
    } catch (dbError) {
      console.error('DEBUG: API GET - Error finding tenant in database:', dbError);
      // Fallback to tenant ID from request
      tenantId = urlTenantId || jwtTenantId || headerTenantId || 
               businessIdCookie || cookieTenantId || devTenantId || 
               getDefaultTenantId();
    } finally {
      await pool.end();
    }
    
    console.log(`DEBUG: API GET - Using tenant ID: ${tenantId}`);
    
    // Get schema name from the tenant ID
    const effectiveSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
    console.log(`DEBUG: API GET - Using schema: ${effectiveSchema}`);
    
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
 * POST handler for creating a new product with tenant-aware RLS
 */
export async function POST(request) {
  console.log('DEBUG: API - Product POST request received');
  logger.log('[API] Product POST request received');
  
  try {
    // Extract tenant information from headers and cookies with priority to headerTenantId
    const headerTenantId = request.headers.get('x-tenant-id');
    
    // Parse cookies for tenant ID info
    const cookieHeader = request.headers.get('cookie');
    let cookieTenantId = null;
    let businessIdCookie = null;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') cookieTenantId = value;
        else if (name === 'businessid') businessIdCookie = value;
      });
    }
    
    // Check ID token for tenant info
    const idToken = request.headers.get('X-Id-Token');
    let jwtTenantId = null;
    
    if (idToken) {
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decoded = jwtDecode(idToken);
        jwtTenantId = decoded['custom:businessid'] || null;
      } catch (error) {
        console.error('DEBUG: API - Error decoding JWT token:', error);
      }
    }
    
    console.log('DEBUG: API - Tenant ID options:', {
      headerTenantId,
      cookieTenantId,
      businessIdCookie,
      jwtTenantId
    });
    
    // Get active tenant ID from AWS RDS database
    // Import PostgreSQL
    const { Pool } = await import('pg');
    let pool = new Pool({
      host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
      port: process.env.RDS_PORT || 5432,
      database: process.env.RDS_DB_NAME || 'dott_main',
      user: process.env.RDS_USERNAME || 'dott_admin',
      password: process.env.RDS_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
      ssl: { rejectUnauthorized: false }
    });
    
    let tenantId;
    let schemaName;
    
    try {
      // Find the first active tenant in the database
      const result = await pool.query(`
        SELECT id, schema_name
        FROM custom_auth_tenant
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        tenantId = result.rows[0].id;
        schemaName = result.rows[0].schema_name;
        console.log(`DEBUG: API POST - Found active tenant in database: ${tenantId}, schema: ${schemaName}`);
      } else {
        // Fallback to the tenant ID from the request if no active tenant found
        tenantId = headerTenantId || jwtTenantId || businessIdCookie || cookieTenantId || getDefaultTenantId();
        schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        console.log(`DEBUG: API POST - No active tenant found, using fallback: ${tenantId}`);
      }
    } catch (dbError) {
      console.error('DEBUG: API POST - Error finding tenant in database:', dbError);
      // Fallback to tenant ID from request
      tenantId = headerTenantId || jwtTenantId || businessIdCookie || cookieTenantId || getDefaultTenantId();
      schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      await pool.end();
      
      // Create a new pool for the product operations
      pool = new Pool({
        host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
        port: process.env.RDS_PORT || 5432,
        database: process.env.RDS_DB_NAME || 'dott_main',
        user: process.env.RDS_USERNAME || 'dott_admin',
        password: process.env.RDS_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
        ssl: { rejectUnauthorized: false }
      });
    }
    
    console.log(`DEBUG: API POST - Using tenant ID: ${tenantId}, schema: ${schemaName}`);
    
    // Parse request body
    let productData;
    const contentType = request.headers.get('content-type');
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with image uploads)
      console.log('DEBUG: API - Processing multipart form data');
      const formData = await request.formData();
      productData = {};
      
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        productData[key] = value;
      }
      
      console.log('DEBUG: API - Parsed form data:', {
        ...productData,
        image: productData.image ? 'Image file received' : 'No image'
      });
    } else {
      // Handle JSON data
      console.log('DEBUG: API - Processing JSON data');
      productData = await request.json();
      console.log('DEBUG: API - Parsed JSON data:', productData);
    }
    
    // Set tenant_id in the product data for RLS policy
    productData.tenant_id = tenantId;
    
    // DEVELOPMENT MODE: Use the development database connector
    if (process.env.NODE_ENV !== 'production') {
      console.log('DEBUG: API - Using development database connector');
      const dbConnector = createDbConnector({ tenantId });
      
      // Generate ID and timestamps
      productData.id = productData.id || crypto.randomUUID();
      productData.created_at = new Date().toISOString();
      productData.updated_at = new Date().toISOString();
      
      // Save the product
      await dbConnector.insert('products', productData);
      console.log('DEBUG: API - Product saved to development database:', productData.id);
      
      // Return the newly created product
      return NextResponse.json(productData);
    }
    
    // PRODUCTION CODE BELOW
    console.log('DEBUG: API - Using production database with RLS');
    
    // Get client
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Set tenant context for RLS policy
      await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      
      console.log('DEBUG: API - Set RLS tenant context:', tenantId);
      
      // Use the schema name we already found instead of querying for it again
      if (!schemaName) {
        // If somehow schema name wasn't found earlier, look it up now
        const schemaResult = await client.query(`
          SELECT schema_name 
          FROM custom_auth_tenant 
          WHERE id = $1
        `, [tenantId]);
        
        if (schemaResult.rows.length > 0) {
          schemaName = schemaResult.rows[0].schema_name;
          console.log('DEBUG: API - Found schema name from tenant record:', schemaName);
        } else {
          // Fallback to conventional schema naming if not found in tenant table
          schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
          console.log('DEBUG: API - Using generated schema name:', schemaName);
        }
      }
      
      // Insert product into inventory_product table with tenant_id for RLS
      const insertQuery = `
        INSERT INTO "${schemaName}"."inventory_product" (
          name, 
          description, 
          price, 
          stock_quantity, 
          sku, 
          tenant_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const sku = productData.sku || `SKU-${Date.now().toString().substring(9)}`;
      
      const insertValues = [
        productData.name,
        productData.description || '',
        parseFloat(productData.price) || 0,
        parseInt(productData.stock_quantity) || 0,
        sku,
        tenantId
      ];
      
      console.log('DEBUG: API - Executing insert query with values:', {
        query: insertQuery,
        schema: schemaName,
        values: insertValues
      });
      
      const result = await client.query(insertQuery, insertValues);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('DEBUG: API - Product created successfully:', result.rows[0]);
      
      // Return the created product
      return NextResponse.json(result.rows[0]);
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('DEBUG: API - Database error creating product:', error);
      throw error;
    } finally {
      // Release client
      client.release();
      
      // Close pool
      await pool.end();
    }
  } catch (error) {
    console.error('DEBUG: API - Error creating product:', error);
    logger.error(`[API] Error creating product: ${error.message}`, { error });
    
    // Return error response
    return NextResponse.json(
      { error: 'Failed to create product', message: error.message },
      { status: 500 }
    );
  }
}
