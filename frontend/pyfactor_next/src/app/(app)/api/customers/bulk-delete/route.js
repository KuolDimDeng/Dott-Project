import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request) {
  let client;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid customer IDs' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET search_path TO public');

    // First verify all customers belong to the tenant
    const checkQuery = `
      SELECT id FROM sales_customer 
      WHERE id = ANY($1::uuid[]) AND tenant_id = $2
    `;
    const checkResult = await client.query(checkQuery, [ids, session.user.tenant_id]);
    
    if (checkResult.rows.length !== ids.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Some customers not found or unauthorized' }, { status: 404 });
    }

    // Delete related records for all customers
    // Delete invoices
    await client.query(
      'DELETE FROM sales_invoice WHERE customer_id = ANY($1::uuid[]) AND tenant_id = $2',
      [ids, session.user.tenant_id]
    );
    
    // Delete estimates
    await client.query(
      'DELETE FROM sales_estimate WHERE customer_id = ANY($1::uuid[]) AND tenant_id = $2',
      [ids, session.user.tenant_id]
    );
    
    // Delete payments
    await client.query(
      'DELETE FROM sales_payment WHERE customer_id = ANY($1::uuid[]) AND tenant_id = $2',
      [ids, session.user.tenant_id]
    );
    
    // Delete customers
    const deleteQuery = `
      DELETE FROM sales_customer 
      WHERE id = ANY($1::uuid[]) AND tenant_id = $2
      RETURNING id
    `;
    const result = await client.query(deleteQuery, [ids, session.user.tenant_id]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: `${result.rows.length} customers deleted successfully`,
      deletedIds: result.rows.map(row => row.id)
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error bulk deleting customers:', error);
    return NextResponse.json(
      { error: 'Failed to delete customers', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}