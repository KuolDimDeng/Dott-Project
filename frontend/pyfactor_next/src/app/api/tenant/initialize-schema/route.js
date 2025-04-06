import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient, createDbPool } from '../db-config';

/**
 * Initialize schema and create necessary tables for a tenant
 * This endpoint is called when API requests fail due to missing tables
 */
export async function POST(request) {
  try {
    console.log('[initialize-schema] Request received');
    
    // Extract tenant ID from request body
    const body = await request.json();
    let { tenantId, forceCreate } = body;
    
    if (!tenantId) {
      // Only create a new tenant ID if explicitly requested
      if (forceCreate === true) {
        console.log('[initialize-schema] No tenant ID provided, but forceCreate is true. Generating UUID.');
        // Generate a proper UUID
        const crypto = require('crypto');
        tenantId = crypto.randomUUID();
        console.log(`[initialize-schema] Generated new UUID as tenant ID: ${tenantId}`);
      } else {
        console.error('[initialize-schema] No tenant ID provided and forceCreate not specified');
        return NextResponse.json({ 
          success: false, 
          message: 'Tenant ID is required or forceCreate must be true' 
        }, { status: 400 });
      }
    }
    
    // Check for invalid tenant ID format and fix it
    if (tenantId.includes('----') || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.warn(`[initialize-schema] Invalid tenant ID format detected: ${tenantId}`);
      
      // Try to find a valid tenant ID from the database
      try {
        console.log('[initialize-schema] Attempting to find valid tenant ID for this user');
        const pool = await createDbPool();
        
        // First try to query existing schemas to find a matching pattern
        const schemasQuery = await pool.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'tenant_%'
          ORDER BY schema_name
        `);
        
        const possibleSchemas = schemasQuery.rows.map(row => row.schema_name);
        console.log(`[initialize-schema] Found ${possibleSchemas.length} possible tenant schemas`);
        
        if (possibleSchemas.length > 0) {
          // Extract tenant IDs from schema names
          const validTenantIds = possibleSchemas.map(schema => {
            const schemaPrefix = 'tenant_';
            if (schema.startsWith(schemaPrefix)) {
              // Convert schema name back to tenant ID format
              const schemaId = schema.substring(schemaPrefix.length);
              return schemaId.replace(/_/g, '-');
            }
            return null;
          }).filter(id => id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
          
          if (validTenantIds.length > 0) {
            tenantId = validTenantIds[0];
            console.log(`[initialize-schema] Found valid tenant ID from schemas: ${tenantId}`);
          }
        }
        
        // If no valid schema found, only generate a new UUID if forceCreate is true
        if (!tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          if (forceCreate === true) {
            // Generate a proper UUID
            const crypto = require('crypto');
            tenantId = crypto.randomUUID();
            console.log(`[initialize-schema] Generated new UUID as tenant ID: ${tenantId}`);
          } else {
            await pool.end();
            console.error('[initialize-schema] Invalid tenant ID format and forceCreate not specified');
            return NextResponse.json({ 
              success: false, 
              message: 'Invalid tenant ID format and forceCreate not specified' 
            }, { status: 400 });
          }
        }
        
        await pool.end();
      } catch (findError) {
        console.error(`[initialize-schema] Error finding valid tenant ID:`, findError);
        
        // Generate a UUID as fallback only if forceCreate is true
        if (forceCreate === true) {
          try {
            const crypto = require('crypto');
            tenantId = crypto.randomUUID();
            console.log(`[initialize-schema] Generated fallback UUID as tenant ID: ${tenantId}`);
          } catch (cryptoError) {
            // Simple UUID generation if crypto not available
            tenantId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
            console.log(`[initialize-schema] Generated simple UUID as tenant ID: ${tenantId}`);
          }
        } else {
          console.error('[initialize-schema] Error finding valid tenant ID and forceCreate not specified');
          return NextResponse.json({ 
            success: false, 
            message: 'Error finding valid tenant ID and forceCreate not specified',
            error: findError.message 
          }, { status: 400 });
        }
      }
    }
    
    console.log(`[initialize-schema] Initializing schema for tenant ${tenantId}`);
    
    // Format the tenant ID for the schema name
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    try {
      // First test database connection using pg directly
      console.log('[initialize-schema] Testing database connection');
      const pool = await createDbPool();
      const testResult = await pool.query('SELECT 1 as connection_test');
      console.log('[initialize-schema] Database connection test successful:', testResult.rows[0]);
      await pool.end();
    } catch (connError) {
      console.error('[initialize-schema] Database connection test failed:', connError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to connect to database',
        error: connError.message
      }, { status: 500 });
    }
    
    // Create schema if it doesn't exist
    console.log(`[initialize-schema] Creating schema ${schemaName} if it doesn't exist`);
    try {
      // Get prisma client for this tenant
      const prisma = await getPrismaClient(schemaName);
      
      // Create schema if it doesn't exist
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      console.log(`[initialize-schema] Schema "${schemaName}" created or already exists`);
      
      // Define all table schemas we need to create
      const tableDefinitions = [
        // Products table
        {
          name: 'products',
          sql: `CREATE TABLE IF NOT EXISTS "products" (
            "id" SERIAL PRIMARY KEY,
            "product_name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "price" DECIMAL(10, 2) NOT NULL,
            "sku" VARCHAR(50),
            "is_for_sale" BOOLEAN DEFAULT true,
            "stock_quantity" INTEGER DEFAULT 0,
            "weight" DECIMAL(10, 2),
            "dimensions" VARCHAR(100),
            "image_url" TEXT,
            "category" VARCHAR(100),
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Services table
        {
          name: 'services',
          sql: `CREATE TABLE IF NOT EXISTS "services" (
            "id" SERIAL PRIMARY KEY,
            "service_name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "price" DECIMAL(10, 2) NOT NULL,
            "is_for_sale" BOOLEAN DEFAULT true,
            "is_recurring" BOOLEAN DEFAULT false,
            "salestax" DECIMAL(10, 2) DEFAULT 0,
            "duration" VARCHAR(50),
            "billing_cycle" VARCHAR(50),
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Customers table
        {
          name: 'customers',
          sql: `CREATE TABLE IF NOT EXISTS "customers" (
            "id" SERIAL PRIMARY KEY,
            "first_name" VARCHAR(100) NOT NULL,
            "last_name" VARCHAR(100) NOT NULL,
            "email" VARCHAR(255),
            "phone" VARCHAR(50),
            "company" VARCHAR(255),
            "address_line1" VARCHAR(255),
            "address_line2" VARCHAR(255),
            "city" VARCHAR(100),
            "state" VARCHAR(100),
            "postal_code" VARCHAR(20),
            "country" VARCHAR(100),
            "notes" TEXT,
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Invoices table
        {
          name: 'invoices',
          sql: `CREATE TABLE IF NOT EXISTS "invoices" (
            "id" SERIAL PRIMARY KEY,
            "invoice_num" VARCHAR(50) NOT NULL,
            "customer_id" INTEGER,
            "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "due_date" TIMESTAMP,
            "status" VARCHAR(50) DEFAULT 'unpaid',
            "subtotal" DECIMAL(10, 2) DEFAULT 0,
            "tax" DECIMAL(10, 2) DEFAULT 0,
            "discount" DECIMAL(10, 2) DEFAULT 0,
            "total_amount" DECIMAL(10, 2) DEFAULT 0,
            "notes" TEXT,
            "currency" VARCHAR(10) DEFAULT 'USD',
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Invoice items table
        {
          name: 'invoice_items',
          sql: `CREATE TABLE IF NOT EXISTS "invoice_items" (
            "id" SERIAL PRIMARY KEY,
            "invoice_id" INTEGER NOT NULL,
            "item_type" VARCHAR(50) NOT NULL,
            "item_id" INTEGER,
            "description" TEXT,
            "quantity" INTEGER DEFAULT 1,
            "unit_price" DECIMAL(10, 2) NOT NULL,
            "tax_rate" DECIMAL(5, 2) DEFAULT 0,
            "discount" DECIMAL(10, 2) DEFAULT 0,
            "line_total" DECIMAL(10, 2) NOT NULL,
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Estimates table
        {
          name: 'estimates',
          sql: `CREATE TABLE IF NOT EXISTS "estimates" (
            "id" SERIAL PRIMARY KEY,
            "title" VARCHAR(255) DEFAULT 'Estimate',
            "customer_id" INTEGER,
            "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "valid_until" TIMESTAMP,
            "status" VARCHAR(50) DEFAULT 'draft',
            "total_amount" DECIMAL(10, 2) DEFAULT 0,
            "notes" TEXT,
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },

        // Vendors table
        {
          name: 'vendors',
          sql: `CREATE TABLE IF NOT EXISTS "vendors" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "contact_name" VARCHAR(100),
            "email" VARCHAR(255),
            "phone" VARCHAR(50),
            "address_line1" VARCHAR(255),
            "address_line2" VARCHAR(255),
            "city" VARCHAR(100),
            "state" VARCHAR(100),
            "postal_code" VARCHAR(20),
            "country" VARCHAR(100),
            "notes" TEXT,
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        },
        
        // Bills table
        {
          name: 'bills',
          sql: `CREATE TABLE IF NOT EXISTS "bills" (
            "id" SERIAL PRIMARY KEY,
            "bill_num" VARCHAR(50) NOT NULL,
            "vendor_id" INTEGER,
            "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "due_date" TIMESTAMP,
            "status" VARCHAR(50) DEFAULT 'unpaid',
            "total_amount" DECIMAL(10, 2) DEFAULT 0,
            "notes" TEXT,
            "currency" VARCHAR(10) DEFAULT 'USD',
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        }
      ];
      
      // Create all required tables
      const createdTables = [];
      const failedTables = [];
      
      for (const table of tableDefinitions) {
        try {
          // Execute the SQL to create the table in the specified schema
          const tableSql = table.sql.replace(
            `CREATE TABLE IF NOT EXISTS "${table.name}"`, 
            `CREATE TABLE IF NOT EXISTS "${schemaName}"."${table.name}"`
          );
          
          await prisma.$executeRawUnsafe(tableSql);
          console.log(`[initialize-schema] Table "${schemaName}"."${table.name}" created or already exists`);
          createdTables.push(table.name);
        } catch (tableError) {
          console.error(`[initialize-schema] Error creating table "${table.name}":`, tableError);
          failedTables.push({
            name: table.name,
            error: tableError.message
          });
          // Continue with other tables even if one fails
        }
      }
      
      // Verify tables were created
      let verificationResults = {};
      
      try {
        for (const table of tableDefinitions) {
          try {
            const result = await prisma.$executeRawUnsafe(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = '${schemaName}'
                AND table_name = '${table.name}'
              )
            `);
            
            verificationResults[table.name] = result[0]?.exists === true;
          } catch (verifyError) {
            console.error(`[initialize-schema] Error verifying table "${table.name}":`, verifyError);
            verificationResults[table.name] = false;
          }
        }
      } catch (verifyAllError) {
        console.error('[initialize-schema] Error during table verification:', verifyAllError);
        verificationResults = { error: 'Failed to verify tables' };
      }
      
      return NextResponse.json({
        success: true,
        message: `Schema and tables for tenant ${tenantId} initialized successfully`,
        schemaName: schemaName,
        tenantId: tenantId,
        correctedId: body.tenantId !== tenantId, // Flag if we corrected the tenant ID
        correctTenantId: tenantId, // Always include the correct tenant ID
        createdTables,
        failedTables,
        verification: verificationResults
      });
      
    } catch (error) {
      console.error('[initialize-schema] Error initializing schema:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to initialize schema',
        error: error.message,
        tenantId: tenantId
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[initialize-schema] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
} 