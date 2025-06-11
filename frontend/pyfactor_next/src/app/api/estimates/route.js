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
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');
    const amountMin = searchParams.get('amount_min');
    const amountMax = searchParams.get('amount_max');
    const expiringSoon = searchParams.get('expiring_soon') === 'true';
    
    const offset = (page - 1) * limit;
    
    // Build query with customer join
    let query = `
      SELECT 
        e.*,
        c.customer_name,
        c.company_name,
        c.email as customer_email,
        c.phone as customer_phone,
        CASE 
          WHEN e.valid_until < CURRENT_DATE THEN 'expired'
          WHEN e.status IS NULL THEN 'draft'
          ELSE e.status
        END as status
      FROM sales_estimate e
      LEFT JOIN crm_customer c ON e.customer_id = c.id
      WHERE e.tenant_id = $1
    `;
    const params = [tenantId];
    let paramCount = 1;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (e.estimate_num ILIKE $${paramCount} OR c.customer_name ILIKE $${paramCount} OR e.title ILIKE $${paramCount} OR e.customer_ref ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (status) {
      if (status === 'expired') {
        query += ` AND e.valid_until < CURRENT_DATE`;
      } else {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(status);
      }
    }
    
    if (customerId) {
      paramCount++;
      query += ` AND e.customer_id = $${paramCount}`;
      params.push(customerId);
    }
    
    if (dateStart) {
      paramCount++;
      query += ` AND e.created_at >= $${paramCount}`;
      params.push(dateStart);
    }
    
    if (dateEnd) {
      paramCount++;
      query += ` AND e.created_at <= $${paramCount}`;
      params.push(dateEnd);
    }
    
    if (amountMin) {
      paramCount++;
      query += ` AND e."totalAmount" >= $${paramCount}`;
      params.push(parseFloat(amountMin));
    }
    
    if (amountMax) {
      paramCount++;
      query += ` AND e."totalAmount" <= $${paramCount}`;
      params.push(parseFloat(amountMax));
    }
    
    if (expiringSoon) {
      query += ` AND e.valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`;
    }
    
    // Get total count
    const countQuery = query.replace(
      'SELECT e.*, c.customer_name, c.company_name, c.email as customer_email, c.phone as customer_phone, CASE WHEN e.valid_until < CURRENT_DATE THEN \'expired\' WHEN e.status IS NULL THEN \'draft\' ELSE e.status END as status', 
      'SELECT COUNT(*)'
    );
    const db = await getDb();
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    const sortColumn = ['estimate_num', 'customer_name', 'title', 'created_at', 'valid_until', 'totalAmount'].includes(sortBy) 
      ? (sortBy === 'totalAmount' ? `e."totalAmount"` : (sortBy === 'customer_name' ? 'c.customer_name' : `e.${sortBy}`))
      : 'e.created_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, params);
    
    // Fetch items for each estimate
    const estimatesWithItems = await Promise.all(
      result.rows.map(async (estimate) => {
        const itemsQuery = `
          SELECT 
            ei.*,
            p.name as product_name,
            s.service_name
          FROM sales_estimateitem ei
          LEFT JOIN inventory_product p ON ei.product_id = p.id
          LEFT JOIN inventory_service s ON ei.service_id = s.id
          WHERE ei.estimate_id = $1
          ORDER BY ei.id
        `;
        const itemsResult = await db.query(itemsQuery, [estimate.id]);
        return {
          ...estimate,
          items: itemsResult.rows
        };
      })
    );
    
    return NextResponse.json({
      estimates: estimatesWithItems,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
    
  } catch (error) {
    logger.error('Error fetching estimates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimates' },
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
    const requiredFields = ['customer_id', 'title', 'valid_until'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field.replace('_', ' ')} is required` },
          { status: 400 }
        );
      }
    }
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Generate estimate number
      const numberResult = await db.query(
        'SELECT COUNT(*) FROM sales_estimate WHERE tenant_id = $1',
        [tenantId]
      );
      const count = parseInt(numberResult.rows[0].count) + 1;
      const estimate_num = `EST-${String(count).padStart(8, '0')}`;
      
      // Insert estimate
      const insertQuery = `
        INSERT INTO sales_estimate (
          tenant_id, estimate_num, customer_id, "totalAmount", 
          title, summary, valid_until, customer_ref, 
          discount, currency, footer
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `;
      
      const values = [
        tenantId,
        estimate_num,
        data.customer_id,
        data.totalAmount || 0,
        data.title,
        data.summary || null,
        data.valid_until,
        data.customer_ref || null,
        data.discount || 0,
        data.currency || 'USD',
        data.footer || null
      ];
      
      const estimateResult = await db.query(insertQuery, values);
      const estimate = estimateResult.rows[0];
      
      // Insert items
      for (const item of data.items) {
        const itemQuery = `
          INSERT INTO sales_estimateitem (
            estimate_id, product_id, service_id, 
            description, quantity, unit_price
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `;
        
        await db.query(itemQuery, [
          estimate.id,
          item.product_id || null,
          item.service_id || null,
          item.description || '',
          item.quantity,
          item.unit_price
        ]);
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch customer info for response
      const customerResult = await db.query(
        'SELECT customer_name, company_name, email, phone FROM crm_customer WHERE id = $1',
        [data.customer_id]
      );
      
      if (customerResult.rows.length > 0) {
        estimate.customer_name = customerResult.rows[0].customer_name;
        estimate.company_name = customerResult.rows[0].company_name;
        estimate.customer_email = customerResult.rows[0].email;
        estimate.customer_phone = customerResult.rows[0].phone;
      }
      
      // Add status
      estimate.status = 'draft';
      
      return NextResponse.json({
        estimate,
        message: 'Estimate created successfully'
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Error creating estimate:', error);
    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    );
  }
}