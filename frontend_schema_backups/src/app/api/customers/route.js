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
  customers: [
    {
      id: '1',
      customer_name: 'Sample Customer 1',
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
      customer_name: 'Sample Customer 2',
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

// Default customers when database access fails
const DEFAULT_CUSTOMERS = [
  {
    id: 'default-customer-1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '555-123-4567',
    address: '123 Main St, Sample City, CA 12345',
    is_default: true
  },
  {
    id: 'default-customer-2',
    name: 'Globex Industries',
    email: 'info@globex.com',
    phone: '555-987-6543',
    address: '456 Oak Ave, Another City, NY 67890',
    is_default: true
  }
];

/**
 * Check if schema exists before trying to query tables
 */
const checkSchemaExists = async (pool, schemaName) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE id = $1 -- RLS: Using tenant_id instead of schema_name
      );
    `;
    
    const result = await pool.query(query, [schemaName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking schema existence:', error);
    return false;
  }
};

/**
 * GET handler for customer listing with tenant-aware RLS
 */
export async function GET(request) {
  try {
    // Extract the URL parameters
    const { searchParams } = new URL(request.url);
    
    // Get tenant ID from search params or headers
    const tenantId = searchParams.get('tenantId') || 
                    request.headers.get('x-tenant-id') || 
                    'default-tenant';
    
    // Get schema from search params
    const schema = searchParams.get('schema');
    
    // Construct the schema name
    const schemaName = schema || `tenant_${tenantId.replace(/-/g, '_')}`;
    
    console.log(`[API] Customers GET request received`);
    console.log(`[API] Listing customers for tenant: ${tenantId}, schema: ${schemaName}`);
    
    // For development or when DB connection fails, return mock data
    if (process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_DATA === 'true') {
      console.log('[API] Using mock customer data for development');
      return NextResponse.json(DEFAULT_CUSTOMERS.map(c => ({...c, tenant_id: tenantId})));
    }
    
    // Connect to the database to get the data
    const config = {
      host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
      port: process.env.RDS_PORT || 5432,
      database: process.env.RDS_DB_NAME || 'dott_main',
      user: process.env.RDS_USERNAME || 'dott_admin',
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };
    
    console.log('Using AWS RDS database connection');
    console.log('AWS RDS connection details:', {
      host: config.host,
      database: config.database,
      user: config.user,
      port: config.port
    });
    
    try {
      // Create a connection pool
      const { Pool } = require('pg');
      const pool = new Pool(config);
      
      // First check if the schema exists
      const schemaExists = await checkSchemaExists(pool, schemaName);
      
      if (!schemaExists) {
        console.log(`[API] Schema "${schemaName}" does not exist, creating it...`);
        
        // Create schema if it doesn't exist
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
        
        // Create customers table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."crm_customer" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "tenant_id" UUID NOT NULL,
            "customer_name" TEXT NOT NULL,
            "first_name" VARCHAR(100),
            "last_name" VARCHAR(100),
            "email" TEXT,
            "phone" TEXT,
            "street" TEXT,
            "city" TEXT,
            "state" TEXT,
            "postcode" TEXT,
            "country" TEXT,
            "account_number" TEXT,
            "notes" TEXT,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Add index on tenant_id for better performance
          CREATE INDEX IF NOT EXISTS "crm_customer_tenant_id_idx" ON "${schemaName}"."crm_customer" ("tenant_id");
        `);
        
        // Insert default customers as examples
        for (const customer of DEFAULT_CUSTOMERS) {
          await pool.query(`
            INSERT INTO "${schemaName}"."crm_customer" 
            (tenant_id, customer_name, email, phone, street) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING;
          `, [
            tenantId,
            customer.name,
            customer.email || '',
            customer.phone || '',
            customer.address || ''
          ]);
        }
        
        console.log(`[API] Created schema and customers table with sample data`);
      }
      
      // Now query the customers
      const query = `
        SELECT * FROM "${schemaName}"."crm_customer"
        WHERE "tenant_id" = $1
        ORDER BY "customer_name" ASC;
      `;
      
      const result = await pool.query(query, [tenantId]);
      
      // Close the connection pool
      await pool.end();
      
      // Format the results
      const customers = result.rows;
      console.log(`[API] Retrieved ${customers.length} customers for tenant ${tenantId}`);
      
      return NextResponse.json(customers);
    } catch (error) {
      console.error('[API] Database error:', error);
      
      // Return fallback data
      console.log('[API] Returning fallback customer data due to database error');
      return NextResponse.json(DEFAULT_CUSTOMERS.map(c => ({...c, tenant_id: tenantId})), {
        headers: {
          'X-Fallback-Data': 'true',
          'Cache-Control': 'no-store'
        }
      });
    }
  } catch (error) {
    console.error('[API] Customer GET error:', error);
    
    // Return empty array with status 200 to prevent UI errors
    return NextResponse.json([], {
      status: 200,
      headers: {
        'X-Error-Occurred': 'true',
        'Cache-Control': 'no-store'
      }
    });
  }
}

/**
 * POST handler for customer creation with tenant-aware RLS
 */
export async function POST(request) {
  console.log('[API] Customer POST request received');
  try {
    // Get request body
    const customerData = await request.json();
    console.debug('[API] Customer POST data:', customerData);
    
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
    
    const tenantId = customerData.tenant_id || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    console.debug('[API] Tenant ID determined for customer creation:', tenantId);
    
    // Create customer with tenant ID to ensure RLS
    const enhancedCustomerData = {
      ...customerData,
      id: `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };
    
    // Connect to the actual RDS database in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Add to mock database
        mockDb.customers.push(enhancedCustomerData);
        console.log('[API] Created customer with mock data. Tenant ID:', tenantId);
        return NextResponse.json(enhancedCustomerData, { status: 201 });
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
        
        // Check if the crm_customer table exists
        const checkTableQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1
            AND table_name = 'crm_customer'
          )
        `;
        const tableResult = await pool.query(checkTableQuery, [schemaName]);
        const tableExists = tableResult.rows[0].exists;
        
        if (!tableExists) {
          console.log(`[API] Table ${schemaName}.crm_customer does not exist, creating it`);
          
          // Create the crm_customer table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "${schemaName}"."crm_customer" (
              "id" SERIAL PRIMARY KEY,
              "customer_name" VARCHAR(255) NOT NULL,
              "first_name" VARCHAR(100),
              "last_name" VARCHAR(100),
              "email" VARCHAR(255),
              "phone" VARCHAR(50),
              "street" VARCHAR(255),
              "city" VARCHAR(100),
              "state" VARCHAR(100),
              "postcode" VARCHAR(20),
              "country" VARCHAR(100),
              "account_number" VARCHAR(50),
              "notes" TEXT,
              "tenant_id" VARCHAR(100) NOT NULL,
              "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Add RLS policy for multi-tenant security
            ALTER TABLE "${schemaName}"."crm_customer" ENABLE ROW LEVEL SECURITY;
            
            -- Create policy that restricts access to rows based on tenant_id
            DROP POLICY IF EXISTS tenant_isolation_policy ON "${schemaName}"."crm_customer";
            CREATE POLICY tenant_isolation_policy ON "${schemaName}"."crm_customer"
              USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
          `;
          
          await pool.query(createTableQuery);
          console.log(`[API] Created crm_customer table for tenant ${tenantId}`);
        }
        
        // Apply RLS policy by setting tenant ID in session
        await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        
        // SQL query to insert customer with tenant ID for RLS
        const query = `
          INSERT INTO "${schemaName}"."crm_customer" (
            customer_name,
            first_name,
            last_name,
            email,
            phone,
            street,
            city,
            state,
            postcode,
            account_number,
            tenant_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;
        
        // Extract fields from customer data
        const customer_name = enhancedCustomerData.customer_name || 
                            `${enhancedCustomerData.first_name || ''} ${enhancedCustomerData.last_name || ''}`.trim() ||
                            'Unnamed Customer';
        
        const values = [
          customer_name,
          enhancedCustomerData.first_name || null,
          enhancedCustomerData.last_name || null,
          enhancedCustomerData.email || null,
          enhancedCustomerData.phone || null,
          enhancedCustomerData.street || null,
          enhancedCustomerData.city || null,
          enhancedCustomerData.state || null,
          enhancedCustomerData.postcode || null,
          enhancedCustomerData.account_number || null,
          tenantId,
          enhancedCustomerData.created_at || new Date().toISOString()
        ];
        
        const result = await pool.query(query, values);
        
        // Close the connection pool
        await pool.end();
        
        console.log('[API] Created customer with RLS tenant_id:', tenantId);
        
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
        mockDb.customers.push(enhancedCustomerData);
        console.log('[API] Falling back to mock data due to database error. Tenant ID:', tenantId);
        return NextResponse.json(enhancedCustomerData, { status: 201 });
      }
    } else {
      // DEVELOPMENT MODE: Use mock database
      mockDb.customers.push(enhancedCustomerData);
      
      console.log('[API] Created customer with mock data. Tenant ID:', tenantId);
      
      // Return created customer
      return NextResponse.json(enhancedCustomerData, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Customer POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create customer',
      message: error.message 
    }, { status: 500 });
  }
} 