import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { getAccessToken } from '@/utils/tokenUtils';

/**
 * API route to diagnose and fix inventory table issues
 * This checks the schema, runs migrations if needed, and creates test data
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
    
    logger.info(`[API/inventory/diagnostic] Running diagnostics for tenant ${tenantId}`);
    
    // Generate schema name from tenant ID
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Create a diagnostic response object to collect all information
    const diagnosticInfo = {
      tenant: {
        tenantId,
        schemaName,
        timestamp: new Date().toISOString()
      },
      schema: { exists: null, tables: [], error: null },
      migrations: { applied: false, error: null },
      testData: { created: false, error: null }
    };
    
    try {
      // Get access token for authentication
      const accessToken = await getAccessToken();
      
      // Step 1: Check if the schema exists and has the inventory_product table
      logger.info(`[API/inventory/diagnostic] Checking schema ${schemaName}`);
      
      try {
        const schemaResponse = await axios.post('/api/tenant/validate/', {
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
        
        // Save schema validation results
        if (schemaResponse.data) {
          diagnosticInfo.schema.exists = schemaResponse.data.schemaExists || false;
          diagnosticInfo.schema.tables = schemaResponse.data.tables || [];
          
          // Check if the inventory_product table exists
          const hasInventoryProductTable = diagnosticInfo.schema.tables.includes('inventory_product');
          diagnosticInfo.schema.hasInventoryProductTable = hasInventoryProductTable;
        }
      } catch (schemaError) {
        logger.error(`[API/inventory/diagnostic] Schema check error:`, schemaError);
        diagnosticInfo.schema.error = schemaError.response?.data || schemaError.message;
      }
      
      // Step 2: If schema exists but doesn't have the inventory_product table, run migrations
      if (diagnosticInfo.schema.exists && !diagnosticInfo.schema.hasInventoryProductTable) {
        logger.info(`[API/inventory/diagnostic] Schema exists but inventory_product table missing, running migrations`);
        
        try {
          // Call migration endpoint - we'll create a simple endpoint that runs 'migrate inventory'
          const migrationResponse = await axios.post('/api/schema/migrate', {
            tenantId,
            schemaName,
            app: 'inventory'
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Tenant-ID': tenantId,
              'X-Schema-Name': schemaName,
              'X-Business-ID': tenantId,
              'Content-Type': 'application/json'
            }
          });
          
          diagnosticInfo.migrations.applied = true;
          diagnosticInfo.migrations.details = migrationResponse.data;
        } catch (migrationError) {
          logger.error(`[API/inventory/diagnostic] Migration error:`, migrationError);
          diagnosticInfo.migrations.error = migrationError.response?.data || migrationError.message;
        }
      }
      
      // Step 3: Create test data if migrations were successful or the table already exists
      if (diagnosticInfo.schema.hasInventoryProductTable || diagnosticInfo.migrations.applied) {
        logger.info(`[API/inventory/diagnostic] Creating test data`);
        
        try {
          // Use the seed endpoint to create test data
          const seedResponse = await axios.post('/api/inventory/seed', {
            tenantId
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Tenant-ID': tenantId,
              'X-Schema-Name': schemaName,
              'X-Business-ID': tenantId,
              'Content-Type': 'application/json'
            }
          });
          
          diagnosticInfo.testData.created = true;
          diagnosticInfo.testData.product = seedResponse.data.product;
        } catch (seedError) {
          logger.error(`[API/inventory/diagnostic] Seed error:`, seedError);
          diagnosticInfo.testData.error = seedError.response?.data || seedError.message;
        }
      }
      
      // Return the full diagnostic info
      return NextResponse.json({
        success: true,
        message: 'Diagnostics completed',
        diagnosticInfo,
        recommendations: generateRecommendations(diagnosticInfo)
      });
    } catch (error) {
      logger.error(`[API/inventory/diagnostic] API error:`, error);
      return NextResponse.json({
        success: false,
        message: `API error: ${error.message || 'Unknown error'}`,
        error: error.response?.data || error.message,
        partialDiagnosticInfo: diagnosticInfo
      }, { status: 500 });
    }
  } catch (error) {
    logger.error(`[API/inventory/diagnostic] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error in diagnostic API',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on diagnostic results
 */
function generateRecommendations(diagnosticInfo) {
  const recommendations = [];
  
  if (!diagnosticInfo.schema.exists) {
    recommendations.push("The tenant schema doesn't exist. Try logging out and back in or contact support.");
  }
  
  if (diagnosticInfo.schema.exists && !diagnosticInfo.schema.hasInventoryProductTable) {
    if (diagnosticInfo.migrations.applied) {
      recommendations.push("The inventory_product table was created through migrations. Try loading the inventory page again.");
    } else if (diagnosticInfo.migrations.error) {
      recommendations.push("The inventory_product table is missing and migrations failed. Contact support for database initialization.");
    } else {
      recommendations.push("The inventory_product table is missing. Try running migrations or contact support.");
    }
  }
  
  if (diagnosticInfo.schema.hasInventoryProductTable && !diagnosticInfo.testData.created && diagnosticInfo.testData.error) {
    recommendations.push("Failed to create test data. Try creating a product manually through the UI.");
  }
  
  if (diagnosticInfo.schema.hasInventoryProductTable && diagnosticInfo.testData.created) {
    recommendations.push("Test product was successfully created. You should be able to see it in the inventory list.");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("No specific recommendations. If you're still having issues, contact support.");
  }
  
  return recommendations;
}