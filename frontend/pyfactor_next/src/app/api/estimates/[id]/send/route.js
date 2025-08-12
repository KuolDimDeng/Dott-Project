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
    
    // Update estimate status to sent
    const updateQuery = `
      UPDATE sales_estimate 
      SET status = 'sent', 
          sent_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [estimateId, tenantId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    const estimate = result.rows[0];
    
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
    
    // TODO: In a real application, you would send an email to the customer here
    // For now, we just update the status
    
    return NextResponse.json({
      estimate,
      message: 'Estimate sent successfully'
    });
    
  } catch (error) {
    logger.error('Error sending estimate:', error);
    return NextResponse.json(
      { error: 'Failed to send estimate' },
      { status: 500 }
    );
  }
}