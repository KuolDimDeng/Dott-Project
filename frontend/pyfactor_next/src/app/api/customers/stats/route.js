import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request) {
  let client;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    client = await pool.connect();
    await client.query('SET search_path TO public');
    
    // Get total customers
    const totalQuery = `
      SELECT COUNT(*) as total 
      FROM sales_customer 
      WHERE tenant_id = $1
    `;
    const totalResult = await client.query(totalQuery, [session.user.tenant_id]);
    
    // Get active customers (customers with at least one invoice)
    const activeQuery = `
      SELECT COUNT(DISTINCT c.id) as active
      FROM sales_customer c
      INNER JOIN sales_invoice i ON c.id = i.customer_id
      WHERE c.tenant_id = $1 AND i.tenant_id = $1
    `;
    const activeResult = await client.query(activeQuery, [session.user.tenant_id]);
    
    // Get new customers this month
    const newThisMonthQuery = `
      SELECT COUNT(*) as new_this_month
      FROM sales_customer
      WHERE tenant_id = $1
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const newThisMonthResult = await client.query(newThisMonthQuery, [session.user.tenant_id]);
    
    // Get total revenue and average order value
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(i.total), 0) as total_revenue,
        COALESCE(AVG(i.total), 0) as average_order_value,
        COUNT(i.id) as total_orders
      FROM sales_invoice i
      WHERE i.tenant_id = $1
      AND i.status != 'draft'
    `;
    const revenueResult = await client.query(revenueQuery, [session.user.tenant_id]);

    return NextResponse.json({
      total: parseInt(totalResult.rows[0].total),
      active: parseInt(activeResult.rows[0].active),
      new_this_month: parseInt(newThisMonthResult.rows[0].new_this_month),
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      average_order_value: parseFloat(revenueResult.rows[0].average_order_value),
      total_orders: parseInt(revenueResult.rows[0].total_orders)
    });

  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer stats', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}