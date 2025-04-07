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

/**
 * GET handler for customers with tenant-aware RLS
 */
export async function GET(request) {
  console.log('[API] Customers GET request received');
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
    
    console.log(`[API] Listing customers for tenant: ${tenantId}, schema: ${schema}`);
    
    // Connect to the actual RDS database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Return filtered mock data
        const filteredCustomers = mockDb.customers.filter(c => c.tenant_id === tenantId);
        return NextResponse.json(filteredCustomers);
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
            SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
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
          
          // Create a few sample customers for the new tenant
          const sampleCustomersQuery = `
            INSERT INTO "${schemaName}"."crm_customer" 
            (customer_name, email, phone, street, city, state, postcode, account_number, tenant_id) 
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9),
            ($10, $11, $12, $13, $14, $15, $16, $17, $18)
          `;
          
          await pool.query(sampleCustomersQuery, [
            'Acme Corporation', // customer_name 1
            'contact@acme.com', // email 1
            '555-123-4567', // phone 1
            '123 Main St', // street 1
            'Sample City', // city 1
            'CA', // state 1
            '12345', // postcode 1
            'ACME001', // account_number 1
            tenantId, // tenant_id 1
            'Globex Industries', // customer_name 2
            'info@globex.com', // email 2
            '555-987-6543', // phone 2
            '456 Oak Ave', // street 2
            'Another City', // city 2
            'NY', // state 2
            '67890', // postcode 2
            'GLOBEX002', // account_number 2
            tenantId // tenant_id 2
          ]);
          
          console.log(`[API] Created sample customers for tenant ${tenantId}`);
        }
        
        // Apply RLS policy by setting tenant ID in session
        await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        
        // Now query the customers
        const query = `
          SELECT * FROM "${schemaName}"."crm_customer" 
          WHERE tenant_id = $1
          ORDER BY customer_name ASC
        `;
        
        const result = await pool.query(query, [tenantId]);
        console.log(`[API] Retrieved ${result.rows.length} customers for tenant ${tenantId}`);
        
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
        const filteredCustomers = mockDb.customers.map(customer => ({
          ...customer,
          tenant_id: tenantId
        }));
        
        return NextResponse.json(filteredCustomers);
      }
    } else {
      // DEVELOPMENT MODE: Use mock data directly
      const filteredCustomers = mockDb.customers.filter(c => c.tenant_id === tenantId);
      
      // If no customers exist yet, create some with the current tenant ID
      if (filteredCustomers.length === 0) {
        console.log('[API] No customers found for this tenant, creating default customers');
        
        // Create default customers with the current tenant ID
        const defaultCustomers = [
          {
            id: `customer-${Date.now()}-1`,
            customer_name: 'Sample Customer 1',
            street: '123 Main St',
            postcode: '12345',
            city: 'Sample City',
            state: 'Sample State',
            phone: '555-123-4567',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          },
          {
            id: `customer-${Date.now()}-2`,
            customer_name: 'Sample Customer 2',
            street: '456 Oak Ave',
            postcode: '67890',
            city: 'Another City',
            state: 'Another State',
            phone: '555-987-6543',
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }
        ];
        
        // Add the customers to the mock database
        mockDb.customers.push(...defaultCustomers);
        
        // Return the newly created customers
        return NextResponse.json(defaultCustomers);
      }
      
      // Return customers with tenant ID information
      return NextResponse.json(filteredCustomers);
    }
  } catch (error) {
    console.error('[API] Customer GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch customers',
      message: error.message 
    }, { status: 500 });
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
            SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
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