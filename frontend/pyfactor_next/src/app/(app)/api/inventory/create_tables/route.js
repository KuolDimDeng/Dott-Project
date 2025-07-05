import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to directly create inventory tables in a schema
 * This is a fallback approach when migrations fail
 */
export async function POST(request) {
  try {
    // Get parameters from request
    const body = await request.json();
    const { schemaName, tenantId } = body;
    
    if (!schemaName) {
      return NextResponse.json({
        success: false,
        message: 'Schema name is required'
      }, { status: 400 });
    }
    
    logger.info(`[API/inventory/create_tables] Creating inventory tables in schema ${schemaName}`);
    
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
      
      // First verify the schema exists
      try {
        const schemaCheckResponse = await axios.post('/api/inventory/schema_exists/', {
          schemaName
        }, { headers });
        
        if (schemaCheckResponse.status !== 200 || !schemaCheckResponse.data.exists) {
          return NextResponse.json({
            success: false,
            message: `Schema ${schemaName} does not exist and must be created first`,
            schemaExists: false
          }, { status: 400 });
        }
      } catch (schemaError) {
        logger.error(`[API/inventory/create_tables] Error checking schema:`, schemaError);
        return NextResponse.json({
          success: false,
          message: `Error checking if schema exists: ${schemaError.message}`,
          error: schemaError.response?.data || schemaError.message
        }, { status: 500 });
      }
      
      // Try direct SQL approach to create inventory tables
      try {
        const createResponse = await axios.post('/api/inventory/direct_create_tables/', {
          schemaName
        }, { headers });
        
        if (createResponse.status === 200) {
          logger.info(`[API/inventory/create_tables] Successfully created tables:`, createResponse.data);
          
          return NextResponse.json({
            success: true,
            message: 'Inventory tables created successfully',
            ...createResponse.data
          });
        } else {
          logger.error(`[API/inventory/create_tables] Error creating tables: ${createResponse.statusText}`);
          
          return NextResponse.json({
            success: false,
            message: `Error creating tables: ${createResponse.statusText}`
          }, { status: createResponse.status });
        }
      } catch (createError) {
        logger.error(`[API/inventory/create_tables] Error creating tables:`, createError);
        
        return NextResponse.json({
          success: false,
          message: `Error creating inventory tables: ${createError.message}`,
          error: createError.response?.data || createError.message
        }, { status: createError.response?.status || 500 });
      }
    } catch (error) {
      logger.error(`[API/inventory/create_tables] API error:`, error);
      
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/create_tables] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error creating tables',
      error: error.message
    }, { status: 500 });
  }
}