import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to check if a specific table exists in a schema
 * This is used for diagnosing schema initialization issues
 */
export async function POST(request) {
  try {
    // Get parameters from request
    const body = await request.json();
    const { tableName, schemaName, tenantId } = body;
    
    if (!tableName || !schemaName) {
      return NextResponse.json({
        success: false,
        message: 'Table name and schema name are required'
      }, { status: 400 });
    }
    
    logger.info(`[API/inventory/table_exists] Checking if table ${tableName} exists in schema ${schemaName}`);
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Headers for request
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      // Add tenant headers if tenant ID is provided
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
        headers['X-Schema-Name'] = schemaName;
        headers['X-Business-ID'] = tenantId;
      }
      
      // Make request to check table existence
      const response = await axios.post('/api/inventory/check_table/', {
        tableName,
        schemaName
      }, { headers });
      
      if (response.status === 200) {
        logger.info(`[API/inventory/table_exists] Table check result: ${JSON.stringify(response.data)}`);
        
        return NextResponse.json({
          success: true,
          exists: response.data.exists || false,
          tableName,
          schemaName,
          ...response.data
        });
      } else {
        logger.error(`[API/inventory/table_exists] Table check error: ${response.statusText}`);
        
        return NextResponse.json({
          success: false,
          message: `Table check failed: ${response.statusText}`,
          tableName,
          schemaName
        }, { status: response.status });
      }
    } catch (error) {
      logger.error(`[API/inventory/table_exists] API error:`, error);
      
      // Create a useful error response
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        tableName,
        schemaName,
        suggestedActions: [
          "Verify the schema exists",
          "Check if schema migrations have been run",
          "Run migrations for the inventory app",
          "Contact support if the issue persists"
        ]
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/table_exists] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error checking table existence',
      error: error.message
    }, { status: 500 });
  }
}