/**
 * Central database connector utility with configuration management
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Singleton pool instance
let _pool = null;

// Configuration
let _config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pyfactor',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection
};

// If there's a local config file, load it
try {
  const configPath = path.join(process.cwd(), 'db.config.json');
  if (fs.existsSync(configPath)) {
    const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    _config = { ..._config, ...localConfig };
    console.log('[Database] Loaded local database configuration from db.config.json');
  }
} catch (error) {
  console.warn('[Database] Error loading local database configuration:', error.message);
}

/**
 * Get or create the database connection pool
 * @returns {Pool} PG connection pool
 */
export function getPool() {
  if (!_pool) {
    try {
      _pool = new Pool(_config);
      console.log('[Database] Created connection pool with config:', {
        host: _config.connectionString?.split('@')[1]?.split(':')[0] || _config.host,
        database: _config.connectionString?.split('/')[3] || _config.database,
        user: _config.user ? '*** (masked)' : undefined,
        ssl: !!_config.ssl,
        max: _config.max,
      });
      
      // Add error handler
      _pool.on('error', (err, client) => {
        console.error('[Database] Unexpected error on idle client:', err);
      });
    } catch (error) {
      console.error('[Database] Failed to create connection pool:', error.message);
      throw error;
    }
  }
  return _pool;
}

/**
 * Reconfigure the database connection
 * @param {Object} config New configuration options
 */
export function configureDatabase(config) {
  // Save previous config for error handling
  const previousConfig = { ..._config };
  
  try {
    // Update configuration
    _config = { ..._config, ...config };
    
    // Close existing pool if it exists
    if (_pool) {
      _pool.end().catch(err => console.warn('[Database] Error ending pool:', err.message));
      _pool = null;
    }
    
    // Initialize new pool
    getPool();
    
    console.log('[Database] Reconfigured database connection');
    return true;
  } catch (error) {
    console.error('[Database] Error reconfiguring database:', error.message);
    
    // Rollback to previous config
    _config = previousConfig;
    if (_pool) {
      _pool.end().catch(err => console.warn('[Database] Error ending pool after reconfiguration failure:', err.message));
      _pool = null;
    }
    
    getPool();
    return false;
  }
}

/**
 * Execute a query with the connection pool
 * @param {string} text SQL query text
 * @param {Array} params Query parameters
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params = [], options = {}) {
  const pool = getPool();
  
  const start = Date.now();
  const requestId = options.requestId || `query-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  if (options.debug) {
    console.log(`[Database] [${requestId}] Executing query: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    if (params.length) {
      console.log(`[Database] [${requestId}] Parameters:`, params);
    }
  }
  
  try {
    const result = await pool.query(text, params);
    
    const duration = Date.now() - start;
    if (options.debug || duration > 500) {
      console.log(`[Database] [${requestId}] Query completed in ${duration}ms, returned ${result.rowCount} rows`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Database] [${requestId}] Query error after ${duration}ms:`, error.message);
    
    if (options.debug) {
      console.error(`[Database] [${requestId}] Failed query:`, { text, params });
    }
    
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback Function that receives client and executes queries
 * @param {Object} options Additional options
 * @returns {Promise<any>} Result of the transaction
 */
export async function transaction(callback, options = {}) {
  const pool = getPool();
  const client = await pool.connect();
  const requestId = options.requestId || `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    if (options.debug) {
      console.log(`[Database] [${requestId}] Starting transaction`);
    }
    
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    
    if (options.debug) {
      console.log(`[Database] [${requestId}] Transaction committed successfully`);
    }
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[Database] [${requestId}] Transaction rolled back due to error:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a schema if it doesn't exist
 * @param {string} schemaName Name of the schema to create
 * @param {Object} options Additional options
 * @returns {Promise<boolean>} True if schema was created, false if it already existed
 */
export async function ensureSchema(schemaName, options = {}) {
  const { debug, requestId } = options;
  
  try {
    // Check if schema exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE id = $1 -- RLS: Using tenant_id instead of schema_name
      )
    `;
    const checkResult = await query(checkQuery, [schemaName], { debug, requestId });
    
    if (checkResult.rows[0]?.exists) {
      if (debug) {
        console.log(`[Database] [${requestId}] Schema ${schemaName} already exists`);
      }
      return false;
    }
    
    // Create schema
    const createQuery = `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`;
    await query(createQuery, [], { debug, requestId });
    
    if (debug) {
      console.log(`[Database] [${requestId}] Schema ${schemaName} created`);
    }
    
    return true;
  } catch (error) {
    console.error(`[Database] [${requestId}] Error ensuring schema ${schemaName}:`, error.message);
    throw error;
  }
}

/**
 * Create a table if it doesn't exist
 * @param {string} schemaName Schema name
 * @param {string} tableName Table name
 * @param {string} tableDefinition SQL table definition
 * @param {Object} options Additional options
 * @returns {Promise<boolean>} True if table was created, false if it already existed
 */
export async function ensureTable(schemaName, tableName, tableDefinition, options = {}) {
  const { debug, requestId } = options;
  
  try {
    // Ensure schema exists
    await ensureSchema(schemaName, { debug, requestId });
    
    // Check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      )
    `;
    const checkResult = await query(checkQuery, [schemaName, tableName], { debug, requestId });
    
    if (checkResult.rows[0]?.exists) {
      if (debug) {
        console.log(`[Database] [${requestId}] Table ${schemaName}.${tableName} already exists`);
      }
      return false;
    }
    
    // Create table
    const createQuery = `
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (
        ${tableDefinition}
      )
    `;
    await query(createQuery, [], { debug, requestId });
    
    if (debug) {
      console.log(`[Database] [${requestId}] Table ${schemaName}.${tableName} created`);
    }
    
    return true;
  } catch (error) {
    console.error(`[Database] [${requestId}] Error ensuring table ${schemaName}.${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Ensure the products table exists for a tenant
 * @param {string} schemaName Schema name (usually tenant_id)
 * @param {Object} options Additional options
 * @returns {Promise<boolean>} True if table was created, false if it already existed
 */
export async function ensureProductsTable(schemaName, options = {}) {
  const tableDefinition = `
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    for_sale BOOLEAN DEFAULT TRUE,
    for_rent BOOLEAN DEFAULT FALSE,
    sku VARCHAR(100),
    category VARCHAR(100),
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `;
  
  return ensureTable(schemaName, 'products', tableDefinition, options);
}

/**
 * Ensure the inventory_product table exists in the public schema
 * @param {object} client - Optional client to use in transaction
 * @param {object} options - Options for database operation
 * @returns {Promise<boolean>} - Whether the table was created
 */
async function ensureInventoryProductTable(client, options = {}) {
  const queryClient = client || getPool();
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  if (debug) {
    console.log(`[${requestId}] Ensuring inventory_product table exists in public schema`);
  }
  
  try {
    // Create the inventory_product table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "public"."inventory_product" (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sku VARCHAR(255),
        price NUMERIC(15, 2) DEFAULT 0,
        cost NUMERIC(15, 2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await queryClient.query(createTableQuery);
    
    if (debug) {
      console.log(`[${requestId}] inventory_product table created or verified in public schema`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error ensuring inventory_product table:`, error);
    throw error;
  }
}

/**
 * Ensures both products and inventory_product tables exist
 * @param {string} tenantSchema - Tenant schema name
 * @param {object} options - Options for database operation
 * @returns {Promise<object>} - Status of table creation
 */
async function ensureAllProductTables(tenantSchema, options = {}) {
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  try {
    // Use a transaction to ensure consistency
    return await transaction(async (client) => {
      // Ensure both tables exist
      const tenantTableStatus = await ensureProductsTable(tenantSchema, options);
      const inventoryTableStatus = await ensureInventoryProductTable(client, options);
      
      if (debug) {
        console.log(`[${requestId}] All product tables verified:`, {
          tenantTable: tenantTableStatus,
          inventoryTable: inventoryTableStatus
        });
      }
      
      return {
        tenantTable: tenantTableStatus,
        inventoryTable: inventoryTableStatus
      };
    });
  } catch (error) {
    console.error('Error ensuring all product tables:', error);
    throw error;
  }
}

/**
 * Close the database connection pool
 */
export async function closePool() {
  if (_pool) {
    try {
      await _pool.end();
      _pool = null;
      console.log('[Database] Connection pool closed');
    } catch (error) {
      console.error('[Database] Error closing connection pool:', error.message);
      throw error;
    }
  }
}

/**
 * Get a client from the pool
 * @returns {Promise<PoolClient>} Database client
 */
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

// Export the database functions
export {
  query,
  getClient,
  transaction,
  ensureSchema,
  ensureTable,
  ensureProductsTable,
  ensureInventoryProductTable,
  ensureAllProductTables,
  configureDatabase,
  closePool,
  getPool,
}; 