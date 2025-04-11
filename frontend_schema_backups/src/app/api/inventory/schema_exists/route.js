import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to check if a schema exists in the database
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
    
    logger.info(`[API/inventory/schema_exists] Checking if schema ${schemaName} exists`);
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Make request to the backend
      const response = await axios.post('/api/inventory/check_schema/', {
        schemaName
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        logger.info(`[API/inventory/schema_exists] Schema check result: ${JSON.stringify(response.data)}`);
        
        return NextResponse.json({
          success: true,
          exists: response.data.exists || false,
          schemaName,
          ...response.data
        });
      } else {
        logger.error(`[API/inventory/schema_exists] Schema check error: ${response.statusText}`);
        
        return NextResponse.json({
          success: false,
          message: `Schema check failed: ${response.statusText}`,
          schemaName
        }, { status: response.status });
      }
    } catch (error) {
      logger.error(`[API/inventory/schema_exists] API error:`, error);
      
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message,
        schemaName
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/schema_exists] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error checking schema existence',
      error: error.message
    }, { status: 500 });
  }
}