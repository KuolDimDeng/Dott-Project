import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to seed the database with sample products
 * This creates a test product in the database
 */
export async function POST(request) {
  try {
    // Get parameters from request
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json({
        success: false,
        message: 'Tenant ID is required'
      }, { status: 400 });
    }
    
    logger.info(`[API/inventory/seed] Seeding products for tenant ${tenantId}`);
    
    // Generate schema name from tenant ID
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Create sample product data
    const productData = {
      name: "Demo Product",
      product_code: "DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      description: "This is a demo product created for testing",
      price: 19.99,
      stock_quantity: 100,
      reorder_level: 10,
      is_for_sale: true
    };
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Create product via API
      const response = await axios.post('/api/inventory/products/', productData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
          'X-Schema-Name': schemaName,
          'X-Business-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 201 || response.status === 200) {
        logger.info(`[API/inventory/seed] Successfully created demo product`);
        return NextResponse.json({
          success: true,
          message: 'Product created successfully',
          product: response.data
        });
      } else {
        logger.error(`[API/inventory/seed] Error creating product: ${response.statusText}`);
        return NextResponse.json({
          success: false,
          message: `Error creating product: ${response.statusText}`
        }, { status: response.status });
      }
    } catch (error) {
      logger.error(`[API/inventory/seed] API error:`, error);
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message
      }, { status: 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/seed] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error in seed API',
      error: error.message
    }, { status: 500 });
  }
}