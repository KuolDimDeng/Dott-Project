import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth-server';

export async function POST(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const estimateId = params.id;
    
    const db = await getDb();
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Fetch estimate with items
      const estimateResult = await db.query(
        'SELECT * FROM sales_estimate WHERE id = $1 AND tenant_id = $2',
        [estimateId, tenantId]
      );
      
      if (estimateResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Estimate not found' },
          { status: 404 }
        );
      }
      
      const estimate = estimateResult.rows[0];
      
      // Fetch estimate items
      const itemsResult = await db.query(
        'SELECT * FROM sales_estimateitem WHERE estimate_id = $1',
        [estimateId]
      );
      
      // Generate invoice number
      const numberResult = await db.query(
        'SELECT COUNT(*) FROM sales_invoice WHERE tenant_id = $1',
        [tenantId]
      );
      const count = parseInt(numberResult.rows[0].count) + 1;
      const invoice_num = `INV-${String(count).padStart(8, '0')}`;
      
      // Create invoice
      const invoiceQuery = `
        INSERT INTO sales_invoice (
          tenant_id, invoice_num, customer_id, "totalAmount",
          date, due_date, status, discount, currency
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *
      `;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms
      
      const invoiceValues = [
        tenantId,
        invoice_num,
        estimate.customer_id,
        estimate.totalAmount,
        new Date(),
        dueDate,
        'draft',
        estimate.discount || 0,
        estimate.currency || 'USD'
      ];
      
      const invoiceResult = await db.query(invoiceQuery, invoiceValues);
      const invoice = invoiceResult.rows[0];
      
      // Create invoice items
      for (const item of itemsResult.rows) {
        const itemQuery = `
          INSERT INTO sales_invoiceitem (
            invoice_id, product_id, service_id,
            description, quantity, unit_price
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `;
        
        await db.query(itemQuery, [
          invoice.id,
          item.product_id,
          item.service_id,
          item.description,
          item.quantity,
          item.unit_price
        ]);
      }
      
      // Update estimate status to accepted
      await db.query(
        `UPDATE sales_estimate 
         SET status = 'accepted', 
             accepted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [estimateId]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({
        invoice,
        invoiceId: invoice.id,
        message: 'Estimate converted to invoice successfully'
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Error converting estimate to invoice:', error);
    return NextResponse.json(
      { error: 'Failed to convert estimate to invoice' },
      { status: 500 }
    );
  }
}