import { Pool } from 'pg';

/**
 * Creates a PostgreSQL connection pool with improved error handling and SSL configuration
 * to avoid pg_hba.conf issues when connecting to RDS
 */
export function createDbPool() {
  console.log('[DB] Creating database pool with config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    ssl: 'enabled',
    connectionTimeoutMillis: 15000,
    max: 5
  });

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false // Required for RDS connections
    },
    connectionTimeoutMillis: 15000, // 15 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    max: 5, // Reduce max connections to avoid overwhelming RDS
    statement_timeout: 30000 // 30 seconds statement timeout
  });

  // Set up error handler
  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return pool;
}

/**
 * Attempts to get a client from the pool with retry logic
 */
export async function getPoolClient(pool, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DB] Connection attempt ${attempt}/${maxRetries}...`);
    
    try {
      const client = await pool.connect();
      console.log('[DB] Client connected successfully');
      
      // Test the connection with a simple query
      try {
        console.log('[DB] Running test query...');
        const testResult = await client.query('SELECT 1 as connection_test');
        console.log('[DB] Database connection test successful', {
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          timestamp: new Date().toISOString(),
          result: testResult.rows[0]
        });
      } catch (testError) {
        console.error('[DB] Connection test query failed:', testError.message);
        client.release();
        throw testError;
      }
      
      return client;
    } catch (error) {
      lastError = error;
      console.error(`[DB] Connection attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[DB] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[DB] Database connection failed after ${maxRetries} attempts`);
  throw new Error(`Database connection failed: ${lastError.message}`);
}

/**
 * Executes a database operation with proper connection handling and error recovery
 */
export async function withDatabase(operation, maxRetries = 3) {
  const pool = createDbPool();
  let client;
  
  try {
    client = await getPoolClient(pool, maxRetries);
    return await operation(client);
  } finally {
    if (client) {
      client.release();
    }
    
    // End the pool to prevent hanging connections
    try {
      await pool.end();
    } catch (error) {
      console.warn('[DB] Error ending connection pool:', error.message);
    }
  }
} 