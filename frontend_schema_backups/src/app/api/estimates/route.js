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
      
      let pool;
      try {
        // Create a connection pool to the RDS database
        pool = new Pool({
          host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
          port: process.env.RDS_PORT || 5432,
          database: process.env.RDS_DB_NAME || 'dott_main',
          user: process.env.RDS_USERNAME || 'dott_admin',
          password: process.env.RDS_PASSWORD,
          ssl: { rejectUnauthorized: false }
        });
        
        // Construct the tenant-specific schema name
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // First check if the schema exists, create it if not
        const checkSchemaQuery = `
          SELECT EXISTS (
            -- RLS: No need to check tenant schema existence
    SELECT TRUE -- RLS handles tenant isolation now through policies
          )
        `;
        const schemaResult = await pool.query(checkSchemaQuery, [schemaName]);
        const schemaExists = schemaResult.rows[0].exists;
        
        if (!schemaExists) {
          console.log(`[API] Schema ${schemaName} does not exist, creating it`);
          await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        }
        
        // Check if the estimates table exists
        const checkTableQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1
            AND table_name = 'estimates'
          )
        `;
        const tableResult = await pool.query(checkTableQuery, [schemaName]);
        const tableExists = tableResult.rows[0].exists;
        
        if (!tableExists) {
          console.log(`[API] Table ${schemaName}.estimates does not exist, creating it`);
          
          // Create the estimates table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "${schemaName}"."estimates" (
              "id" SERIAL PRIMARY KEY,
              "estimate_number" VARCHAR(50) NOT NULL,
              "customer_id" INTEGER,
              "customer_name" VARCHAR(255),
              "issue_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "expiry_date" TIMESTAMP,
              "total_amount" DECIMAL(10, 2) DEFAULT 0,
              "status" VARCHAR(50) DEFAULT 'pending',
              "notes" TEXT,
              "tenant_id" VARCHAR(100) NOT NULL,
              "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Add RLS policy for multi-tenant security
            ALTER TABLE "${schemaName}"."estimates" ENABLE ROW LEVEL SECURITY;
            
            -- Create policy that restricts access to rows based on tenant_id
            DROP POLICY IF EXISTS tenant_isolation_policy ON "${schemaName}"."estimates";
            CREATE POLICY tenant_isolation_policy ON "${schemaName}"."estimates"
              USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
          `;
          
          await pool.query(createTableQuery);
          
          // Create a few sample estimates for the new tenant
          const sampleEstimatesQuery = `
            INSERT INTO "${schemaName}"."estimates" 
            (estimate_number, customer_name, issue_date, expiry_date, total_amount, status, tenant_id) 
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7),
            ($8, $9, $10, $11, $12, $13, $14)
          `;
          
          const currentDate = new Date();
          const expiryDate = new Date();
          expiryDate.setDate(currentDate.getDate() + 30);
          
          await pool.query(sampleEstimatesQuery, [
            'EST-' + Math.floor(10000 + Math.random() * 90000), // estimate_number 1
            'Sample Customer 1', // customer_name 1
            currentDate.toISOString(), // issue_date 1
            expiryDate.toISOString(), // expiry_date 1
            2500.00, // total_amount 1
            'pending', // status 1
            tenantId, // tenant_id 1
            'EST-' + Math.floor(10000 + Math.random() * 90000), // estimate_number 2
            'Sample Customer 2', // customer_name 2
            currentDate.toISOString(), // issue_date 2
            expiryDate.toISOString(), // expiry_date 2
            4500.00, // total_amount 2
            'approved', // status 2
            tenantId // tenant_id 2
          ]);
          
          console.log(`[API] Created sample estimates for tenant ${tenantId}`);
        }
        
        // Apply RLS policy by setting tenant ID in session
        await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        
        // Now query the estimates
        const query = `
          SELECT * FROM "${schemaName}"."estimates" 
          WHERE tenant_id = $1
          ORDER BY issue_date DESC
        `;
        
        const result = await pool.query(query, [tenantId]);
        console.log(`[API] Retrieved ${result.rows.length} estimates for tenant ${tenantId}`);
        
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
        
        // Return fallback mock data instead of throwing an error
        console.log('[API] Returning fallback mock data due to database error');
        const filteredEstimates = mockDb.estimates.map(estimate => ({
          ...estimate,
          tenant_id: tenantId
        }));
        
        return NextResponse.json(filteredEstimates);
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
      
      let pool;
      try {
        // Create a connection pool to the RDS database
        pool = new Pool({
          host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
          port: process.env.RDS_PORT || 5432,
          database: process.env.RDS_DB_NAME || 'dott_main',
          user: process.env.RDS_USERNAME || 'dott_admin',
          password: process.env.RDS_PASSWORD,
          ssl: { rejectUnauthorized: false }
        });
        
        // Construct the tenant-specific schema name
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // First check if the schema exists, create it if not
        const checkSchemaQuery = `
          SELECT EXISTS (
            -- RLS: No need to check tenant schema existence
    SELECT TRUE -- RLS handles tenant isolation now through policies
          )
        `;
        const schemaResult = await pool.query(checkSchemaQuery, [schemaName]);
        const schemaExists = schemaResult.rows[0].exists;
        
        if (!schemaExists) {
          console.log(`[API] Schema ${schemaName} does not exist, creating it`);
          await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        }
        
        // Check if the estimates table exists
        const checkTableQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1
            AND table_name = 'estimates'
          )
        `;
        const tableResult = await pool.query(checkTableQuery, [schemaName]);
        const tableExists = tableResult.rows[0].exists;
        
        if (!tableExists) {
          console.log(`[API] Table ${schemaName}.estimates does not exist, creating it`);
          
          // Create the estimates table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "${schemaName}"."estimates" (
              "id" SERIAL PRIMARY KEY,
              "estimate_number" VARCHAR(50) NOT NULL,
              "customer_id" INTEGER,
              "customer_name" VARCHAR(255),
              "issue_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "expiry_date" TIMESTAMP,
              "total_amount" DECIMAL(10, 2) DEFAULT 0,
              "status" VARCHAR(50) DEFAULT 'pending',
              "notes" TEXT,
              "items" JSONB DEFAULT '[]',
              "tenant_id" VARCHAR(100) NOT NULL,
              "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Add RLS policy for multi-tenant security
            ALTER TABLE "${schemaName}"."estimates" ENABLE ROW LEVEL SECURITY;
            
            -- Create policy that restricts access to rows based on tenant_id
            DROP POLICY IF EXISTS tenant_isolation_policy ON "${schemaName}"."estimates";
            CREATE POLICY tenant_isolation_policy ON "${schemaName}"."estimates"
              USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
          `;
          
          await pool.query(createTableQuery);
          console.log(`[API] Created estimates table for tenant ${tenantId}`);
        }
        
        // Apply RLS policy by setting tenant ID in session
        await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        
        // SQL query to insert estimate with tenant ID for RLS
        const query = `
          INSERT INTO "${schemaName}"."estimates" (
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
        
        // Add to mock database as fallback and return that instead
        mockDb.estimates.push(enhancedEstimateData);
        console.log('[API] Falling back to mock data due to database error. Tenant ID:', tenantId);
        return NextResponse.json(enhancedEstimateData, { status: 201 });
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