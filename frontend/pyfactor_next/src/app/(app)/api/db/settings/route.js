/**
 * API endpoint to manage AWS RDS connection settings
 */
import { NextResponse } from 'next/server';

// Create a DB pool for AWS RDS with the provided settings
const createAwsRdsPool = async (settings) => {
  // Only import pg when needed to avoid issues with serverless environments
  const { Pool } = await import('pg');
  
  // Determine SSL configuration
  const useSSL = settings.ssl === true;
  const sslConfig = useSSL ? { rejectUnauthorized: false } : false;
  
  // Create a connection pool with the provided AWS RDS parameters
  return new Pool({
    host: settings.host,
    port: parseInt(settings.port || '5432'),
    database: settings.database,
    user: settings.user,
    password: settings.password,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
};

/**
 * GET handler to fetch current AWS RDS settings
 */
export async function GET(request) {
  try {
    // Return the current settings (without passwords)
    return NextResponse.json({
      success: true,
      settings: {
        host: process.env.AWS_RDS_HOST || '',
        port: process.env.AWS_RDS_PORT || '5432',
        database: process.env.AWS_RDS_DATABASE || 'dott_main',
        user: process.env.AWS_RDS_USER || '',
        has_password: !!process.env.AWS_RDS_PASSWORD,
        ssl: process.env.AWS_RDS_SSL === 'true'
      }
    });
  } catch (error) {
    console.error('[AWS RDS Settings] Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST handler to test AWS RDS connection with specified settings
 */
export async function POST(request) {
  let pool = null;
  
  try {
    // Get settings from request body
    const settings = await request.json();
    
    // Validate required settings
    if (!settings.host || !settings.database || !settings.user || !settings.password) {
      return NextResponse.json({
        success: false,
        error: 'Missing required connection parameters'
      }, { status: 400 });
    }
    
    console.log('[AWS RDS Settings] Testing connection to:', settings.host);
    
    // Create a pool with the new settings
    pool = await createAwsRdsPool(settings);
    
    // Test the connection
    const result = await pool.query('SELECT version()');
    
    // Get RDS version
    const version = result.rows[0].version;
    
    // Return success with version info
    return NextResponse.json({
      success: true,
      version,
      message: 'Connection successful',
      tables_count: null // Will be set by another query if needed
    });
  } catch (error) {
    console.error('[AWS RDS Settings] Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    // Close the pool
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * PUT handler to update AWS RDS settings in a state file
 * Note: This would typically update environment variables, but for security,
 * we'll only simulate this by printing the values that would be updated.
 */
export async function PUT(request) {
  try {
    // Get settings from request body
    const settings = await request.json();
    
    // Validate required settings
    if (!settings.host || !settings.database || !settings.user) {
      return NextResponse.json({
        success: false,
        error: 'Missing required connection parameters'
      }, { status: 400 });
    }
    
    console.log('[AWS RDS Settings] Would update AWS RDS settings to:', {
      host: settings.host,
      port: settings.port || '5432',
      database: settings.database,
      user: settings.user,
      password: settings.password ? '********' : 'unchanged'
    });
    
    // In a real implementation, this would update .env.local or similar
    // For security, we're not actually writing to files here
    
    return NextResponse.json({
      success: true,
      message: 'Connection settings would be updated (simulated)',
      settings: {
        host: settings.host,
        port: settings.port || '5432',
        database: settings.database,
        user: settings.user,
        has_password: !!settings.password,
        ssl: settings.ssl === true
      }
    });
  } catch (error) {
    console.error('[AWS RDS Settings] Error updating settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 