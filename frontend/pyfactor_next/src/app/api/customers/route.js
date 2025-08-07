import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/customers
 * Proxies to backend CRM customers API
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Customers API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('[Customers API] Fetching from backend with session:', sidCookie.value.substring(0, 8) + '...');
    
    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Customers API] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform data to match POS expectations
    const customers = data.results || data.customers || data;
    const transformedCustomers = Array.isArray(customers) ? customers.map(customer => ({
      id: customer.id,
      customer_name: customer.customer_name || customer.business_name || 
                     `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      business_name: customer.business_name,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.street || customer.address,
      city: customer.city,
      state: customer.billing_state || customer.state,
      postcode: customer.postcode || customer.zip_code,
      country: customer.billing_country || customer.country,
      account_number: customer.account_number,
      notes: customer.notes
    })) : [];

    return NextResponse.json({
      success: true,
      customers: transformedCustomers,
      pagination: data.pagination,
      total: data.count || transformedCustomers.length
    });
  } catch (error) {
    console.error('[Customers API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Creates a new customer via backend API
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create customer' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Customers API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}