import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to get information about a database schema
 * This checks if the schema exists and lists its tables
 */
export async function POST(request) {
  try {
    // Get parameters from request
    const body = await request.json();
    const { schemaName } = body;
    
    if (!schemaName) {
      return NextResponse.json({
        success: false,
        message: 'Schema name is required'
      }, { status: 400 });
    }
    
    logger.info(`[API/schema/info] Checking schema ${schemaName}`);
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Get schema info from backend
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/schema/info/`, {
        schemaName
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        // If backend API is available, return the response
        logger.info(`[API/schema/info] Schema info received for ${schemaName}`);
        
        return NextResponse.json({
          success: true,
          exists: response.data.exists || false,
          tables: response.data.tables || [],
          ...response.data
        });
      } else {
        logger.error(`[API/schema/info] Backend API error: ${response.statusText}`);
        
        // If backend API fails, use fallback approach
        return await getFallbackSchemaInfo(schemaName, accessToken);
      }
    } catch (error) {
      logger.error(`[API/schema/info] API error:`, error);
      
      // If backend API is not available, use fallback approach
      try {
        // Get access token again in case it expired
        const accessToken = await getAccessToken();
        return await getFallbackSchemaInfo(schemaName, accessToken);
      } catch (fallbackError) {
        logger.error(`[API/schema/info] Fallback approach error:`, fallbackError);
        return NextResponse.json({
          success: false,
          message: `Error getting schema info: ${fallbackError.message || 'Unknown error'}`,
          error: fallbackError.message
        }, { status: 500 });
      }
    }
  } catch (error) {
    logger.error(`[API/schema/info] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error in schema info API',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Fallback approach to check if schema exists and list tables
 * Uses information_schema queries through the inventory API to check for schema and tables
 */
async function getFallbackSchemaInfo(schemaName, accessToken) {
  logger.info(`[API/schema/info] Using fallback approach for schema ${schemaName}`);
  
  // Default schema info structure
  const schemaInfo = {
    exists: false,
    tables: [],
    inventoryTables: {
      product: false,
      service: false,
      department: false
    }
  };
  
  try {
    // Check if schema exists using a direct query
    const schemaCheckResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/inventory/schema_exists/`, {
      schemaName
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (schemaCheckResponse.status === 200) {
      schemaInfo.exists = schemaCheckResponse.data.exists || false;
      
      // If schema exists, check for important tables
      if (schemaInfo.exists) {
        // Get list of tables in schema
        const tablesResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/inventory/list_tables/`, {
          schemaName
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (tablesResponse.status === 200 && tablesResponse.data.tables) {
          schemaInfo.tables = tablesResponse.data.tables;
          
          // Check for specific inventory tables
          schemaInfo.inventoryTables.product = schemaInfo.tables.includes('inventory_product');
          schemaInfo.inventoryTables.service = schemaInfo.tables.includes('inventory_service');
          schemaInfo.inventoryTables.department = schemaInfo.tables.includes('inventory_department');
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      ...schemaInfo
    });
  } catch (error) {
    logger.error(`[API/schema/info] Fallback schema check error:`, error);
    
    // Try one more direct approach - check if inventory_product table exists
    try {
      const tableCheckResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/inventory/table_exists/`, {
        tableName: 'inventory_product',
        schemaName
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (tableCheckResponse.status === 200) {
        const tableExists = tableCheckResponse.data.exists || false;
        
        // If we can check for a table, the schema must exist
        return NextResponse.json({
          success: true,
          exists: true,
          tables: tableExists ? ['inventory_product'] : [],
          inventoryTables: {
            product: tableExists,
            service: false,
            department: false
          },
          note: "Limited schema information available due to API limitations"
        });
      }
    } catch (tableCheckError) {
      logger.error(`[API/schema/info] Table check error:`, tableCheckError);
    }
    
    return NextResponse.json({
      success: false,
      message: `Error checking schema: ${error.message || 'Unknown error'}`,
      error: error.message
    }, { status: 500 });
  }
}