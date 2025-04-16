import { NextResponse } from 'next/server';
import { applyRLS, verifyTenantId, getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
import { v4 as uuidv4 } from 'uuid';
// Only import pg in production, otherwise it's not needed
const isProd = process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true';
let Pool;
if (isProd) {
  import('pg').then((pg) => {
    Pool = pg.Pool;
  }).catch(e => console.error('Failed to load pg module:', e));
}

// Import necessary utilities for secure tenant ID
import { extractTenantId } from '@/utils/request-utils';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

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
  const requestId = uuidv4();
  
  try {
    // Extract tenant ID using the secure utility function
    const tenantInfo = await extractTenantId(request);
    
    // Use the same tenant ID extraction logic as the product API
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request for customers GET`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Format tenant ID to ensure it's a valid UUID
    const formattedTenantId = formatTenantId(finalTenantId);
    
    logger.info(`[${requestId}] Listing customers for tenant: ${formattedTenantId}`);
    
    // First check AppCache for better performance
    const cacheKey = `customers_${formattedTenantId}`;
    const cachedCustomers = getCacheValue(cacheKey);
    
    if (cachedCustomers) {
      logger.info(`[${requestId}] Retrieved customers from AppCache for tenant: ${formattedTenantId}`);
      return NextResponse.json(cachedCustomers);
    }
    
    // For development or when DB connection fails, return mock data
    if (process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA === 'true') {
      logger.info(`[${requestId}] Using mock customer data for development`);
      const mockCustomers = mockDb.customers.filter(c => 
        c.tenant_id === formattedTenantId || formattedTenantId === formatTenantId('default-tenant')
      );
      
      // Cache the mock data
      setCacheValue(cacheKey, mockCustomers, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL
      
      return NextResponse.json(mockCustomers);
    }
    
    // Import the RLS database utility like in the product section
    const db = await import('@/utils/db/rls-database');
    
    // Ensure crm_customer table exists and has proper RLS policies
    await ensureCrmCustomerTable(formattedTenantId, requestId);
    
    // Query customers with RLS
    const queryResults = await db.query(
      `SELECT * FROM public.crm_customer WHERE tenant_id = $1 ORDER BY business_name ASC`,
      [formattedTenantId],
      {
        requestId,
        tenantId: formattedTenantId,
        debug: true
      }
    );
    
    // Format the results
    const customers = queryResults.rows;
    logger.info(`[${requestId}] Retrieved ${customers.length} customers using RLS for tenant ${formattedTenantId}`);
    
    // Cache the results in AppSync cache
    setCacheValue(cacheKey, customers, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL
    
    return NextResponse.json(customers);
  } catch (error) {
    logger.error(`[${requestId}] Database error:`, error);
    
    // Return fallback data
    logger.info(`[${requestId}] Returning fallback customer data due to database error`);
    
    return NextResponse.json(mockDb.customers.filter(c => 
      c.tenant_id === formatTenantId(getDefaultTenantId()) || formatTenantId(getDefaultTenantId()) === formatTenantId('default-tenant')
    ), {
      headers: {
        'X-Fallback-Data': 'true',
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Make sure tenant ID is always a valid UUID
const formatTenantId = (tenantId) => {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
  return isValidUUID ? tenantId : uuidv4();
};

/**
 * Ensure crm_customer table exists with proper RLS
 */
async function ensureCrmCustomerTable(tenantId, requestId) {
  try {
    logger.info(`[${requestId}] Ensuring crm_customer table exists for tenant ${tenantId}`);
    
    // Import db from rls-database
    const db = await import('@/utils/db/rls-database');
    
    const client = await db.getClient();
    
    try {
      // Create the crm_customer table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.crm_customer (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          business_name VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          website VARCHAR(255),
          street VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(100),
          postcode VARCHAR(20),
          country VARCHAR(100),
          billing_country VARCHAR(100),
          billing_state VARCHAR(100),
          account_number VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Check if RLS is already enabled
      const rlsEnabled = await client.query(`
        SELECT relrowsecurity FROM pg_class
        WHERE relname = 'crm_customer' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      // Enable RLS on the table if needed
      if (!rlsEnabled.rows[0] || !rlsEnabled.rows[0].relrowsecurity) {
        await client.query(`
          ALTER TABLE public.crm_customer ENABLE ROW LEVEL SECURITY;
        `);
      }
      
      // Attempt to repair any data issues with tenant_id
      await fixTenantDataIntegrity(client, tenantId, requestId);
      
      // Check if the policy already exists
      const policyExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'crm_customer' AND policyname = 'tenant_isolation_policy'
        )
      `);
      
      // Create the policy if it doesn't exist
      if (!policyExists.rows[0].exists) {
        await client.query(`
          -- Create RLS function with debugging capabilities
          CREATE OR REPLACE FUNCTION tenant_isolation_debug(record_tenant_id UUID, debug BOOLEAN DEFAULT FALSE)
          RETURNS BOOLEAN AS $$
          DECLARE
              current_tenant UUID;
              result BOOLEAN;
          BEGIN
              -- Try to get current tenant with explicit cast
              BEGIN
                  current_tenant := NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
              EXCEPTION WHEN OTHERS THEN
                  current_tenant := NULL;
              END;
              
              -- Strict matching logic
              result := 
                  record_tenant_id IS NOT NULL AND
                  current_tenant IS NOT NULL AND
                  record_tenant_id = current_tenant;
                  
              -- Log details if debugging enabled
              IF debug THEN
                  RAISE NOTICE 'Tenant check: record=%, current=%, result=%', 
                      record_tenant_id, current_tenant, result;
              END IF;
              
              RETURN result;
          END;
          $$ LANGUAGE plpgsql;
        
          -- Create policy using the function
          CREATE POLICY tenant_isolation_policy ON public.crm_customer
            USING (tenant_isolation_debug(tenant_id, FALSE));
        `);
      } else {
        // Update existing policy to fix any existing deployments
        await client.query(`
          -- Create RLS function with debugging capabilities
          CREATE OR REPLACE FUNCTION tenant_isolation_debug(record_tenant_id UUID, debug BOOLEAN DEFAULT FALSE)
          RETURNS BOOLEAN AS $$
          DECLARE
              current_tenant UUID;
              result BOOLEAN;
          BEGIN
              -- Try to get current tenant with explicit cast
              BEGIN
                  current_tenant := NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
              EXCEPTION WHEN OTHERS THEN
                  current_tenant := NULL;
              END;
              
              -- Strict matching logic
              result := 
                  record_tenant_id IS NOT NULL AND
                  current_tenant IS NOT NULL AND
                  record_tenant_id = current_tenant;
                  
              -- Log details if debugging enabled
              IF debug THEN
                  RAISE NOTICE 'Tenant check: record=%, current=%, result=%', 
                      record_tenant_id, current_tenant, result;
              END IF;
              
              RETURN result;
          END;
          $$ LANGUAGE plpgsql;
          
          -- Drop and recreate policy
          DROP POLICY IF EXISTS tenant_isolation_policy ON public.crm_customer;
          CREATE POLICY tenant_isolation_policy ON public.crm_customer
            USING (tenant_isolation_debug(tenant_id, FALSE));
          
          -- SECURITY FIX: Force all rows to have a valid tenant_id
          UPDATE public.crm_customer 
          SET tenant_id = '00000000-0000-0000-0000-000000000000'
          WHERE tenant_id IS NULL OR tenant_id::text = '';
        `);
      }
      
      // Create index on tenant_id if it doesn't exist
      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_customer_tenant_id_idx ON public.crm_customer (tenant_id);
      `);
      
      logger.info(`[${requestId}] crm_customer table verified with RLS`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`[${requestId}] Error ensuring crm_customer table:`, error);
    throw error;
  }
}

/**
 * Fix tenant data integrity issues by assigning correct tenant IDs
 * @param {Object} client - Database client
 * @param {string} currentTenantId - Current tenant ID
 * @param {string} requestId - Request ID for logging
 */
async function fixTenantDataIntegrity(client, currentTenantId, requestId) {
  try {
    // First, try to identify which rows belong to which tenant based on creation time
    // Get customers that might have wrong tenant IDs (created within last 7 days)
    const recentCustomers = await client.query(`
      SELECT DISTINCT tenant_id FROM public.crm_customer 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    logger.info(`[${requestId}] Found ${recentCustomers.rows.length} distinct tenant IDs in recent customers`);
    
    if (recentCustomers.rows.length < 2) {
      // No mixed tenant data, likely a new installation
      logger.info(`[${requestId}] No mixed tenant data detected, skipping repair`);
      return;
    }
    
    // Count how many customers each tenant has
    const tenantCounts = await client.query(`
      SELECT tenant_id, COUNT(*) as count FROM public.crm_customer 
      GROUP BY tenant_id
    `);
    
    logger.info(`[${requestId}] Tenant counts: ${JSON.stringify(tenantCounts.rows)}`);
    
    // If there's a security issue with tenant IDs, we need to fix it
    // Check if there are rows with NULL or empty tenant_id
    const invalidTenantRows = await client.query(`
      SELECT COUNT(*) FROM public.crm_customer 
      WHERE tenant_id IS NULL OR tenant_id::text = ''
    `);
    
    if (parseInt(invalidTenantRows.rows[0].count) > 0) {
      logger.warn(`[${requestId}] Found ${invalidTenantRows.rows[0].count} rows with invalid tenant IDs`);
      
      // Fix these rows by setting a sentinel tenant ID
      await client.query(`
        UPDATE public.crm_customer 
        SET tenant_id = '00000000-0000-0000-0000-000000000000'
        WHERE tenant_id IS NULL OR tenant_id::text = ''
      `);
      
      logger.info(`[${requestId}] Fixed invalid tenant IDs`);
    }
    
    // Debug: Get a sample of rows to validate tenant IDs
    const sampleRows = await client.query(`
      SELECT id, tenant_id, business_name, created_at 
      FROM public.crm_customer 
      LIMIT 5
    `);
    
    logger.info(`[${requestId}] Sample rows: ${JSON.stringify(sampleRows.rows)}`);
    
    // For security, add tenant isolation field in RLS policy
    await client.query(`
      ALTER TABLE public.crm_customer 
      ADD COLUMN IF NOT EXISTS tenant_isolation_check UUID GENERATED ALWAYS AS (tenant_id) STORED;
    
      CREATE INDEX IF NOT EXISTS idx_tenant_isolation_check ON public.crm_customer(tenant_isolation_check);
    `);
    
    logger.info(`[${requestId}] Added tenant isolation check field for improved security`);
    
  } catch (error) {
    logger.error(`[${requestId}] Error fixing tenant data integrity:`, error);
    // Continue with the process even if this fails
  }
}

/**
 * POST handler for customer creation with tenant-aware RLS
 */
export async function POST(request) {
  const requestId = uuidv4();
  logger.info(`[${requestId}] Customer POST request received`);
  
  try {
    // Get request body
    const customerData = await request.json();
    
    // Extract tenant ID using the secure utility function
    const tenantInfo = await extractTenantId(request);
    
    // Use the same tenant ID extraction logic as the product API
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId || customerData.tenant_id;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request for customer creation`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Format tenant ID to ensure it's a valid UUID
    const formattedTenantId = formatTenantId(finalTenantId);
    
    logger.info(`[${requestId}] Creating customer for tenant: ${formattedTenantId}`);
    
    // Ensure the crm_customer table exists with RLS
    await ensureCrmCustomerTable(formattedTenantId, requestId);
    
    // Import the RLS database utility
    const db = await import('@/utils/db/rls-database');
    
    // Generate a UUID for the customer
    const customerId = uuidv4();
    
    // Create customer with transaction to ensure consistency
    const newCustomer = await db.transaction(async (client, options) => {
      // Build the dynamic columns and values for the insert
      const columns = ['id', 'tenant_id'];
      const values = [customerId, formattedTenantId];
      const placeholders = ['$1', '$2'];
      let paramIndex = 3;
      
      // Map fields from request to database columns
      const fieldMappings = {
        'business_name': 'business_name',
        'customerName': 'business_name',
        'first_name': 'first_name',
        'last_name': 'last_name',
        'email': 'email',
        'phone': 'phone',
        'website': 'website',
        'street': 'street',
        'city': 'city',
        'state': 'state',
        'billingState': 'billing_state',
        'billingCountry': 'billing_country',
        'postcode': 'postcode',
        'country': 'country',
        'account_number': 'account_number',
        'notes': 'notes'
      };
      
      // Add each field if it exists in the request
      for (const [requestField, dbColumn] of Object.entries(fieldMappings)) {
        if (customerData[requestField] !== undefined) {
          columns.push(dbColumn);
          values.push(customerData[requestField]);
          placeholders.push(`$${paramIndex++}`);
        }
      }
      
      // Add created_at and updated_at
      columns.push('created_at', 'updated_at');
      placeholders.push('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP');
      
      // Create the SQL query
      const query = `
        INSERT INTO public.crm_customer (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      
      logger.info(`[${requestId}] Executing customer insert with tenant context: ${formattedTenantId}`);
      
      const result = await db.query(query, values, {
        ...options,
        client,
        requestId,
        tenantId: formattedTenantId
      });
      
      return result.rows[0];
    }, {
      requestId,
      tenantId: formattedTenantId,
      debug: true
    });
    
    logger.info(`[${requestId}] Customer created successfully: ${newCustomer.id}`);
    
    // Invalidate cache for this tenant's customers
    const cacheKey = `customers_${formattedTenantId}`;
    setCacheValue(cacheKey, null);
    
    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    logger.error(`[${requestId}] Error creating customer:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create customer', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 