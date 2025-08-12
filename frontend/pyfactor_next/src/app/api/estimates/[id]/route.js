import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth-server';

export async function GET(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const estimateId = params.id;
    
    const db = await getDb();
    const query = `
      SELECT 
        e.*,
        c.customer_name,
        c.company_name,
        c.email as customer_email,
        c.phone as customer_phone,
        CASE 
          WHEN e.valid_until < CURRENT_DATE THEN 'expired'
          WHEN e.status IS NULL THEN 'draft'
          ELSE e.status
        END as status
      FROM sales_estimate e
      LEFT JOIN crm_customer c ON e.customer_id = c.id
      WHERE e.id = $1 AND e.tenant_id = $2
    `;
    
    const result = await db.query(query, [estimateId, tenantId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    const estimate = result.rows[0];
    
    // Fetch items
    const itemsQuery = `
      SELECT 
        ei.*,
        p.name as product_name,
        s.service_name
      FROM sales_estimateitem ei
      LEFT JOIN inventory_product p ON ei.product_id = p.id
      LEFT JOIN inventory_service s ON ei.service_id = s.id
      WHERE ei.estimate_id = $1
      ORDER BY ei.id
    `;
    
    const itemsResult = await db.query(itemsQuery, [estimateId]);
    estimate.items = itemsResult.rows;
    
    return NextResponse.json({ estimate });
    
  } catch (error) {
    logger.error('Error fetching estimate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const estimateId = params.id;
    const data = await request.json();
    
    const db = await getDb();
    
    // Check if estimate exists and belongs to tenant
    const checkResult = await db.query(
      'SELECT id FROM sales_estimate WHERE id = $1 AND tenant_id = $2',
      [estimateId, tenantId]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Update estimate
      const updateQuery = `
        UPDATE sales_estimate 
        SET 
          customer_id = COALESCE($1, customer_id),
          "totalAmount" = COALESCE($2, "totalAmount"),
          title = COALESCE($3, title),
          summary = COALESCE($4, summary),
          valid_until = COALESCE($5, valid_until),
          customer_ref = COALESCE($6, customer_ref),
          discount = COALESCE($7, discount),
          currency = COALESCE($8, currency),
          footer = COALESCE($9, footer),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND tenant_id = $11
        RETURNING *
      `;
      
      const values = [
        data.customer_id,
        data.totalAmount,
        data.title,
        data.summary,
        data.valid_until,
        data.customer_ref,
        data.discount,
        data.currency,
        data.footer,
        estimateId,
        tenantId
      ];
      
      const estimateResult = await db.query(updateQuery, values);
      const estimate = estimateResult.rows[0];
      
      // Update items if provided
      if (data.items) {
        // Delete existing items
        await db.query('DELETE FROM sales_estimateitem WHERE estimate_id = $1', [estimateId]);
        
        // Insert new items
        for (const item of data.items) {
          const itemQuery = `
            INSERT INTO sales_estimateitem (
              estimate_id, product_id, service_id, 
              description, quantity, unit_price
            ) VALUES (
              $1, $2, $3, $4, $5, $6
            )
          `;
          
          await db.query(itemQuery, [
            estimateId,
            item.product_id || null,
            item.service_id || null,
            item.description || '',
            item.quantity,
            item.unit_price
          ]);
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch customer info for response
      const customerResult = await db.query(
        'SELECT customer_name, company_name, email, phone FROM crm_customer WHERE id = $1',
        [estimate.customer_id]
      );
      
      if (customerResult.rows.length > 0) {
        estimate.customer_name = customerResult.rows[0].customer_name;
        estimate.company_name = customerResult.rows[0].company_name;
        estimate.customer_email = customerResult.rows[0].email;
        estimate.customer_phone = customerResult.rows[0].phone;
      }
      
      // Add status
      if (!estimate.status) estimate.status = 'draft';
      
      return NextResponse.json({
        estimate,
        message: 'Estimate updated successfully'
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Error updating estimate:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
      // Delete items first (foreign key constraint)
      await db.query('DELETE FROM sales_estimateitem WHERE estimate_id = $1', [estimateId]);
      
      // Delete estimate
      const result = await db.query(
        'DELETE FROM sales_estimate WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [estimateId, tenantId]
      );
      
      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Estimate not found' },
          { status: 404 }
        );
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({
        message: 'Estimate deleted successfully'
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Error deleting estimate:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    );
  }
}