import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request, { params }) {
  let client;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    client = await pool.connect();
    await client.query('SET search_path TO public');
    
    const query = `
      SELECT 
        c.*,
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) as customer_name,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total), 0) as total_revenue
      FROM sales_customer c
      LEFT JOIN sales_invoice i ON c.id = i.customer_id AND i.tenant_id = $1
      WHERE c.id = $2 AND c.tenant_id = $1
      GROUP BY c.id
    `;
    
    const result = await client.query(query, [session.user.tenant_id, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export async function PUT(request, { params }) {
  let client;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    
    client = await pool.connect();
    await client.query('SET search_path TO public');

    // First check if customer exists and belongs to tenant
    const checkQuery = 'SELECT id FROM sales_customer WHERE id = $1 AND tenant_id = $2';
    const checkResult = await client.query(checkQuery, [id, session.user.tenant_id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const query = `
      UPDATE sales_customer SET
        customer_name = $1,
        company_name = $2,
        business_name = $3,
        first_name = $4,
        last_name = $5,
        email = $6,
        phone = $7,
        website = $8,
        currency = $9,
        street = $10,
        city = $11,
        billing_state = $12,
        postcode = $13,
        billing_country = $14,
        ship_to_name = $15,
        shipping_phone = $16,
        shipping_state = $17,
        shipping_country = $18,
        delivery_instructions = $19,
        notes = $20,
        updated_at = NOW()
      WHERE id = $21 AND tenant_id = $22
      RETURNING *`;

    const values = [
      data.customer_name,
      data.company_name || data.business_name,
      data.business_name,
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      data.website,
      data.currency || 'USD',
      data.street,
      data.city,
      data.billing_state,
      data.postcode,
      data.billing_country,
      data.ship_to_name,
      data.shipping_phone,
      data.shipping_state,
      data.shipping_country,
      data.delivery_instructions,
      data.notes,
      id,
      session.user.tenant_id
    ];

    const result = await client.query(query, values);

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export async function DELETE(request, { params }) {
  let client;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET search_path TO public');

    // Check if customer exists and belongs to tenant
    const checkQuery = 'SELECT id FROM sales_customer WHERE id = $1 AND tenant_id = $2';
    const checkResult = await client.query(checkQuery, [id, session.user.tenant_id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Delete related records first (CASCADE might not be set up)
    // Delete invoices
    await client.query('DELETE FROM sales_invoice WHERE customer_id = $1 AND tenant_id = $2', [id, session.user.tenant_id]);
    
    // Delete estimates
    await client.query('DELETE FROM sales_estimate WHERE customer_id = $1 AND tenant_id = $2', [id, session.user.tenant_id]);
    
    // Delete payments
    await client.query('DELETE FROM sales_payment WHERE customer_id = $1 AND tenant_id = $2', [id, session.user.tenant_id]);
    
    // Finally delete the customer
    const deleteQuery = 'DELETE FROM sales_customer WHERE id = $1 AND tenant_id = $2 RETURNING id';
    const result = await client.query(deleteQuery, [id, session.user.tenant_id]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'Customer deleted successfully',
      id: result.rows[0].id 
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}