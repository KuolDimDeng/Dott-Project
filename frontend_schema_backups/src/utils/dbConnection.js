/**
 * Database connection utilities with RLS tenant ID support
 * For both production and development modes
 */
import postgres from 'postgres';
import { logger } from './logger';

// Connection pool with RLS support
let sqlPool = null;

/**
 * Gets a database connection with RLS tenant ID set
 * @param {string} tenantId - The tenant ID for RLS
 * @param {object} options - Additional connection options
 * @returns {Object} Database client with RLS set
 */
export const getDbConnection = async (tenantId, options = {}) => {
  try {
    // Initialize pool if needed
    if (!sqlPool) {
      sqlPool = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        ...options
      });
      logger.debug('[DB] Connection pool initialized');
    }
    
    // Create client from pool
    const client = sqlPool;
    
    // Set RLS tenant ID
    if (tenantId) {
      logger.debug(`[DB] Setting RLS tenant ID: ${tenantId}`);
      await client`SET LOCAL rls.tenant_id = ${tenantId}`;
    } else {
      logger.warn('[DB] No tenant ID provided for RLS');
    }
    
    return client;
  } catch (error) {
    logger.error('[DB] Error getting database connection:', {
      error: error.message,
      stack: error.stack,
      tenantId
    });
    throw error;
  }
};

/**
 * Gets a development mode database connection with simulated RLS
 * Use this in development to test RLS without a real database
 * @param {string} tenantId - The tenant ID for development mode
 * @returns {Object} Mock database client with RLS-like behavior
 */
export const getDevDbConnection = (tenantId) => {
  if (!tenantId) {
    logger.warn('[DB] No tenant ID provided for development DB');
    tenantId = 'dev-tenant-default';
  }
  
  logger.debug(`[DB] Creating development DB client with tenant: ${tenantId}`);
  
  // Store data in memory by tenant ID
  if (!global.__DEV_DB_DATA) {
    global.__DEV_DB_DATA = {};
  }
  
  if (!global.__DEV_DB_DATA[tenantId]) {
    global.__DEV_DB_DATA[tenantId] = {
      users: [],
      business: {},
      settings: {},
      products: [],
      transactions: []
    };
  }
  
  const data = global.__DEV_DB_DATA[tenantId];
  
  // Mock SQL client with tenant isolation
  return {
    // Basic query function that enforces tenant isolation
    async query(sql, params = []) {
      logger.debug(`[DevDB] Query for tenant ${tenantId}:`, { sql, params });
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Very simple mock implementation - expand as needed
      if (sql.includes('SELECT * FROM users')) {
        return { rows: data.users };
      }
      
      if (sql.includes('INSERT INTO users')) {
        const user = params[0];
        data.users.push(user);
        return { rowCount: 1 };
      }
      
      // Default response
      return { rows: [], rowCount: 0 };
    },
    
    // Tagged template support like postgres.js
    async sql(strings, ...values) {
      const query = strings.reduce((result, str, i) => 
        result + str + (i < values.length ? values[i] : ''), '');
        
      return this.query(query, values);
    },
    
    // Support postgres.js style tagged templates
    async raw(strings, ...values) {
      return this.sql(strings, ...values);
    },
    
    // Method to directly manipulate dev data
    getDevData() {
      return data;
    },
    
    // Close connection (no-op in dev)
    async end() {
      logger.debug(`[DevDB] Closed connection for tenant ${tenantId}`);
      return true;
    }
  };
};

/**
 * Gets the appropriate database connection based on environment
 * @param {string} tenantId - The tenant ID for RLS
 * @param {object} options - Additional options
 * @param {boolean} options.useRealDb - Force using real database even in development
 * @returns {Object} Database client
 */
export const getDatabase = async (tenantId, options = {}) => {
  // Check for tenant ID from environment variable (highest priority)
  if (process.env.DEV_TENANT_ID && !tenantId) {
    tenantId = process.env.DEV_TENANT_ID;
    logger.debug('[DB] Using tenant ID from environment variable', { tenantId });
  }
  
  // Always use real DB
  const useRealDb = true;
  
  logger.debug('[DB] Using real database connection', { tenantId });
  return getDbConnection(tenantId, options);
}; 