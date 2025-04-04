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
  vendors: [
    {
      id: '1',
      vendor_name: 'Sample Vendor 1',
      street: '123 Main St',
      postcode: '12345',
      city: 'Sample City',
      state: 'Sample State',
      phone: '555-123-4567',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      vendor_name: 'Sample Vendor 2',
      street: '456 Oak Ave',
      postcode: '67890',
      city: 'Another City',
      state: 'Another State',
      phone: '555-987-6543',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * GET handler for vendors with tenant-aware RLS
 */
export async function GET(request) {
  console.log('[API] Vendors GET request received');
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
    
    console.log(`[API] Listing vendors for tenant: ${tenantId}, schema: ${schema}`);
    
    // Connect to the actual RDS database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Return filtered mock data
        const filteredVendors = mockDb.vendors.filter(v => v.tenant_id === tenantId);
        return NextResponse.json(filteredVendors);
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
          SELECT * FROM ${schemaName}.vendors 
          WHERE tenant_id = $1
          ORDER BY vendor_name ASC
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
      const filteredVendors = mockDb.vendors.filter(v => v.tenant_id === tenantId);
      
      // If no vendors exist yet, create some with the current tenant ID
      if (filteredVendors.length === 0) {
        console.log('[API] No vendors found for this tenant, creating default vendors');
        
        // Create default vendors with the current tenant ID
        const defaultVendors = [
          {
            id: `vendor-${Date.now()}-1`,
            vendor_name: 'Sample Vendor 1',
            street: '123 Main St',
            postcode: '12345',
            city: 'Sample City',
            state: 'Sample State',
            phone: '555-123-4567',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          },
          {
            id: `vendor-${Date.now()}-2`,
            vendor_name: 'Sample Vendor 2',
            street: '456 Oak Ave',
            postcode: '67890',
            city: 'Another City',
            state: 'Another State',
            phone: '555-987-6543',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }
        ];
        
        // Add the vendors to the mock database
        mockDb.vendors.push(...defaultVendors);
        
        // Return the newly created vendors
        return NextResponse.json(defaultVendors);
      }
      
      // Return vendors with tenant ID information
      return NextResponse.json(filteredVendors);
    }
  } catch (error) {
    console.error('[API] Vendor GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch vendors',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler for vendor creation with tenant-aware RLS
 */
export async function POST(request) {
  console.log('[API] Vendor POST request received');
  try {
    // Get request body
    const vendorData = await request.json();
    console.debug('[API] Vendor POST data:', vendorData);
    
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
    
    const tenantId = vendorData.tenant_id || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    console.debug('[API] Tenant ID determined for vendor creation:', tenantId);
    
    // Create vendor with tenant ID to ensure RLS
    const enhancedVendorData = {
      ...vendorData,
      id: `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };
    
    // Connect to the actual RDS database in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Add to mock database
        mockDb.vendors.push(enhancedVendorData);
        console.log('[API] Created vendor with mock data. Tenant ID:', tenantId);
        return NextResponse.json(enhancedVendorData, { status: 201 });
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
        
        // SQL query to insert vendor with tenant ID for RLS
        const query = `
          INSERT INTO ${schemaName}.vendors (
            vendor_name, 
            street, 
            postcode, 
            city, 
            state, 
            phone, 
            tenant_id, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        
        const values = [
          enhancedVendorData.vendor_name,
          enhancedVendorData.street,
          enhancedVendorData.postcode,
          enhancedVendorData.city,
          enhancedVendorData.state,
          enhancedVendorData.phone,
          tenantId,
          enhancedVendorData.created_at
        ];
        
        const result = await pool.query(query, values);
        
        // Close the connection pool
        await pool.end();
        
        console.log('[API] Created vendor with RLS tenant_id:', tenantId);
        
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
      mockDb.vendors.push(enhancedVendorData);
      
      console.log('[API] Created vendor with mock data. Tenant ID:', tenantId);
      
      // Return created vendor
      return NextResponse.json(enhancedVendorData, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Vendor POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create vendor',
      message: error.message 
    }, { status: 500 });
  }
} 