/**
 * Database configuration for all tenant-related endpoints
 * Provides consistent connection settings with AWS RDS
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Cache for Prisma clients to avoid creating multiple connections
const prismaClients = {};

// Connection settings optimized for AWS RDS
const DB_DEFAULTS = {
  port: 5432,
  database: 'dott_main',
  // Connection settings - increase timeouts to prevent client-side aborts
  connectionTimeoutMillis: 15000, // Increased from 8000
  statement_timeout: 30000, // Increased from 15000
  query_timeout: 30000, // Added explicit query timeout
  max: 5, // Increased from 1 to allow more concurrent connections
  idleTimeoutMillis: 10000, // Increased from 3000
  // Added connection retry logic
  retryAttempts: 3,
  retryDelay: 1000 // 1 second between retry attempts
};

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tenant_manager',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

// Create and cache the database pool
let pool = null;
let poolClosed = false;

/**
 * Get database configuration with fallbacks
 * This ensures consistent settings across all endpoints
 * @returns {object} Database configuration
 */
export function getDbConfig() {
  console.log('Using AWS RDS database connection');
  
  // Check if SSL should be disabled
  const useSSL = process.env.DB_USE_SSL !== 'false';
  
  // Base configuration using environment variables with fallbacks for AWS RDS
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
  console.log('AWS RDS connection details:', { 
    host: config.host, 
    database: config.database, 
    user: config.user,
    port: config.port
  });
  
  // Always add SSL configuration for AWS RDS unless explicitly disabled
  if (useSSL) {
    config.ssl = {
      rejectUnauthorized: false // Allow self-signed certs for AWS RDS
    };
  }
  
  return config;
}

/**
 * Create a database connection pool
 * @returns {Promise<Pool>} The database connection pool
 */
export async function createDbPool() {
  // If we already have a valid pool, return it
  if (pool && !poolClosed) {
    return pool;
  }
  
  // Create a new pool
  console.log('Creating new database connection pool');
  try {
    pool = new Pool(getDbConfig());
    poolClosed = false;
    
    // Test the connection
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    return pool;
  } catch (error) {
    console.error('Error connecting to database:', error);
    // Destroy the pool on connection error
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        console.error('Error ending pool after connection failure:', endError);
      }
      pool = null;
      poolClosed = true;
    }
    throw error;
  }
}

/**
 * Close the database pool
 */
export async function closeDbPool() {
  if (pool && !poolClosed) {
    try {
      await pool.end();
      poolClosed = true;
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
    } finally {
      pool = null;
    }
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

/**
 * Get a Prisma client for a specific schema
 * @param {string} schema - The schema name to connect to
 * @returns {PrismaClient} A Prisma client connected to the specified schema
 */
export async function getPrismaClient(schema = 'public') {
  try {
    // Return cached client if it exists
    if (prismaClients[schema]) {
      console.log(`Using cached Prisma client for schema: ${schema}`);
      return prismaClients[schema];
    }
    
    console.log(`Creating new Prisma client for schema: ${schema}`);
    
    // Get appropriate database URL
    const dbUrl = process.env.DATABASE_URL || 
      `postgresql://dott_admin:${process.env.DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ'}@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main?schema=${schema}`;
    
    console.log(`Using database URL: ${dbUrl.replace(/:[^:]*@/, ':***@')}`);
    
    // Create a new Prisma client with the schema connection
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      },
      // Add logging in development
      log: process.env.NODE_ENV === 'development' ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ] : undefined,
    });
    
    // Add query logging in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        console.log(`[Prisma Query] ${e.query} (${e.duration}ms)`);
      });
    }
    
    // Cache the client
    prismaClients[schema] = prisma;
    
    // Test the connection
    try {
      await prisma.$connect();
      console.log(`Successfully connected to database schema: ${schema}`);
      
      // Execute a simple query to verify
      const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log(`Prisma connection test successful: ${JSON.stringify(result)}`);
      
      return prisma;
    } catch (error) {
      console.error(`Failed to connect to database schema ${schema}:`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Remove from cache if connection failed
      delete prismaClients[schema];
      throw error;
    }
  } catch (error) {
    console.error(`Error setting up Prisma client for schema ${schema}:`, error);
    throw error;
  }
}

/**
 * Clean up all Prisma clients on server shutdown
 */
export async function disconnectAllClients() {
  for (const schema in prismaClients) {
    try {
      await prismaClients[schema].$disconnect();
      console.log(`Disconnected from schema: ${schema}`);
    } catch (error) {
      console.error(`Error disconnecting from schema ${schema}:`, error);
    }
  }
}