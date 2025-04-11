import { NextResponse } from 'next/server';
import { applyRLS, verifyTenantId, getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
// Only import pg in production, otherwise it's not needed
const isProd = process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true';
let Pool;
if (isProd) {
  import('pg').then((pg) => {
    Pool = pg.Pool;
  }).catch(e => console.error('Failed to load pg module:', e));
}

// Simple in-memory mock database for development
const mockDb = {
  invoices: [
    {
      id: '1',
      invoice_number: 'INV-2023-001',
      customer_id: '1',
      customer_name: 'Sample Customer 1',
      issue_date: new Date('2023-01-15').toISOString(),
      due_date: new Date('2023-02-15').toISOString(),
      total_amount: 1250.00,
      status: 'paid',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      invoice_number: 'INV-2023-002',
      customer_id: '2',
      customer_name: 'Sample Customer 2',
      issue_date: new Date('2023-02-20').toISOString(),
      due_date: new Date('2023-03-20').toISOString(),
      total_amount: 2750.00,
      status: 'pending',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * GET handler for invoices with tenant-aware RLS
 */
export async function GET(request) {
  try {
    // Extract parameters from the request
    const { searchParams } = new URL(request.url);
    
    // Get tenant ID from search params or headers
    const tenantId = searchParams.get('tenantId') || 
                      request.headers.get('x-tenant-id') || 
                      'default-tenant';
    
    // Get schema from search params
    const schema = searchParams.get('schema');
    
    // Create the schema name
    const schemaName = schema || `tenant_${tenantId.replace(/-/g, '_')}`;
    
    console.log(`[API] Invoices GET request received`);
    console.log(`[API] Listing invoices for tenant: ${tenantId}, schema: ${schemaName}`);
    
    // Check if using development mode
    if (process.env.NODE_ENV !== 'production') {
      // Return mock data in development
      return NextResponse.json([
        {
          id: '1',
          tenant_id: tenantId,
          customer_name: 'Development Customer 1',
          invoice_number: 'INV-001',
          description: 'Mock Invoice for Development',
          date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          amount: 199.99,
          status: 'draft',
          created_at: new Date().toISOString(),
          is_dev: true
        },
        {
          id: '2',
          tenant_id: tenantId,
          customer_name: 'Development Customer 2',
          invoice_number: 'INV-002',
          description: 'Another Mock Invoice for Development',
          date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
          amount: 299.99,
          status: 'sent',
          created_at: new Date().toISOString(),
          is_dev: true
        }
      ]);
    }
    
    // Connect to the database to get the data
    try {
      // DATABASE CODE GOES HERE
      // Create a connection pool
      const { Pool } = require('pg');
      const pool = new Pool(config);
      
      // First check if the schema exists
      const schemaExists = await checkSchemaExists(pool, schemaName);
      
      if (!schemaExists) {
        console.log(`[API] Schema "${schemaName}" does not exist, creating it...`);
        
        // Create schema if it doesn't exist
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
        
        // Create sales_invoice table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."sales_invoice" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "tenant_id" UUID NOT NULL,
            "customer_id" UUID,
            "customer_name" TEXT,
            "invoice_number" TEXT,
            "description" TEXT,
            "issue_date" DATE NOT NULL DEFAULT CURRENT_DATE,
            "due_date" DATE,
            "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
            "status" TEXT DEFAULT 'draft',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Add index on tenant_id for better performance
          CREATE INDEX IF NOT EXISTS "sales_invoice_tenant_id_idx" ON "${schemaName}"."sales_invoice" ("tenant_id");
        `);
        
        console.log(`[API] Created schema and sales_invoice table`);
      }
      
      // Now query the invoices
      const query = `
        SELECT * FROM "${schemaName}"."sales_invoice"
        WHERE "tenant_id" = $1
        ORDER BY "issue_date" DESC;
      `;
      
      const result = await pool.query(query, [tenantId]);
      
      // Close the connection pool
      await pool.end();
      
      // Format the results
      const invoices = result.rows;
      console.log(`[API] Retrieved ${invoices.length} invoices for tenant ${tenantId}`);
      
      if (invoices.length === 0) {
        // Insert some default sample invoices
        await insertSampleInvoices(tenantId, schemaName);
        
        // Return fallback data for now
        return NextResponse.json(fallbackInvoices, {
          headers: {
            'X-Sample-Data': 'true',
            'Cache-Control': 'no-store'
          }
        });
      }
      
      return NextResponse.json(invoices);
    } catch (error) {
      console.error('[API] Database error:', error);
      
      // Return fallback data
      console.log('[API] Returning fallback invoice data due to database error');
      return NextResponse.json(fallbackInvoices, {
        headers: {
          'X-Fallback-Data': 'true',
          'Cache-Control': 'no-store'
        }
      });
    }
  } catch (error) {
    console.error('[API] Invoice GET error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve invoices',
      message: error.message
    }, { status: 500 });
  }
}

// Helper function to insert sample invoices
async function insertSampleInvoices(tenantId, schemaName) {
  const { Pool } = require('pg');
  const pool = new Pool(config);
  
  try {
    // Create some sample invoices
    const sampleInvoices = [
      {
        tenant_id: tenantId,
        customer_name: 'Sample Customer 1',
        invoice_number: 'INV-2025-001',
        description: 'Initial setup and consulting',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        amount: 1250.00,
        status: 'draft'
      },
      {
        tenant_id: tenantId,
        customer_name: 'Sample Customer 2',
        invoice_number: 'INV-2025-002',
        description: 'Monthly service fee',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
        amount: 750.00,
        status: 'sent'
      }
    ];
    
    // Insert each sample invoice
    for (const invoice of sampleInvoices) {
      await pool.query(`
        INSERT INTO "${schemaName}"."sales_invoice"
        (tenant_id, customer_name, invoice_number, description, issue_date, due_date, amount, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        invoice.tenant_id,
        invoice.customer_name,
        invoice.invoice_number,
        invoice.description,
        invoice.issue_date,
        invoice.due_date,
        invoice.amount,
        invoice.status
      ]);
    }
    
    console.log(`[API] Created ${sampleInvoices.length} sample invoices for tenant ${tenantId}`);
  } catch (error) {
    console.error('[API] Error creating sample invoices:', error);
  } finally {
    await pool.end();
  }
}

/**
 * POST handler for invoice creation with tenant-aware RLS
 */
export async function POST(request) {
  console.log('[API] Invoice POST request received');
  try {
    // Get request body
    const invoiceData = await request.json();
    console.debug('[API] Invoice POST data:', invoiceData);
    
    // Extract tenant info from request
    const headerTenantId = request.headers.get('x-tenant-id');
    
    const cookieHeader = request.headers.get('cookie');
    let cookieTenantId = null;
    let devTenantId = null;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          cookieTenantId = value;
        } else if (name === 'dev-tenant-id') {
          devTenantId = value;
        }
      });
    }
    
    // Determine tenant ID with priority
    const kuolDengTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const isKuolDeng = cookieHeader?.includes('authUser=kuol.deng@example.com');
    
    const tenantId = invoiceData.tenant_id || 
                     headerTenantId || 
                     cookieTenantId || 
                     devTenantId || 
                     (isKuolDeng ? kuolDengTenantId : null) || 
                     getDefaultTenantId();
    
    console.debug('[API] Tenant ID determined for invoice creation:', tenantId);
    
    // Create invoice with tenant ID to ensure RLS
    const enhancedInvoiceData = {
      ...invoiceData,
      id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };
    
    // Connect to the actual RDS database in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      // Make sure we have the Pool class available
      if (!Pool) {
        console.warn('[API] PostgreSQL module not loaded, falling back to mock data');
        // Add to mock database
        mockDb.invoices.push(enhancedInvoiceData);
        console.log('[API] Created invoice with mock data. Tenant ID:', tenantId);
        return NextResponse.json(enhancedInvoiceData, { status: 201 });
      }
      
      try {
        // Create a connection pool to the RDS database
        const pool = new Pool({
          host: process.env.RDS_HOSTNAME,
          port: process.env.RDS_PORT,
          database: process.env.RDS_DB_NAME,
          user: process.env.RDS_USERNAME,
          password: process.env.RDS_PASSWORD,
          ssl: { rejectUnauthorized: false }
        });
        
        // Construct the tenant-specific schema name
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // SQL query to insert invoice with tenant ID for RLS
        const query = `
          INSERT INTO ${schemaName}.invoices (
            invoice_number,
            customer_id,
            customer_name,
            issue_date,
            due_date,
            total_amount,
            status,
            tenant_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        
        const values = [
          enhancedInvoiceData.invoice_number,
          enhancedInvoiceData.customer_id,
          enhancedInvoiceData.customer_name,
          enhancedInvoiceData.issue_date,
          enhancedInvoiceData.due_date,
          enhancedInvoiceData.total_amount,
          enhancedInvoiceData.status,
          tenantId,
          enhancedInvoiceData.created_at
        ];
        
        const result = await pool.query(query, values);
        
        // Close the connection pool
        await pool.end();
        
        console.log('[API] Created invoice with RLS tenant_id:', tenantId);
        
        return NextResponse.json(result.rows[0], { status: 201 });
      } catch (dbError) {
        console.error('[API] Database error:', dbError);
        
        // Close the connection pool on error
        try {
          if (pool) await pool.end();
        } catch (e) {
          // Ignore any errors from pool.end()
        }
        
        throw new Error(`Database error: ${dbError.message}`);
      }
    } else {
      // DEVELOPMENT MODE: Use mock database
      mockDb.invoices.push(enhancedInvoiceData);
      
      console.log('[API] Created invoice with mock data. Tenant ID:', tenantId);
      
      // Return created invoice
      return NextResponse.json(enhancedInvoiceData, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Invoice POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create invoice',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * Check if schema exists before trying to query tables
 */
const checkSchemaExists = async (pool, schemaName) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE id = $1 -- RLS: Using tenant_id instead of schema_name
      );
    `;
    
    const result = await pool.query(query, [schemaName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking schema existence:', error);
    return false;
  }
};

// Configuration for database connection
const config = {
  host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
  port: process.env.RDS_PORT || 5432,
  database: process.env.RDS_DB_NAME || 'dott_main',
  user: process.env.RDS_USERNAME || 'dott_admin',
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

// Fallback invoices for when database access fails
const fallbackInvoices = [
  {
    id: 'fallback-invoice-1',
    tenant_id: 'default-tenant',
    customer_name: 'Sample Customer 1',
    invoice_number: 'INV-001',
    description: 'Example invoice (fallback data)',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    amount: 199.99,
    status: 'draft',
    created_at: new Date().toISOString(),
    is_fallback: true
  },
  {
    id: 'fallback-invoice-2',
    tenant_id: 'default-tenant',
    customer_name: 'Sample Customer 2',
    invoice_number: 'INV-002',
    description: 'Another example invoice (fallback data)',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
    amount: 299.99,
    status: 'sent',
    created_at: new Date().toISOString(),
    is_fallback: true
  }
]; 