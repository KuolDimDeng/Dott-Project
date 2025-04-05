/**
 * Database configuration for all tenant-related endpoints
 * Provides consistent connection settings with AWS RDS
 */

// Connection settings optimized for AWS RDS
const DB_DEFAULTS = {
  port: 5432,
  database: 'dott_main',
  // Connection settings
  connectionTimeoutMillis: 8000,
  statement_timeout: 15000,
  max: 1,
  idleTimeoutMillis: 3000
};

/**
 * Get database configuration with fallbacks
 * This ensures consistent settings across all endpoints
 * @returns {object} Database configuration
 */
export function getDbConfig() {
  console.log('Using AWS RDS database connection');
  
  // Check if SSL should be disabled
  const useSSL = process.env.DB_USE_SSL !== 'false';
  console.log(`SSL connections ${useSSL ? 'enabled' : 'disabled'}`);
  
  // Base configuration using environment variables with fallbacks
  const config = {
    user: process.env.RDS_USERNAME || process.env.DB_USER || process.env.DJANGO_DB_USER || 'dott_admin',
    password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD || process.env.DJANGO_DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    host: process.env.RDS_HOSTNAME || process.env.DB_HOST || process.env.DJANGO_DB_HOST || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || process.env.DJANGO_DB_PORT || DB_DEFAULTS.port, 10),
    database: process.env.RDS_DB_NAME || process.env.DB_NAME || process.env.DJANGO_DB_NAME || 'dott_main',
    // Connection settings
    connectionTimeoutMillis: DB_DEFAULTS.connectionTimeoutMillis,
    statement_timeout: DB_DEFAULTS.statement_timeout,
    max: DB_DEFAULTS.max,
    idleTimeoutMillis: DB_DEFAULTS.idleTimeoutMillis
  };
  
  // Log connection details (without password)
  console.log('Database connection details:', { 
    host: config.host, 
    database: config.database, 
    user: config.user,
    port: config.port
  });
  
  // Only add SSL if enabled
  if (useSSL) {
    config.ssl = {
      rejectUnauthorized: false, // Allow self-signed certs
      ca: process.env.SSL_CERT_PATH || undefined, // Use custom CA if provided
    };
    
    // Log SSL configuration
    console.log('SSL configuration enabled with rejectUnauthorized: false');
  }
  
  return config;
}

/**
 * Create a database pool with proper error handlers
 * @returns {Pool} Database connection pool
 */
export async function createDbPool() {
  const { Pool } = require('pg');
  const config = getDbConfig();
  
  try {
    console.log('[DB] Creating database pool with config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl ? 'enabled' : 'disabled'
    });
    
    const pool = new Pool(config);
    
    // Add error handler to prevent uncaught exceptions
    pool.on('error', (err) => {
      // Log full error details for debugging
      console.error('[DB] Pool error event:', {
        message: err.message,
        code: err.code,
        severity: err.severity,
        detail: err.detail,
        hint: err.hint,
        where: err.where,
        stack: err.stack
      });
      // Don't crash on connection errors
    });
    
    // Test connection to verify settings
    console.log('[DB] Attempting to get client from pool...');
    try {
      const client = await pool.connect();
      try {
        console.log('[DB] Client connected, running test query...');
        const testResult = await client.query('SELECT 1 as connection_test');
        console.log('[DB] Database connection test successful', {
          host: config.host,
          database: config.database,
          timestamp: new Date().toISOString(),
          result: testResult.rows[0]
        });
      } catch (queryError) {
        console.error('[DB] Test query failed:', {
          message: queryError.message,
          code: queryError.code,
          severity: queryError.severity,
          detail: queryError.detail,
          hint: queryError.hint,
          where: queryError.where,
          stack: queryError.stack
        });
        throw queryError;
      } finally {
        client.release();
      }
    } catch (clientError) {
      console.error('[DB] Failed to get client from pool:', {
        message: clientError.message,
        code: clientError.code,
        severity: clientError.severity,
        detail: clientError.detail,
        hint: clientError.hint,
        where: clientError.where,
        stack: clientError.stack
      });
      throw clientError;
    }
    
    return pool;
  } catch (error) {
    console.error('[DB] Error creating database pool:', {
      message: error.message,
      code: error.code,
      severity: error.severity,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      stack: error.stack
    });
    throw error; // Rethrow original error for proper handling
  }
}

/**
 * Test database connection and return status
 * @returns {object} Connection test result
 */
export async function testDbConnection() {
  let pool = null;
  
  try {
    pool = await createDbPool();
    const result = await pool.query('SELECT 1 as connection_test');
    const config = getDbConfig();
    return {
      success: true,
      connected: result.rows[0].connection_test === 1,
      // Only include non-sensitive configuration details
      config: {
        host: config.host,
        database: config.database,
        port: config.port,
        ssl: config.ssl ? 'enabled' : 'disabled'
      },
      database: 'aws_rds'
    };
  } catch (error) {
    const config = getDbConfig();
    return {
      success: false,
      error: error.message,
      code: error.code,
      // Only include non-sensitive configuration details
      config: {
        host: config.host,
        database: config.database,
        port: config.port,
        ssl: config.ssl ? 'enabled' : 'disabled'
      },
      database: 'aws_rds'
    };
  } finally {
    if (pool) await pool.end();
  }
}