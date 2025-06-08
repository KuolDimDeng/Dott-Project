import { NextResponse } from 'next/server';
import { createDbPool } from '../tenant/db-config';

export async function GET(request) {
  let pool = null;
  try {
    // Get schema from query params
    const url = new URL(request.url);
    const schema = url.searchParams.get('schema') || 'public';
    
    console.log(`[api/bills] GET request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Query to get bills
    const query = `
      SELECT * FROM "${schema}"."bills"
      ORDER BY "date" DESC
    `;
    
    const result = await pool.query(query);
    console.log(`[api/bills] Successfully retrieved ${result.rows.length} bills`);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(`[api/bills] Error fetching bills:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.log('[api/bills] Table does not exist yet. Returning empty array.');
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { message: error.message, error: error.stack },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.end();
  }
}

export async function POST(request) {
  let pool = null;
  try {
    // Get schema from query params
    const url = new URL(request.url);
    const schema = url.searchParams.get('schema') || 'public';
    
    // Parse request body
    const body = await request.json();
    
    console.log(`[api/bills] POST request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Query to create bill
    const query = `
      INSERT INTO "${schema}"."bills" (
        "bill_num", "vendor_id", "date", "due_date", 
        "status", "total_amount", "notes", "currency", "tenant_id"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      body.bill_num || `BILL-${Date.now()}`,
      body.vendor_id,
      body.date || new Date(),
      body.due_date,
      body.status || 'unpaid',
      body.total_amount || 0,
      body.notes,
      body.currency || 'USD',
      body.tenant_id
    ];
    
    const result = await pool.query(query, values);
    console.log(`[api/bills] Successfully created bill with ID: ${result.rows[0].id}`);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`[api/bills] Error creating bill:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return NextResponse.json(
        { message: 'Bills table does not exist. Please initialize schema first.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: error.message, error: error.stack },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.end();
  }
} 