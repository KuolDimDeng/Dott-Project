import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request) {
  let client;
  
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Customers API] No session ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate session with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.log('[Customers API] Session validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const tenantId = sessionData.tenant_id || sessionData.tenant?.id;
    
    if (!tenantId) {
      console.log('[Customers API] No tenant ID in session');
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const customer_type = searchParams.get('customer_type') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const country = searchParams.get('country') || '';
    const has_purchases = searchParams.get('has_purchases') || '';

    const offset = (page - 1) * limit;

    client = await pool.connect();
    await client.query('SET search_path TO public');
    
    // Build the WHERE clause
    let whereConditions = ['tenant_id = $1'];
    let queryParams = [tenantId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(customer_name) LIKE LOWER($${paramCount}) OR 
        LOWER(business_name) LIKE LOWER($${paramCount}) OR 
        LOWER(first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(last_name) LIKE LOWER($${paramCount}) OR 
        LOWER(email) LIKE LOWER($${paramCount}) OR 
        phone LIKE $${paramCount} OR 
        account_number LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (customer_type) {
      paramCount++;
      if (customer_type === 'business') {
        whereConditions.push(`business_name IS NOT NULL AND business_name != ''`);
      } else {
        whereConditions.push(`(business_name IS NULL OR business_name = '')`);
      }
    }

    if (city) {
      paramCount++;
      whereConditions.push(`LOWER(city) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${city}%`);
    }

    if (state) {
      paramCount++;
      whereConditions.push(`LOWER(billing_state) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${state}%`);
    }

    if (country) {
      paramCount++;
      whereConditions.push(`LOWER(billing_country) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${country}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get customers with calculated fields
    let customersQuery = `
      SELECT 
        c.*,
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) as customer_name,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total), 0) as total_revenue
      FROM crm_customer c
      LEFT JOIN sales_invoice i ON c.id = i.customer_id AND i.tenant_id = $1
      WHERE ${whereClause}
      GROUP BY c.id
    `;

    // Add HAVING clause for has_purchases filter
    if (has_purchases === 'yes') {
      customersQuery += ' HAVING COUNT(DISTINCT i.id) > 0';
    } else if (has_purchases === 'no') {
      customersQuery += ' HAVING COUNT(DISTINCT i.id) = 0';
    }

    // Add ORDER BY
    const sortColumn = sortBy === 'customer_name' ? 'customer_name' : 
                      sortBy === 'total_revenue' ? 'total_revenue' :
                      `c.${sortBy}`;
    customersQuery += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    
    // Add pagination
    paramCount++;
    customersQuery += ` LIMIT $${paramCount}`;
    queryParams.push(limit);
    
    paramCount++;
    customersQuery += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const customersResult = await client.query(customersQuery, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM crm_customer c
      LEFT JOIN sales_invoice i ON c.id = i.customer_id AND i.tenant_id = $1
      WHERE ${whereClause}
    `;

    // Re-apply HAVING condition for count if needed
    if (has_purchases === 'yes') {
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT c.id
          FROM sales_customer c
          LEFT JOIN sales_invoice i ON c.id = i.customer_id AND i.tenant_id = $1
          WHERE ${whereClause}
          GROUP BY c.id
          HAVING COUNT(DISTINCT i.id) > 0
        ) as filtered_customers
      `;
    } else if (has_purchases === 'no') {
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT c.id
          FROM sales_customer c
          LEFT JOIN sales_invoice i ON c.id = i.customer_id AND i.tenant_id = $1
          WHERE ${whereClause}
          GROUP BY c.id
          HAVING COUNT(DISTINCT i.id) = 0
        ) as filtered_customers
      `;
    }

    const countResult = await client.query(countQuery, queryParams.slice(0, paramCount - 2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      customers: customersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      total,
      totalPages,
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export async function POST(request) {
  let client;
  
  try {
    console.log('[Customers API] POST request received');
    
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Customers API] No session ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate session with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.log('[Customers API] Session validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const tenantId = sessionData.tenant_id || sessionData.tenant?.id;
    
    if (!tenantId) {
      console.log('[Customers API] No tenant ID in session');
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }
    
    console.log('[Customers API] Session validated, tenant ID:', tenantId);

    const data = await request.json();
    console.log('[Customers API] Customer data received:', JSON.stringify(data, null, 2));
    
    client = await pool.connect();
    await client.query('SET search_path TO public');

    // Generate account number (you can customize this format)
    const accountNumber = `CUS${Date.now().toString().slice(-6)}`;

    // First, check what columns exist in the table
    const checkTableQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'crm_customer' 
      AND table_schema = 'public'
      ORDER BY ordinal_position`;
    
    const tableInfo = await client.query(checkTableQuery);
    console.log('[Customers API] Table columns:', tableInfo.rows.map(r => r.column_name));
    
    // Build insert query with columns matching Django model
    const query = `
      INSERT INTO crm_customer (
        id, tenant_id, account_number,
        business_name, first_name, last_name, email, phone,
        street, city, billing_state, postcode, billing_country,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING *`;

    const customerId = uuidv4();
    console.log('[Customers API] Generated customer ID:', customerId);
    
    const values = [
      customerId,
      tenantId,
      accountNumber,
      data.business_name || '',
      data.first_name || '',
      data.last_name || '',
      data.email || '',
      data.phone || '',
      data.address || data.street || '',  // street column
      data.city || '',
      data.state || data.billing_state || '',  // billing_state column
      data.zip_code || data.postcode || '',  // postcode column
      data.country || data.billing_country || '',  // billing_country column
      data.notes || ''
    ];

    console.log('[Customers API] Executing insert query...');
    const result = await client.query(query, values);
    console.log('[Customers API] Customer created successfully:', result.rows[0]);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error('[Customers API] Error creating customer:', error);
    console.error('[Customers API] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create customer', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}