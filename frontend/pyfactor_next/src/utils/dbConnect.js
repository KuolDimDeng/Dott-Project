/**
 * Database connection module for PostgreSQL
 */

import { Pool } from 'pg';
import logger from './logger';

// Singleton pool instance
let _pool = null;

// Configuration with reasonable defaults
const _config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pyfactor',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection
};

/**
 * Get or create the database connection pool
 * @returns {Pool} PG connection pool
 */
export function getPool() {
  if (!_pool) {
    try {
      _pool = new Pool(_config);
      logger.info('[Database] Created connection pool');
      
      // Add error handler
      _pool.on('error', (err, client) => {
        logger.error('[Database] Unexpected error on idle client:', err);
      });
    } catch (error) {
      logger.error('[Database] Failed to create connection pool:', error.message);
      throw error;
    }
  }
  return _pool;
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
  
  try {
    const result = await pool.query(text, params);
    
    const duration = Date.now() - start;
    if (options.debug || duration > 500) {
      logger.debug(`[Database] Query completed in ${duration}ms, returned ${result.rowCount} rows`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[Database] Query error after ${duration}ms:`, error.message);
    
    throw error;
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

/**
 * Close the database pool
 */
export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info('[Database] Connection pool closed');
  }
} 