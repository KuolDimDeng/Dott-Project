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
  estimates: [
    {
      id: '1',
      estimate_number: 'EST-2023-001',
      customer_id: '1',
      customer_name: 'Sample Customer 1',
      issue_date: new Date('2023-01-15').toISOString(),
      expiry_date: new Date('2023-02-15').toISOString(),
      total_amount: 1250.00,
      status: 'pending',
      items: [
        {
          id: '1',
          product_id: '1',
          product_name: 'Standard Shipping Container',
          quantity: 1,
          unit_price: 2500.00,
          total: 2500.00
        }
      ],
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      estimate_number: 'EST-2023-002',
      customer_id: '2',
      customer_name: 'Sample Customer 2',
      issue_date: new Date('2023-02-20').toISOString(),
      expiry_date: new Date('2023-03-20').toISOString(),
      total_amount: 4500.00,
      status: 'approved',
      items: [
        {
          id: '2',
          product_id: '2',
          product_name: 'Large Shipping Container',
          quantity: 1,
          unit_price: 4500.00,
          total: 4500.00
        }
      ],
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * GET handler for estimates with tenant-aware RLS
 */
export async function GET(request) {
  console.log('[API] Estimates GET request received');
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
    
    console.log(`[API] Listing estimates for tenant: ${tenantId}, schema: ${schema}`);
    
    // Connect to the actual RDS database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Return filtered mock data
        const filteredEstimates = mockDb.estimates.filter(e => e.tenant_id === tenantId);
        return NextResponse.json(filteredEstimates);
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
          SELECT * FROM ${schemaName}.estimates 
          WHERE tenant_id = $1
          ORDER BY issue_date DESC
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
      const filteredEstimates = mockDb.estimates.filter(e => e.tenant_id === tenantId);
      
      // If no estimates exist yet, create some with the current tenant ID
      if (filteredEstimates.length === 0) {
        console.log('[API] No estimates found for this tenant, creating default estimates');
        
        // Create default estimates with the current tenant ID
        const defaultEstimates = [
          {
            id: `estimate-${Date.now()}-1`,
            estimate_number: 'EST-2023-001',
            customer_id: '1',
            customer_name: 'Sample Customer 1',
            issue_date: new Date('2023-01-15').toISOString(),
            expiry_date: new Date('2023-02-15').toISOString(),
            total_amount: 2500.00,
            status: 'pending',
            items: [
              {
                id: '1',
                product_id: '1',
                product_name: 'Standard Shipping Container',
                quantity: 1,
                unit_price: 2500.00,
                total: 2500.00
              }
            ],
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          },
          {
            id: `estimate-${Date.now()}-2`,
            estimate_number: 'EST-2023-002',
            customer_id: '2',
            customer_name: 'Sample Customer 2',
            issue_date: new Date('2023-02-20').toISOString(),
            expiry_date: new Date('2023-03-20').toISOString(),
            total_amount: 4500.00,
            status: 'approved',
            items: [
              {
                id: '2',
                product_id: '2',
                product_name: 'Large Shipping Container',
                quantity: 1,
                unit_price: 4500.00,
                total: 4500.00
              }
            ],
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }
        ];
        
        // Add the estimates to the mock database
        mockDb.estimates.push(...defaultEstimates);
        
        // Return the newly created estimates
        return NextResponse.json(defaultEstimates);
      }
      
      // Return estimates with tenant ID information
      return NextResponse.json(filteredEstimates);
    }
  } catch (error) {
    console.error('[API] Estimate GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch estimates',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler for estimate creation with tenant-aware RLS
 */
export async function POST(request) {
  console.log('[API] Estimate POST request received');
  try {
    // Get request body
    const estimateData = await request.json();
    console.debug('[API] Estimate POST data:', estimateData);
    
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
    
    const tenantId = estimateData.tenant_id || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    console.debug('[API] Tenant ID determined for estimate creation:', tenantId);
    
    // Create estimate with tenant ID to ensure RLS
    const enhancedEstimateData = {
      ...estimateData,
      id: `estimate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };
    
    // Connect to the actual RDS database in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Add to mock database
        mockDb.estimates.push(enhancedEstimateData);
        console.log('[API] Created estimate with mock data. Tenant ID:', tenantId);
        return NextResponse.json(enhancedEstimateData, { status: 201 });
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
        
        // SQL query to insert estimate with tenant ID for RLS
        const query = `
          INSERT INTO ${schemaName}.estimates (
            estimate_number,
            customer_id,
            customer_name,
            issue_date,
            expiry_date,
            total_amount,
            status,
            items,
            tenant_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
        
        const values = [
          enhancedEstimateData.estimate_number,
          enhancedEstimateData.customer_id,
          enhancedEstimateData.customer_name,
          enhancedEstimateData.issue_date,
          enhancedEstimateData.expiry_date,
          enhancedEstimateData.total_amount,
          enhancedEstimateData.status,
          JSON.stringify(enhancedEstimateData.items || []),
          tenantId,
          enhancedEstimateData.created_at
        ];
        
        const result = await pool.query(query, values);
        
        // Close the connection pool
        await pool.end();
        
        console.log('[API] Created estimate with RLS tenant_id:', tenantId);
        
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
      mockDb.estimates.push(enhancedEstimateData);
      
      console.log('[API] Created estimate with mock data. Tenant ID:', tenantId);
      
      // Return created estimate
      return NextResponse.json(enhancedEstimateData, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Estimate POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create estimate',
      message: error.message 
    }, { status: 500 });
  }
} 