import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth';

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
    const is_recurring = searchParams.get('is_recurring');
    const is_for_sale = searchParams.get('is_for_sale');
    const is_for_rent = searchParams.get('is_for_rent');
    const charge_period = searchParams.get('charge_period');
    const price_min = searchParams.get('price_min');
    const price_max = searchParams.get('price_max');
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = 'SELECT * FROM inventory_service WHERE tenant_id = $1';
    const params = [tenantId];
    let paramCount = 1;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR service_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (is_recurring !== null && is_recurring !== '') {
      paramCount++;
      query += ` AND is_recurring = $${paramCount}`;
      params.push(is_recurring === 'true');
    }
    
    if (is_for_sale !== null && is_for_sale !== '') {
      paramCount++;
      query += ` AND is_for_sale = $${paramCount}`;
      params.push(is_for_sale === 'true');
    }
    
    if (is_for_rent !== null && is_for_rent !== '') {
      paramCount++;
      query += ` AND is_for_rent = $${paramCount}`;
      params.push(is_for_rent === 'true');
    }
    
    if (charge_period) {
      paramCount++;
      query += ` AND charge_period = $${paramCount}`;
      params.push(charge_period);
    }
    
    if (price_min) {
      paramCount++;
      query += ` AND price >= $${paramCount}`;
      params.push(parseFloat(price_min));
    }
    
    if (price_max) {
      paramCount++;
      query += ` AND price <= $${paramCount}`;
      params.push(parseFloat(price_max));
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const db = await getDb();
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    const sortColumn = ['name', 'service_code', 'price', 'created_at', 'updated_at'].includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, params);
    
    return NextResponse.json({
      services: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
    
  } catch (error) {
    logger.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
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
    if (!data.name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Generate service code
    const codeResult = await db.query(
      'SELECT COUNT(*) FROM inventory_service WHERE tenant_id = $1',
      [tenantId]
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const service_code = `SVC-${String(count).padStart(6, '0')}`;
    
    // Insert service
    const insertQuery = `
      INSERT INTO inventory_service (
        tenant_id, name, description, price, service_code,
        duration, is_recurring, is_for_sale, is_for_rent,
        salestax, charge_period, charge_amount,
        height, width, height_unit, width_unit,
        weight, weight_unit
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;
    
    const values = [
      tenantId,
      data.name,
      data.description || null,
      data.price || 0,
      service_code,
      data.duration || null,
      data.is_recurring || false,
      data.is_for_sale !== undefined ? data.is_for_sale : true,
      data.is_for_rent || false,
      data.salestax || 0,
      data.charge_period || 'day',
      data.charge_amount || 0,
      data.height || null,
      data.width || null,
      data.height_unit || 'cm',
      data.width_unit || 'cm',
      data.weight || null,
      data.weight_unit || 'kg'
    ];
    
    const result = await db.query(insertQuery, values);
    
    return NextResponse.json({
      service: result.rows[0],
      message: 'Service created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}