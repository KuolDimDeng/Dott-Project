import { NextResponse } from 'next/server';
import { createDbPool } from '@/app/api/tenant/db-config';
import { logger } from '@/utils/serverLogger';
import { getTenantId, isValidUUID } from '@/utils/tenantUtils';

/**
 * API endpoint to store subscription information and business details for a tenant
 * Handles both free plans and paid subscriptions from Stripe
 */
export async function POST(request) {
  let pool = null;
  let connection = null;
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Extract request data with fallbacks
    const planId = body.planId || 'free';
    const interval = body.interval || 'monthly';
    const status = body.status || 'active';
    const skipPayment = body.skipPayment || false;
    const stripeSubscriptionId = body.subscriptionId || null;
    
    // Get business info if provided
    const businessInfo = body.businessInfo || {};
    const businessName = businessInfo.businessName || body.businessName;
    const businessType = businessInfo.businessType || body.businessType;
    const businessCountry = businessInfo.businessCountry || body.businessCountry;
    const legalStructure = businessInfo.legalStructure || body.legalStructure;
    const businessId = businessInfo.businessId || body.businessId;
    
    // Get tenant ID from request headers or cookies
    let tenantId = request.headers.get('x-tenant-id');
    
    // If not in headers, try to extract from cookies
    if (!tenantId) {
      const cookies = request.cookies;
      tenantId = cookies.get('tenantId')?.value;
    }
    
    // If still no tenant ID but we have a business ID, use that
    if (!tenantId && businessId && isValidUUID(businessId)) {
      tenantId = businessId;
    }
    
    // Validate tenant ID
    if (!tenantId || !isValidUUID(tenantId)) {
      logger.error('[store-subscription] Invalid tenant ID:', tenantId);
      return NextResponse.json({ 
        success: false, 
        error: 'invalid_tenant_id',
        message: 'Invalid or missing tenant ID'
      }, { status: 400 });
    }
    
    logger.info(`[store-subscription] Storing subscription and business info for tenant ${tenantId}: ${planId} (${interval})`);
    
    // Connect to database
    try {
      pool = await createDbPool();
      connection = await pool.connect();
      
      // Start transaction
      await connection.query('BEGIN');
      
      // First verify tenant exists
      const tenantResult = await connection.query(`
        SELECT id, tenant_id, name, owner_id FROM custom_auth_tenant WHERE id = $1
      `, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        logger.error(`[store-subscription] Tenant not found: ${tenantId}`);
        await connection.query('ROLLBACK');
        return NextResponse.json({ 
          success: false, 
          error: 'tenant_not_found',
          message: 'Tenant not found'
        }, { status: 404 });
      }
      
      const tenant = tenantResult.rows[0];
      
      // If tenant_id is null, update it
      if (!tenant.tenant_id) {
        logger.info(`[store-subscription] Tenant ID field is null, updating it to match id: ${tenantId}`);
        await connection.query(`
          UPDATE custom_auth_tenant 
          SET tenant_id = id
          WHERE id = $1
        `, [tenantId]);
      }
      
      // Set RLS tenant context using string interpolation
      await connection.query(`SET app.current_tenant_id = '${tenantId}'`);
      
      // Check if tables exist, create them if needed
      await ensureTablesExist(connection, tenantId);
      
      // 1. Update or create subscription information
      await updateOrCreateSubscription(connection, tenantId, {
        planId, 
        interval, 
        status, 
        stripeSubscriptionId
      });
      
      // 2. Update or create business details
      await updateOrCreateBusinessDetails(connection, tenantId, {
        businessName,
        businessType,
        businessCountry,
        legalStructure,
        businessId
      });
      
      // Commit transaction
      await connection.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        tenantId: tenantId,
        plan: planId,
        interval: interval,
        isActive: status === 'active',
        businessInfo: {
          businessName,
          businessType,
          businessCountry,
          legalStructure
        },
        message: 'Subscription and business information stored successfully'
      });
      
    } catch (dbError) {
      // Handle database errors
      logger.error('[store-subscription] Database error:', dbError);
      
      if (connection) {
        try {
          await connection.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('[store-subscription] Error during rollback:', rollbackError);
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'database_error',
        message: 'Error storing subscription information',
        details: dbError.message
      }, { status: 500 });
    } finally {
      // Release connection if acquired
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          logger.error('[store-subscription] Error releasing connection:', releaseError);
        }
      }
      
      // Close pool if opened
      if (pool) {
        try {
          await pool.end();
        } catch (poolError) {
          logger.error('[store-subscription] Error closing pool:', poolError);
        }
      }
    }
    
  } catch (error) {
    // Handle general errors
    logger.error('[store-subscription] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'unexpected_error',
      message: 'An unexpected error occurred',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Ensure required database tables exist
 */
async function ensureTablesExist(connection, tenantId) {
  try {
    // Check if users_subscription table exists
    const subscriptionTableExists = await connection.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users_subscription'
      )
    `);
    
    if (!subscriptionTableExists.rows[0].exists) {
      // Create subscription table
      await connection.query(`
        CREATE TABLE users_subscription (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          business_id UUID NOT NULL,
          selected_plan VARCHAR(50) NOT NULL,
          billing_cycle VARCHAR(20) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          start_date TIMESTAMP WITH TIME ZONE,
          end_date TIMESTAMP WITH TIME ZONE,
          stripe_subscription_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Add RLS policy using string interpolation
      await connection.query(`
        ALTER TABLE users_subscription ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON users_subscription;
        CREATE POLICY tenant_isolation_policy ON users_subscription
          USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
      `);
      
      logger.info(`[store-subscription] Created users_subscription table with RLS policy`);
    }
    
    // Check if users_business_details table exists
    const businessTableExists = await connection.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users_business_details'
      )
    `);
    
    if (!businessTableExists.rows[0].exists) {
      // Create business details table
      await connection.query(`
        CREATE TABLE users_business_details (
          business_id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          business_name VARCHAR(255),
          business_type VARCHAR(100),
          country VARCHAR(50),
          legal_structure VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Add RLS policy using string interpolation
      await connection.query(`
        ALTER TABLE users_business_details ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON users_business_details;
        CREATE POLICY tenant_isolation_policy ON users_business_details
          USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
      `);
      
      logger.info(`[store-subscription] Created users_business_details table with RLS policy`);
    }
    
    return true;
  } catch (error) {
    logger.error(`[store-subscription] Error ensuring tables exist:`, error);
    throw error;
  }
}

/**
 * Update or create subscription record
 */
async function updateOrCreateSubscription(connection, tenantId, subscriptionData) {
  const { planId, interval, status, stripeSubscriptionId } = subscriptionData;
  
  try {
    // Calculate dates
    const today = new Date();
    // Calculate end date based on billing cycle (monthly = 1 month, annual = 1 year)
    const endDate = new Date(today);
    if (interval === 'annual' || interval === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Format dates for Postgres
    const startDateStr = today.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Check if subscription already exists
    const existingSubResult = await connection.query(`
      SELECT id FROM users_subscription WHERE tenant_id = $1
    `, [tenantId]);
    
    if (existingSubResult.rows.length > 0) {
      // Update existing subscription
      const subId = existingSubResult.rows[0].id;
      await connection.query(`
        UPDATE users_subscription 
        SET selected_plan = $1, 
            billing_cycle = $2, 
            is_active = $3,
            start_date = $4,
            end_date = $5,
            stripe_subscription_id = $6,
            updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
      `, [
        planId, 
        interval, 
        status === 'active', 
        startDateStr,
        endDateStr,
        stripeSubscriptionId,
        subId,
        tenantId
      ]);
      
      logger.info(`[store-subscription] Updated subscription ${subId} for tenant ${tenantId}`);
    } else {
      // Create new subscription
      await connection.query(`
        INSERT INTO users_subscription (
          id, 
          tenant_id, 
          business_id,
          selected_plan, 
          billing_cycle, 
          is_active, 
          start_date, 
          end_date,
          stripe_subscription_id
        ) VALUES (
          gen_random_uuid(), 
          $1, 
          $1, 
          $2, 
          $3, 
          $4, 
          $5, 
          $6,
          $7
        )
      `, [
        tenantId, 
        planId, 
        interval, 
        status === 'active',
        startDateStr,
        endDateStr,
        stripeSubscriptionId
      ]);
      
      logger.info(`[store-subscription] Created subscription for tenant ${tenantId}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`[store-subscription] Error updating subscription:`, error);
    throw error;
  }
}

/**
 * Update or create business details
 */
async function updateOrCreateBusinessDetails(connection, tenantId, businessData) {
  const { businessName, businessType, businessCountry, legalStructure, businessId } = businessData;
  
  try {
    // Check if any business info is provided
    if (!businessName && !businessType && !businessCountry && !legalStructure) {
      logger.info(`[store-subscription] No business details provided, skipping business update`);
      return true;
    }
    
    // Check the business_id type in the table
    const tableInfoResult = await connection.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users_business_details' AND column_name = 'business_id'
    `);
    
    let isUuid = true;
    // Check if we got results and the data type
    if (tableInfoResult.rows.length > 0) {
      const dataType = tableInfoResult.rows[0].data_type.toLowerCase();
      isUuid = dataType.includes('uuid') || dataType.includes('char');
      logger.info(`[store-subscription] business_id data type: ${dataType}, treating as ${isUuid ? 'UUID' : 'numeric'}`);
    } else {
      logger.warn(`[store-subscription] Could not determine business_id type, assuming UUID`);
    }
    
    // Format business ID based on the column type
    let formattedBusinessId;
    if (businessId) {
      formattedBusinessId = businessId;
    } else {
      formattedBusinessId = tenantId; // Use tenant ID as fallback
    }
    
    // Check if business details already exist
    const businessDetailsResult = await connection.query(`
      SELECT business_id FROM users_business_details WHERE tenant_id = $1
    `, [tenantId]);
    
    if (businessDetailsResult.rows.length > 0) {
      // Update existing business details
      await connection.query(`
        UPDATE users_business_details
        SET 
          business_name = COALESCE($1, business_name),
          business_type = COALESCE($2, business_type),
          country = COALESCE($3, country),
          legal_structure = COALESCE($4, legal_structure),
          updated_at = NOW()
        WHERE tenant_id = $5
      `, [
        businessName || null,
        businessType || null,
        businessCountry || null,
        legalStructure || null,
        tenantId
      ]);
      
      logger.info(`[store-subscription] Updated business details for tenant ${tenantId}`);
    } else {
      // Create new business details with improved error handling
      try {
        await connection.query(`
          INSERT INTO users_business_details (
            business_id,
            tenant_id,
            business_name,
            business_type,
            country,
            legal_structure
          ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `, [
          formattedBusinessId,
          tenantId,
          businessName || null,
          businessType || null,
          businessCountry || null,
          legalStructure || null
        ]);
        
        logger.info(`[store-subscription] Created business details for tenant ${tenantId}`);
      } catch (insertError) {
        logger.error(`[store-subscription] First insert attempt failed:`, insertError);
        
        // If initial insert fails, try again with alternative approach
        try {
          await connection.query(`
            INSERT INTO users_business_details (
              business_id,
              tenant_id,
              business_name,
              business_type,
              country,
              legal_structure
            ) VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              $5
            )
          `, [
            tenantId,
            businessName || null,
            businessType || null,
            businessCountry || null,
            legalStructure || null
          ]);
          
          logger.info(`[store-subscription] Created business details for tenant ${tenantId} using gen_random_uuid`);
        } catch (fallbackError) {
          logger.error(`[store-subscription] Fallback insert also failed:`, fallbackError);
          throw fallbackError;
        }
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`[store-subscription] Error updating business details:`, error);
    throw error;
  }
} 