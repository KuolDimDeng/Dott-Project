import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to list tables in a database schema
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
    
    logger.info(`[API/inventory/list_tables] Listing tables in schema ${schemaName}`);
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Make request to the backend
      const response = await axios.post('/api/inventory/list_tables/', {
        schemaName
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        logger.info(`[API/inventory/list_tables] Successfully retrieved tables from schema ${schemaName}`);
        
        return NextResponse.json({
          success: true,
          tables: response.data.tables || [],
          schemaName,
          count: response.data.tables ? response.data.tables.length : 0,
          ...response.data
        });
      } else {
        logger.error(`[API/inventory/list_tables] Table listing error: ${response.statusText}`);
        
        return NextResponse.json({
          success: false,
          message: `Table listing failed: ${response.statusText}`,
          schemaName
        }, { status: response.status });
      }
    } catch (error) {
      logger.error(`[API/inventory/list_tables] API error:`, error);
      
      // Check if we can infer more info from the error
      let errorDetails = error.response?.data || error.message;
      
      // If the error indicates schema doesn't exist
      if (error.response?.status === 404 || 
          (typeof errorDetails === 'string' && 
          (errorDetails.includes('schema') && errorDetails.includes('not exist')))) {
        return NextResponse.json({
          success: false,
          message: `Schema ${schemaName} does not exist`,
          schemaExists: false,
          tables: [],
          error: errorDetails
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: errorDetails,
        schemaName
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/list_tables] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error listing tables',
      error: error.message
    }, { status: 500 });
  }
}