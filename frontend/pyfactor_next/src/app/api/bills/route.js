import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth-server';

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
    const sortBy = searchParams.get('sortBy') || 'bill_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const isPaid = searchParams.get('is_paid');
    const vendorId = searchParams.get('vendor_id');
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');
    const amountMin = searchParams.get('amount_min');
    const amountMax = searchParams.get('amount_max');
    
    const offset = (page - 1) * limit;
    
    // Build query with vendor join
    let query = `
      SELECT 
        b.*,
        v.vendor_name,
        v.vendor_number
      FROM purchases_bill b
      LEFT JOIN purchases_vendor v ON b.vendor_id = v.id AND v.tenant_id = $1
      WHERE b.tenant_id = $1
    `;
    const params = [tenantId];
    let paramCount = 1;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (b.bill_number ILIKE $${paramCount} OR v.vendor_name ILIKE $${paramCount} OR b.poso_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (isPaid === 'true' || isPaid === 'false') {
      paramCount++;
      query += ` AND b.is_paid = $${paramCount}`;
      params.push(isPaid === 'true');
    } else if (isPaid === 'overdue') {
      query += ` AND b.is_paid = false AND b.due_date < CURRENT_DATE`;
    }
    
    if (vendorId) {
      paramCount++;
      query += ` AND b.vendor_id = $${paramCount}`;
      params.push(vendorId);
    }
    
    if (dateStart) {
      paramCount++;
      query += ` AND b.bill_date >= $${paramCount}`;
      params.push(dateStart);
    }
    
    if (dateEnd) {
      paramCount++;
      query += ` AND b.bill_date <= $${paramCount}`;
      params.push(dateEnd);
    }
    
    if (amountMin) {
      paramCount++;
      query += ` AND b."totalAmount" >= $${paramCount}`;
      params.push(parseFloat(amountMin));
    }
    
    if (amountMax) {
      paramCount++;
      query += ` AND b."totalAmount" <= $${paramCount}`;
      params.push(parseFloat(amountMax));
    }
    
    // Get total count
    const countQuery = query.replace(
      'SELECT b.*, v.vendor_name, v.vendor_number', 
      'SELECT COUNT(*)'
    );
    const db = await getDb();
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    const sortColumn = ['bill_number', 'vendor_name', 'bill_date', 'due_date', 'totalAmount', 'created_at'].includes(sortBy) 
      ? (sortBy === 'totalAmount' ? `b."totalAmount"` : (sortBy === 'vendor_name' ? 'v.vendor_name' : `b.${sortBy}`))
      : 'b.bill_date';
    query += ` ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, params);
    
    return NextResponse.json({
      bills: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
    
  } catch (error) {
    logger.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
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
    const requiredFields = ['vendor_id', 'bill_date', 'due_date', 'totalAmount'];
    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) {
        return NextResponse.json(
          { error: `${field.replace('_', ' ')} is required` },
          { status: 400 }
        );
      }
    }
    
    const db = await getDb();
    
    // Generate bill number
    const numberResult = await db.query(
      'SELECT COUNT(*) FROM purchases_bill WHERE tenant_id = $1',
      [tenantId]
    );
    const count = parseInt(numberResult.rows[0].count) + 1;
    const bill_number = `BILL-${String(count).padStart(8, '0')}`;
    
    // Get user's current currency preference for new bills
    let userCurrency = 'USD'; // fallback
    try {
      logger.info('[Bills API] Fetching user currency preference...');
      // Bills API uses direct database access, so we need to get session from request
      const cookieStore = request.headers.get('cookie');
      const sidMatch = cookieStore?.match(/sid=([^;]+)/);
      const sidValue = sidMatch?.[1];
      
      if (sidValue) {
        const currencyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/currency/preferences/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sidValue}`,
          },
        });
        
        if (currencyResponse.ok) {
          const currencyData = await currencyResponse.json();
          if (currencyData.success && currencyData.preferences?.currency_code) {
            userCurrency = currencyData.preferences.currency_code;
            logger.info('[Bills API] Using user preferred currency:', userCurrency);
          } else {
            logger.warn('[Bills API] Currency preference response missing currency_code:', currencyData);
          }
        } else {
          logger.warn('[Bills API] Failed to fetch currency preference, using USD default');
        }
      }
    } catch (currencyError) {
      logger.error('[Bills API] Error fetching currency preference:', currencyError);
    }
    
    // Insert bill
    const insertQuery = `
      INSERT INTO purchases_bill (
        tenant_id, bill_number, vendor_id, bill_date, due_date,
        "totalAmount", currency, poso_number, notes, is_paid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;
    
    const values = [
      tenantId,
      bill_number,
      data.vendor_id,
      data.bill_date,
      data.due_date,
      data.totalAmount,
      data.currency || userCurrency,
      data.poso_number || null,
      data.notes || null,
      data.is_paid || false
    ];
    
    const result = await db.query(insertQuery, values);
    
    // Fetch vendor info for response
    const vendorResult = await db.query(
      'SELECT vendor_name, vendor_number FROM purchases_vendor WHERE id = $1 AND tenant_id = $2',
      [data.vendor_id, tenantId]
    );
    
    const bill = result.rows[0];
    if (vendorResult.rows.length > 0) {
      bill.vendor_name = vendorResult.rows[0].vendor_name;
      bill.vendor_number = vendorResult.rows[0].vendor_number;
    }
    
    return NextResponse.json({
      bill,
      message: 'Bill created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}