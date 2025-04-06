import { NextResponse } from 'next/server';
import { createDbPool } from '../tenant/db-config';

export async function GET(request) {
  let pool = null;
  try {
    // Get schema from query params
    const url = new URL(request.url);
    const schema = url.searchParams.get('schema') || 'public';
    
    console.log(`[api/vendors] GET request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Query to get vendors
    const query = `
      SELECT * FROM "${schema}"."vendors"
      ORDER BY "name" ASC
    `;
    
    const result = await pool.query(query);
    console.log(`[api/vendors] Successfully retrieved ${result.rows.length} vendors`);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(`[api/vendors] Error fetching vendors:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.log('[api/vendors] Table does not exist yet. Returning empty array.');
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
    
    console.log(`[api/vendors] POST request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Query to create vendor
    const query = `
      INSERT INTO "${schema}"."vendors" (
        "name", "contact_name", "email", "phone", 
        "address_line1", "address_line2", "city", "state", 
        "postal_code", "country", "notes", "tenant_id"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      body.name,
      body.contact_name,
      body.email,
      body.phone,
      body.address_line1,
      body.address_line2,
      body.city,
      body.state,
      body.postal_code,
      body.country,
      body.notes,
      body.tenant_id
    ];
    
    const result = await pool.query(query, values);
    console.log(`[api/vendors] Successfully created vendor with ID: ${result.rows[0].id}`);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`[api/vendors] Error creating vendor:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return NextResponse.json(
        { message: 'Vendors table does not exist. Please initialize schema first.' },
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