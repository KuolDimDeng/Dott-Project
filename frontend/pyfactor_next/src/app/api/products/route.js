import { NextResponse } from 'next/server';
import { applyRLS, verifyTenantId, getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
// Only import pg in production, otherwise it's not needed
const isProd = process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true';
let Pool;
if (isProd) {
  import('pg').then((pg) => {
    Pool = pg.Pool;
  }).catch(e => console.error('Failed to load pg module:', e));
}

// Simple in-memory mock database for development
const mockDb = {
  products: [
    {
      id: '1',
      product_name: 'Standard Shipping Container',
      description: 'Standard 20ft shipping container for general cargo',
      sku: 'CONT-STD-20',
      price: 2500.00,
      unit: 'each',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      product_name: 'Large Shipping Container',
      description: 'Large 40ft shipping container for bulk cargo',
      sku: 'CONT-LRG-40',
      price: 4500.00,
      unit: 'each',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * GET handler for products with tenant-aware RLS
 */
export async function GET(request) {
  console.log('[API] Products GET request received');
  try {
    // Extract the URL parameters
    const { searchParams } = new URL(request.url);
    const urlTenantId = searchParams.get('tenant_id');
    const schema = searchParams.get('schema');
    
    // Extract tenant ID from headers and cookies
    const headerTenantId = request.headers.get('x-tenant-id');
    
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
    
    // Determine the tenant ID to use, with priority
    const kuolDengTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const isKuolDeng = cookieHeader?.includes('authUser=kuol.deng@example.com');
    
    // Check if schema parameter was provided and convert it to tenant_id if needed
    let schemaTenantId = null;
    if (schema && schema !== 'default_schema') {
      // Try to extract tenant ID from schema name (if format is tenant_{id})
      const schemaMatch = schema.match(/tenant_([a-f0-9_-]+)/i);
      if (schemaMatch && schemaMatch[1]) {
        schemaTenantId = schemaMatch[1].replace(/_/g, '-');
      }
    }
    
    const tenantId = urlTenantId || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     schemaTenantId ||
                     (isKuolDeng ? kuolDengTenantId : null) ||
                     getDefaultTenantId();
    
    console.log(`[API] Listing products for tenant: ${tenantId}, schema: ${schema}`);
    
    // Connect to the actual RDS database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Return filtered mock data
        const filteredProducts = mockDb.products.filter(p => p.tenant_id === tenantId);
        return NextResponse.json(filteredProducts);
      }
      
      try {
        // Create a connection pool to the RDS database
        const pool = new Pool({
          host: process.env.RDS_HOSTNAME,
          port: process.env.RDS_PORT,
          database: process.env.RDS_DB_NAME,
          user: process.env.RDS_USERNAME,
          password: process.env.RDS_PASSWORD,
          ssl: { rejectUnauthorized: false }
        });
        
        // Construct the tenant-specific schema name
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // SQL query with RLS (Row Level Security)
        const query = `
          SELECT * FROM ${schemaName}.products 
          WHERE tenant_id = $1
          ORDER BY product_name ASC
        `;
        
        const result = await pool.query(query, [tenantId]);
        
        // Close the connection pool
        await pool.end();
        
        return NextResponse.json(result.rows);
      } catch (dbError) {
        console.error('[API] Database error:', dbError);
        
        // Close the connection pool on error if it exists
        try {
          if (pool) await pool.end();
        } catch (e) {
          // Ignore any errors from pool.end()
        }
        
        throw new Error(`Database error: ${dbError.message}`);
      }
    } else {
      // DEVELOPMENT MODE: Use mock data directly
      const filteredProducts = mockDb.products.filter(p => p.tenant_id === tenantId);
      
      // If no products exist yet, create some with the current tenant ID
      if (filteredProducts.length === 0) {
        console.log('[API] No products found for this tenant, creating default products');
        
        // Create default products with the current tenant ID
        const defaultProducts = [
          {
            id: `product-${Date.now()}-1`,
            product_name: 'Standard Shipping Container',
            description: 'Standard 20ft shipping container for general cargo',
            sku: 'CONT-STD-20',
            price: 2500.00,
            unit: 'each',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          },
          {
            id: `product-${Date.now()}-2`,
            product_name: 'Large Shipping Container',
            description: 'Large 40ft shipping container for bulk cargo',
            sku: 'CONT-LRG-40',
            price: 4500.00,
            unit: 'each',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }
        ];
        
        // Add the products to the mock database
        mockDb.products.push(...defaultProducts);
        
        // Return the newly created products
        return NextResponse.json(defaultProducts);
      }
      
      // Return products with tenant ID information
      return NextResponse.json(filteredProducts);
    }
  } catch (error) {
    console.error('[API] Product GET error:', error.message);
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
  console.log('[API] Product POST request received');
  try {
    // Get request body
    const productData = await request.json();
    console.debug('[API] Product POST data:', productData);
    
    // Extract tenant info from request
    const headerTenantId = request.headers.get('x-tenant-id');
    
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
    
    // Determine tenant ID with priority
    const kuolDengTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const isKuolDeng = cookieHeader?.includes('authUser=kuol.deng@example.com');
    
    const tenantId = productData.tenant_id || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    console.debug('[API] Tenant ID determined for product creation:', tenantId);
    
    // Create product with tenant ID to ensure RLS
    const enhancedProductData = {
      ...productData,
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };
    
    // Connect to the actual RDS database in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Add to mock database
        mockDb.products.push(enhancedProductData);
        console.log('[API] Created product with mock data. Tenant ID:', tenantId);
        return NextResponse.json(enhancedProductData, { status: 201 });
      }
      
      try {
        // Create a connection pool to the RDS database
        const pool = new Pool({
          host: process.env.RDS_HOSTNAME,
          port: process.env.RDS_PORT,
          database: process.env.RDS_DB_NAME,
          user: process.env.RDS_USERNAME,
          password: process.env.RDS_PASSWORD,
          ssl: { rejectUnauthorized: false }
        });
        
        // Construct the tenant-specific schema name
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // SQL query to insert product with tenant ID for RLS
        const query = `
          INSERT INTO ${schemaName}.products (
            product_name, 
            description, 
            sku, 
            price, 
            unit, 
            tenant_id, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const values = [
          enhancedProductData.product_name,
          enhancedProductData.description,
          enhancedProductData.sku,
          enhancedProductData.price,
          enhancedProductData.unit,
          tenantId,
          enhancedProductData.created_at
        ];
        
        const result = await pool.query(query, values);
        
        // Close the connection pool
        await pool.end();
        
        console.log('[API] Created product with RLS tenant_id:', tenantId);
        
        return NextResponse.json(result.rows[0], { status: 201 });
      } catch (dbError) {
        console.error('[API] Database error:', dbError);
        
        // Close the connection pool on error
        try {
          if (pool) await pool.end();
        } catch (e) {
          // Ignore any errors from pool.end()
        }
        
        throw new Error(`Database error: ${dbError.message}`);
      }
    } else {
      // DEVELOPMENT MODE: Use mock database
      mockDb.products.push(enhancedProductData);
      
      console.log('[API] Created product with mock data. Tenant ID:', tenantId);
      
      // Return created product
      return NextResponse.json(enhancedProductData, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Product POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create product',
      message: error.message 
    }, { status: 500 });
  }
} 