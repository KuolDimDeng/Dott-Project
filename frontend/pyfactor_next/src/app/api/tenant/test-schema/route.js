import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';

export async function GET(request) {
  try {
    // Extract tenant ID from query params
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') || 'default';
    
    // Format the tenant ID for the schema name
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Create a connection pool
    const pool = await createDbPool();
    
    // Test listing all tables in the schema
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `;
    
    // Execute the query
    const result = await pool.query(tablesQuery, [schemaName]);
    
    // Clean up
    await pool.end();
    
    // Return the results
    return NextResponse.json({
      success: true,
      schema: schemaName,
      tablesCount: result.rows.length,
      tables: result.rows.map(row => row.table_name)
    });
    
  } catch (error) {
    console.error('Error testing schema:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test schema',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Call the initialize-schema endpoint
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Tenant ID is required' 
      }, { status: 400 });
    }
    
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Make internal call to initialize schema
    const initializeResponse = await fetch(new URL('/api/tenant/initialize-schema', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tenantId })
    });
    
    const initializeResult = await initializeResponse.json();
    
    if (!initializeResponse.ok) {
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize schema',
        error: initializeResult.message || 'Unknown error'
      }, { status: initializeResponse.status });
    }
    
    // Now test the schema by listing tables
    const pool = await createDbPool();
    
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `;
    
    const result = await pool.query(tablesQuery, [schemaName]);
    
    // Clean up
    await pool.end();
    
    // Return the results
    return NextResponse.json({
      success: true,
      initialized: initializeResult.success,
      schema: schemaName,
      tablesCount: result.rows.length,
      tables: result.rows.map(row => row.table_name)
    });
    
  } catch (error) {
    console.error('Error testing schema initialization:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test schema initialization',
      error: error.message
    }, { status: 500 });
  }
} 