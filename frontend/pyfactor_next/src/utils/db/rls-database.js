/**
 * Database utility functions for RLS-based multi-tenant applications
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool;

/**
 * Get database configuration from environment or local file
 * @returns {Object} Database configuration
 */
function getDatabaseConfig() {
  try {
    // Check if we have a local config file
    const configPath = path.join(process.cwd(), 'db.config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      console.log('[Database] Loaded local database configuration from db.config.json');
      return config;
    }
  } catch (error) {
    console.error('[Database] Error loading local database configuration:', error);
  }

  // Fall back to environment variables
  return {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pyfactor',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
}

/**
 * Get or create the database pool
 * @returns {Pool} Database pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool(getDatabaseConfig());
  }
  return pool;
}

/**
 * Set the current tenant ID for RLS in the database session
 * @param {Object} client - Database client
 * @param {string} tenantId - Tenant ID to set
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function setTenantContext(client, tenantId, options = {}) {
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  // Validate the tenant ID to prevent SQL injection and ensure we have a valid ID
  if (!tenantId) {
    if (debug) {
      console.log(`[${requestId}] No tenant ID provided, not setting RLS context`);
    }
    return;
  }
  
  // Basic validation to ensure tenant ID format is safe
  if (!/^[0-9a-zA-Z_\-]+$/i.test(tenantId)) {
    console.error(`[${requestId}] Invalid tenant ID format: ${tenantId}`);
    throw new Error('Invalid tenant ID format');
  }
  
  try {
    await client.query(`SET LOCAL app.current_tenant_id TO '${tenantId}'`);
    
    // Verify the setting was applied
    const verifyResult = await client.query(`SELECT current_setting('app.current_tenant_id', true) as tenant_id`);
    const currentTenantId = verifyResult.rows[0]?.tenant_id;
    
    if (debug) {
      console.log(`[${requestId}] Set tenant context for RLS: ${tenantId} (verified: ${currentTenantId})`);
    }
    
    if (currentTenantId !== tenantId) {
      console.warn(`[${requestId}] Tenant context verification failed, expected ${tenantId} but got ${currentTenantId}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error setting tenant context:`, error);
    throw error;
  }
}

/**
 * Execute a SQL query with automatic tenant context
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Options for the query
 * @returns {Promise<Object>} Query result
 */
async function query(text, params = [], options = {}) {
  const pool = getPool();
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  const signal = options.signal;
  
  // Get the client (either provided or from pool)
  const client = options.client || pool;
  
  // Get the tenant ID for RLS
  const tenantId = options.tenantId || null;
  
  try {
    if (debug) {
      console.log(`[${requestId}] Executing query:`, { text, params });
    }
    
    // Set tenant context if this is a new query and not part of a transaction
    if (tenantId && !options.client) {
      await setTenantContext(client, tenantId, options);
    }
    
    // Execute the query with abort signal if provided
    const result = signal
      ? await Promise.race([
          client.query(text, params),
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('Query aborted by timeout'));
            });
          })
        ])
      : await client.query(text, params);
    
    if (debug) {
      console.log(`[${requestId}] Query result:`, {
        rowCount: result.rowCount,
        fields: result.fields?.map(f => f.name)
      });
    }
    
    return result;
  } catch (error) {
    console.error(`[${requestId}] Query error:`, error);
    throw error;
  }
}

/**
 * Get a client from the pool
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Execute a transaction with automatic tenant context
 * @param {Function} callback - Callback function that receives a client and executes queries
 * @param {Object} options - Options for the transaction
 * @returns {Promise<any>} Result of the callback
 */
async function transaction(callback, options = {}) {
  const client = await getClient();
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  const tenantId = options.tenantId || null;
  
  try {
    if (debug) {
      console.log(`[${requestId}] Starting transaction`);
    }
    
    await client.query('BEGIN');
    
    // Set tenant context for the transaction if provided
    if (tenantId) {
      await setTenantContext(client, tenantId, options);
    }
    
    // Pass client to callback with options to ensure tenant context is maintained
    const newOptions = { ...options, client, inTransaction: true };
    const result = await callback(client, newOptions);
    
    await client.query('COMMIT');
    
    if (debug) {
      console.log(`[${requestId}] Transaction committed`);
    }
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (debug) {
      console.log(`[${requestId}] Transaction rolled back due to error: ${error.message}`);
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize the RLS policies for multi-tenancy
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function initializeRLS(options = {}) {
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  const client = await getClient();
  
  try {
    if (debug) {
      console.log(`[${requestId}] Initializing RLS policies`);
    }
    
    // Create the function to get the current tenant ID
    await client.query(`
      CREATE OR REPLACE FUNCTION current_tenant_id()
      RETURNS TEXT AS $$
      BEGIN
        RETURN current_setting('app.current_tenant_id', TRUE);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create the inventory_product table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.inventory_product (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sku VARCHAR(255),
        price NUMERIC(15, 2) DEFAULT 0,
        cost NUMERIC(15, 2) DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        for_sale BOOLEAN DEFAULT TRUE,
        for_rent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    
    // Create the sales_product table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sales_product (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        inventory_product_id UUID REFERENCES public.inventory_product(id),
        sale_price NUMERIC(15, 2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        customer_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Enable RLS on the tables
    await client.query(`
      ALTER TABLE public.inventory_product ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.sales_product ENABLE ROW LEVEL SECURITY;
    `);
    
    // Create the RLS policies
    await client.query(`
      DROP POLICY IF EXISTS inventory_product_tenant_isolation ON public.inventory_product;
      CREATE POLICY inventory_product_tenant_isolation ON public.inventory_product
        USING (
          CASE 
            WHEN current_tenant_id() IS NULL THEN FALSE
            WHEN current_tenant_id() = 'unset' THEN FALSE
            WHEN tenant_id IS NULL THEN FALSE
            ELSE tenant_id = current_tenant_id()
          END
        );
        
      DROP POLICY IF EXISTS sales_product_tenant_isolation ON public.sales_product;
      CREATE POLICY sales_product_tenant_isolation ON public.sales_product
        USING (
          CASE 
            WHEN current_tenant_id() IS NULL THEN FALSE
            WHEN current_tenant_id() = 'unset' THEN FALSE
            WHEN tenant_id IS NULL THEN FALSE
            ELSE tenant_id = current_tenant_id()
          END
        );
    `);
    
    if (debug) {
      console.log(`[${requestId}] RLS policies initialized successfully`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error initializing RLS:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ensure inventory_product table exists with RLS
 * @param {Object} options - Options
 * @returns {Promise<boolean>} Whether the table was created
 */
async function ensureInventoryProductTable(options = {}) {
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  try {
    if (debug) {
      console.log(`[${requestId}] Ensuring inventory_product table exists`);
    }
    
    // Initialize RLS and create the table if it doesn't exist
    await initializeRLS({ debug, requestId });
    
    if (debug) {
      console.log(`[${requestId}] inventory_product table verified`);
    }
    
    return true;
  } catch (error) {
    console.error(`[${requestId}] Error ensuring inventory_product table:`, error);
    throw error;
  }
}

/**
 * Configure the database with initialization options
 * @param {Object} options - Configuration options
 */
function configureDatabase(options = {}) {
  // Reset the pool if it exists
  if (pool) {
    pool.end();
    pool = null;
  }
  
  // Create a new pool with the given options
  pool = new Pool({
    ...getDatabaseConfig(),
    ...options
  });
  
  console.log('[Database] Pool configured with options:', options);
}

/**
 * Close the database pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Database] Pool closed');
  }
}

// Export all database functions
export {
  query,
  getClient,
  transaction,
  setTenantContext,
  initializeRLS,
  ensureInventoryProductTable,
  configureDatabase,
  closePool,
  getPool
}; 