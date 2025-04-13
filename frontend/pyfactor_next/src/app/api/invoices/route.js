import { NextResponse } from 'next/server';
import { getPool } from '@/utils/database';
import { query } from '@/utils/database';
import { v4 as uuidv4 } from 'uuid';
import tenantMiddleware from '@/middleware/tenantMiddleware';

export async function GET(req) {
  try {
    // Extract tenant ID from request headers
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      console.error('[API] Invoice GET: Missing tenant ID');
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }
    
    console.log(`[API] Retrieving invoices for tenant: ${tenantId}`);
    
    // Build schema name
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Get database connection
    const pool = await getPool();
    
    // Set RLS tenant context
    await query(
      `SELECT set_config('app.current_tenant', $1, true)`,
      [tenantId]
    );
    
    // Query invoices with tenant filter
    const result = await query(
      `SELECT * FROM invoice WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('[API] Error retrieving invoices:', error);
    return NextResponse.json({ error: 'Failed to retrieve invoices', message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // Extract tenant ID from request headers
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      console.error('[API] Invoice POST: Missing tenant ID');
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }
    
    // Parse request body
    let invoiceData;
    try {
      invoiceData = await req.json();
    } catch (parseError) {
      console.error('[API] Invoice POST: Invalid JSON data', parseError);
      return NextResponse.json({ error: 'Invalid JSON data' }, { status: 400 });
    }
    
    // Ensure tenant ID is set in the invoice data
    invoiceData.tenant_id = tenantId;
    
    // Generate an ID if not provided
    if (!invoiceData.id) {
      invoiceData.id = uuidv4();
    }
    
    // Set created_at and updated_at if not provided
    const now = new Date().toISOString();
    if (!invoiceData.created_at) {
      invoiceData.created_at = now;
    }
    if (!invoiceData.updated_at) {
      invoiceData.updated_at = now;
    }
    
    // Get database connection
    const pool = await getPool();
    
    // Set RLS tenant context
    await query(
      `SELECT set_config('app.current_tenant', $1, true)`,
      [tenantId]
    );
    
    // Insert invoice
    const result = await query(
      `INSERT INTO invoice (
        id, tenant_id, customer_id, customer_name, 
        invoice_number, issue_date, due_date, 
        currency, subtotal, tax_total, total, 
        amount_paid, balance_due, status, 
        notes, terms, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *`,
      [
        invoiceData.id,
        tenantId,
        invoiceData.customer_id,
        invoiceData.customer_name,
        invoiceData.invoice_number || `INV-${Date.now()}`,
        invoiceData.issue_date,
        invoiceData.due_date,
        invoiceData.currency || 'USD',
        invoiceData.subtotal || 0,
        invoiceData.tax_total || 0,
        invoiceData.total || 0,
        invoiceData.amount_paid || 0,
        invoiceData.balance_due || 0,
        invoiceData.status || 'draft',
        invoiceData.notes || '',
        invoiceData.terms || '',
        invoiceData.created_at,
        invoiceData.updated_at
      ]
    );
    
    // Insert invoice items if provided
    if (Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
      for (const item of invoiceData.items) {
        await query(
          `INSERT INTO invoice_item (
            id, invoice_id, tenant_id, description, 
            quantity, unit_price, amount,
            product_id, service_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )`,
          [
            uuidv4(),
            invoiceData.id,
            tenantId,
            item.description || '',
            item.quantity || 0,
            item.unit_price || 0,
            item.amount || 0,
            item.product_id || null,
            item.service_id || null,
            now,
            now
          ]
        );
      }
    }
    
    console.log(`[API] Created invoice for tenant ${tenantId} with ID: ${invoiceData.id}`);
    
    return NextResponse.json(result.rows[0] || { id: invoiceData.id }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice', message: error.message }, { status: 500 });
  }
} 