import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to run migrations for a tenant schema
 * This endpoint runs Django migrations for a specific app in a tenant schema
 */
export async function POST(request) {
  try {
    // Get parameters from request
    const body = await request.json();
    const { tenantId, schemaName, app } = body;
    
    if (!tenantId || !schemaName) {
      return NextResponse.json({
        success: false,
        message: 'Tenant ID and schema name are required'
      }, { status: 400 });
    }
    
    logger.info(`[API/schema/migrate] Running migrations for tenant ${tenantId}, schema ${schemaName}, app ${app || 'all'}`);
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Create the request to run migrations
      const migrationUrl = app ? 
        `/api/tenant/migrate/${app}/` : 
        '/api/tenant/migrate/';
      
      // If the backend migration endpoint doesn't exist, use a direct SQL approach
      let migrationResponse;
      try {
        migrationResponse = await axios.post(migrationUrl, {
          tenantId,
          schemaName
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantId,
            'X-Schema-Name': schemaName,
            'X-Business-ID': tenantId,
            'Content-Type': 'application/json'
          }
        });
      } catch (migrateError) {
        // If the migration endpoint fails, try direct inventory/check_table endpoint with creation flag
        logger.info(`[API/schema/migrate] Migration endpoint failed, trying fallback approach for ${app || 'all'} app migration`);
        
        if (app === 'inventory') {
          try {
            // Try a direct SQL approach to create the inventory tables
            const tableResponse = await axios.post('/api/inventory/create_tables/', {
              schemaName
            }, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Tenant-ID': tenantId,
                'X-Schema-Name': schemaName,
                'X-Business-ID': tenantId,
                'Content-Type': 'application/json'
              }
            });
            
            // Use the table creation response instead
            migrationResponse = tableResponse;
          } catch (tableError) {
            logger.error(`[API/schema/migrate] Table creation also failed:`, tableError);
            throw migrateError; // Re-throw the original error
          }
        } else {
          throw migrateError;
        }
      }
      
      if (migrationResponse.status === 200) {
        logger.info(`[API/schema/migrate] Migrations successful:`, migrationResponse.data);
        return NextResponse.json({
          success: true,
          message: `Migrations completed successfully for ${app || 'all apps'}`,
          result: migrationResponse.data
        });
      } else {
        logger.error(`[API/schema/migrate] Migration error: ${migrationResponse.statusText}`);
        return NextResponse.json({
          success: false,
          message: `Migration error: ${migrationResponse.statusText}`
        }, { status: migrationResponse.status });
      }
    } catch (error) {
      logger.error(`[API/schema/migrate] API error:`, error);
      
      // Enhanced error response with more details
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message,
        context: {
          tenantId,
          schemaName,
          app,
          backend: {
            status: error.response?.status,
            statusText: error.response?.statusText
          }
        }
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error(`[API/schema/migrate] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error in migration API',
      error: error.message
    }, { status: 500 });
  }
}