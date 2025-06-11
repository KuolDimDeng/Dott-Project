import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
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
    let queryParams = [session.user.tenant_id];
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
      FROM sales_customer c
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
      FROM sales_customer c
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    client = await pool.connect();
    await client.query('SET search_path TO public');

    // Generate account number (you can customize this format)
    const accountNumber = `CUS${Date.now().toString().slice(-6)}`;

    const query = `
      INSERT INTO sales_customer (
        id, tenant_id, account_number, customer_name, company_name,
        business_name, first_name, last_name, email, phone, website,
        currency, street, city, billing_state, postcode, billing_country,
        ship_to_name, shipping_phone, shipping_state, shipping_country,
        delivery_instructions, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
      ) RETURNING *`;

    const values = [
      uuidv4(),
      session.user.tenant_id,
      accountNumber,
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
      data.notes
    ];

    const result = await client.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}