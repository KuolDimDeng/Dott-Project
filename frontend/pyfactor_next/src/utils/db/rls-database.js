/**
 * Database utility functions for RLS-based multi-tenant applications
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool;

// Add initialization lock
let rlsInitializing = false;
let rlsInitialized = false;
let initializationPromise = null;

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
    console.error(`[${requestId}] CRITICAL: No tenant ID provided for RLS context!`);
    throw new Error('Tenant ID is required for data access');
  }
  
  // Strict validation to ensure tenant ID format is safe
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    console.error(`[${requestId}] SECURITY VIOLATION: Invalid tenant ID format: ${tenantId}`);
    throw new Error('Invalid tenant ID format');
  }
  
  try {
    // First ensure the parameter exists at the PostgreSQL level
    await client.query(`
      SELECT set_config('app.current_tenant_id', '', false);
    `);
    
    // Reset tenant context first to prevent any lingering values
    await client.query(`RESET app.current_tenant_id`);
    
    // Use SET LOCAL for transaction scope to isolate between requests
    await client.query(`SET LOCAL app.current_tenant_id TO '${tenantId}'`);
    
    // Always verify the setting was correctly applied
    const verifyResult = await client.query(`SELECT current_setting('app.current_tenant_id', true) as tenant_id`);
    const currentTenantId = verifyResult.rows[0]?.tenant_id;
    
    if (debug) {
      console.log(`[${requestId}] Set tenant context for RLS: ${tenantId} (verified: ${currentTenantId || 'empty'})`);
    }
    
    // Check if the parameter is not set or empty
    if (!currentTenantId || currentTenantId === '') {
      console.log(`[${requestId}] Tenant context is empty, attempting to create parameter`);
      
      // Try to create the parameter if it doesn't exist
      try {
        // Create the parameter at session level
        await client.query(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`);
        
        // Verify again
        const retryResult = await client.query(`SELECT current_setting('app.current_tenant_id', true) as tenant_id`);
        const retryTenantId = retryResult.rows[0]?.tenant_id;
        
        if (retryTenantId !== tenantId) {
          console.error(`[${requestId}] SECURITY ERROR: Tenant context verification failed after retry, expected ${tenantId} but got ${retryTenantId || 'empty'}`);
          throw new Error(`Tenant context verification failed. Expected '${tenantId}' but got '${retryTenantId || "empty"}'`);
        }
        
        console.log(`[${requestId}] Successfully created and set tenant parameter to ${retryTenantId}`);
      } catch (innerError) {
        console.error(`[${requestId}] Error creating tenant parameter:`, innerError);
        throw new Error('Failed to create tenant context parameter');
      }
    }
    // Strict verification - tenant ID must match exactly
    else if (currentTenantId !== tenantId) {
      console.error(`[${requestId}] SECURITY ERROR: Tenant context verification failed, expected ${tenantId} but got ${currentTenantId || 'empty'}`);
      
      // Immediately reset to prevent data leakage
      await client.query(`RESET app.current_tenant_id`);
      
      // Throw error to prevent the query from executing with incorrect tenant context
      throw new Error(`Tenant context verification failed. Expected '${tenantId}' but got '${currentTenantId || "empty"}'`);
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
  
  // Check for missing tenant ID - this is critical for data isolation
  if (!tenantId && !options.skipTenantCheck) {
    console.error(`[${requestId}] SECURITY ERROR: Attempt to run query without tenant ID`);
    throw new Error('Tenant ID is required for data access');
  }
  
  // Create a new client for this query if not in a transaction
  const newClient = !options.client ? await pool.connect() : null;
  const queryClient = newClient || client;
  
  try {
    if (debug) {
      console.log(`[${requestId}] Executing query with tenant ${tenantId}:`, { text, params });
    }
    
    // Set tenant context for every query, even in transactions
    if (tenantId) {
      await setTenantContext(queryClient, tenantId, options);
    }
    
    // Execute the query with abort signal if provided
    const result = signal
      ? await Promise.race([
          queryClient.query(text, params),
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('Query aborted by timeout'));
            });
          })
        ])
      : await queryClient.query(text, params);
    
    if (debug) {
      console.log(`[${requestId}] Query result for tenant ${tenantId}:`, {
        rowCount: result.rowCount,
        fields: result.fields?.map(f => f.name)
      });
    }
    
    return result;
  } catch (error) {
    console.error(`[${requestId}] Query error for tenant ${tenantId}:`, error);
    throw error;
  } finally {
    // Release the client if we created a new one
    if (newClient) {
      newClient.release();
    }
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
  
  // If already initialized, return immediately
  if (rlsInitialized) {
    if (debug) {
      console.log(`[${requestId}] RLS already initialized, skipping`);
    }
    return;
  }
  
  // If another initialization is in progress, wait for it
  if (rlsInitializing && initializationPromise) {
    if (debug) {
      console.log(`[${requestId}] RLS initialization already in progress, waiting...`);
    }
    try {
      await initializationPromise;
      return;
    } catch (error) {
      console.error(`[${requestId}] Error waiting for RLS initialization:`, error);
      // Continue with our own initialization as fallback
    }
  }
  
  // Set initialization flag and create promise
  rlsInitializing = true;
  initializationPromise = (async () => {
    const client = await getClient();
    
    try {
      if (debug) {
        console.log(`[${requestId}] Initializing RLS policies`);
      }
      
      // Add mutex lock with advisory lock in PostgreSQL
      await client.query('SELECT pg_advisory_lock(123456789)');
      
      // Ensure the custom parameter is available in PostgreSQL
      try {
        await client.query(`
          -- Create the app.current_tenant_id custom parameter if it doesn't exist
          DO $$
          BEGIN
            -- Check if the parameter already exists
            BEGIN
              PERFORM current_setting('app.current_tenant_id');
            EXCEPTION
              WHEN undefined_object THEN
                -- Parameter doesn't exist, so initialize it
                PERFORM set_config('app.current_tenant_id', '', false);
            END;
          END;
          $$;
        `);
        
        if (debug) {
          console.log(`[${requestId}] Ensured app.current_tenant_id parameter exists in PostgreSQL`);
        }
      } catch (paramError) {
        console.error(`[${requestId}] Error ensuring parameter exists:`, paramError);
        // Continue with initialization as the parameter might already exist
      }
      
      // Check if RLS function already exists to avoid unnecessary creation
      const functionExists = await client.query(`
        SELECT COUNT(*) FROM pg_proc WHERE proname = 'current_tenant_id'
      `);
      
      if (parseInt(functionExists.rows[0].count) === 0) {
        // Create the function to get the current tenant ID
        await client.query(`
          CREATE OR REPLACE FUNCTION current_tenant_id()
          RETURNS TEXT AS $$
          BEGIN
            RETURN current_setting('app.current_tenant_id', TRUE);
          END;
          $$ LANGUAGE plpgsql;
        `);
      }
      
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
      
      // Check if RLS is already enabled
      const rlsEnabled = await client.query(`
        SELECT relrowsecurity FROM pg_class
        WHERE relname = 'inventory_product' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      // Enable RLS on the tables if needed
      if (!rlsEnabled.rows[0] || !rlsEnabled.rows[0].relrowsecurity) {
        await client.query(`
          ALTER TABLE public.inventory_product ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sales_product ENABLE ROW LEVEL SECURITY;
        `);
      }
      
      // Create the RLS policies
      await client.query(`
        DROP POLICY IF EXISTS inventory_product_tenant_isolation ON public.inventory_product;
        CREATE POLICY inventory_product_tenant_isolation ON public.inventory_product
          USING (
            -- Strict tenant isolation with explicit checks
            tenant_id IS NOT NULL AND
            tenant_id <> '' AND
            current_tenant_id() IS NOT NULL AND
            current_tenant_id() <> '' AND
            current_tenant_id() <> 'unset' AND
            tenant_id = current_tenant_id()
          );
          
        DROP POLICY IF EXISTS sales_product_tenant_isolation ON public.sales_product;
        CREATE POLICY sales_product_tenant_isolation ON public.sales_product
          USING (
            -- Strict tenant isolation with explicit checks
            tenant_id IS NOT NULL AND
            tenant_id <> '' AND
            current_tenant_id() IS NOT NULL AND
            current_tenant_id() <> '' AND
            current_tenant_id() <> 'unset' AND
            tenant_id = current_tenant_id()
          );
          
        -- Add index on tenant_id for better performance with RLS
        CREATE INDEX IF NOT EXISTS idx_inventory_product_tenant_id ON public.inventory_product(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_sales_product_tenant_id ON public.sales_product(tenant_id);
      `);
      
      // Release advisory lock
      await client.query('SELECT pg_advisory_unlock(123456789)');
      
      if (debug) {
        console.log(`[${requestId}] RLS policies initialized successfully`);
      }
      
      // Mark as initialized
      rlsInitialized = true;
    } catch (error) {
      console.error(`[${requestId}] Error initializing RLS:`, error);
      // Try to release lock even on error
      try {
        await client.query('SELECT pg_advisory_unlock(123456789)');
      } catch (unlockError) {
        // Ignore unlock errors
      }
      throw error;
    } finally {
      rlsInitializing = false;
      client.release();
    }
  })();
  
  // Wait for initialization to complete
  try {
    await initializationPromise;
  } catch (error) {
    // Reset the initialization promise on error
    initializationPromise = null;
    throw error;
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