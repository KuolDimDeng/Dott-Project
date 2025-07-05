import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth.server';

export async function GET(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const state = searchParams.get('state') || '';
    const city = searchParams.get('city') || '';
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = 'SELECT * FROM purchases_vendor WHERE tenant_id = $1';
    const params = [tenantId];
    let paramCount = 1;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (vendor_name ILIKE $${paramCount} OR vendor_number ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (state) {
      paramCount++;
      query += ` AND state ILIKE $${paramCount}`;
      params.push(`%${state}%`);
    }
    
    if (city) {
      paramCount++;
      query += ` AND city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const db = await getDb();
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    const sortColumn = ['vendor_name', 'vendor_number', 'city', 'state', 'created_at', 'updated_at'].includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, params);
    
    return NextResponse.json({
      vendors: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
    
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['vendor_name', 'street', 'postcode', 'city', 'state'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field.replace('_', ' ')} is required` },
          { status: 400 }
        );
      }
    }
    
    const db = await getDb();
    
    // Generate vendor number
    const numberResult = await db.query(
      'SELECT COUNT(*) FROM purchases_vendor WHERE tenant_id = $1',
      [tenantId]
    );
    const count = parseInt(numberResult.rows[0].count) + 1;
    const vendor_number = `V-${String(count).padStart(8, '0')}`;
    
    // Insert vendor
    const insertQuery = `
      INSERT INTO purchases_vendor (
        tenant_id, vendor_number, vendor_name, street, postcode, 
        city, state, phone
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `;
    
    const values = [
      tenantId,
      vendor_number,
      data.vendor_name,
      data.street,
      data.postcode,
      data.city,
      data.state,
      data.phone || null
    ];
    
    const result = await db.query(insertQuery, values);
    
    return NextResponse.json({
      vendor: result.rows[0],
      message: 'Vendor created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}