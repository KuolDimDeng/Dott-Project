'use server';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize postgres client for direct database queries
let pgClient = null;

const getConnectionString = () => {
  // Use environment variables for connection or fallback to local
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pyfactor';
};

const initializeClient = async () => {
  if (!pgClient) {
    try {
      pgClient = new Pool({
        connectionString: getConnectionString(),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Test connection
      await pgClient.query('SELECT NOW()');
      console.log('[Debug API] Database connection initialized');
    } catch (error) {
      console.error('[Debug API] Failed to initialize database connection:', error);
      pgClient = null;
      throw error;
    }
  }
  return pgClient;
};

export async function POST(request) {
  try {
    // Authenticate/authorize the request (in production this should be more robust)
    if (process.env.NODE_ENV === 'production') {
      // In production we might want to restrict this endpoint or require admin privileges
      const isAuthorized = request.headers.get('X-Admin-Token') === process.env.ADMIN_SECRET_TOKEN;
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Parse the request body
    const { query, params, schema, tenant_id } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Initialize DB client if needed
    const client = await initializeClient();
    
    // Log the query for debugging
    console.log(`[Debug API] Executing query: ${query} with params:`, params);
    
    // Execute the query
    const result = await client.query(query, params || []);
    
    // If schema name was provided, try to fetch table contents from that schema
    if (schema) {
      try {
        // Get list of tables in the schema
        const tablesQuery = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1
        `;
        const tablesResult = await client.query(tablesQuery, [schema]);
        
        // For each table, fetch the first 10 rows
        const tableData = {};
        for (const row of tablesResult.rows) {
          const tableName = row.table_name;
          try {
            const tableContentQuery = `
              SELECT * FROM "${schema}"."${tableName}" LIMIT 10
            `;
            const tableContentResult = await client.query(tableContentQuery);
            tableData[tableName] = tableContentResult.rows;
          } catch (tableError) {
            console.error(`[Debug API] Error fetching data from ${schema}.${tableName}:`, tableError);
            tableData[tableName] = { error: tableError.message };
          }
        }
        
        // Return both the original query result and the table data
        return NextResponse.json({
          query_result: result.rows,
          schema_tables: tablesResult.rows,
          table_data: tableData
        });
      } catch (schemaError) {
        console.error(`[Debug API] Error fetching tables from schema ${schema}:`, schemaError);
        return NextResponse.json({
          query_result: result.rows,
          schema_error: schemaError.message
        });
      }
    }
    
    // Return the result
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[Debug API] Database query error:', error);
    return NextResponse.json({ 
      error: 'Database query failed',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
} 