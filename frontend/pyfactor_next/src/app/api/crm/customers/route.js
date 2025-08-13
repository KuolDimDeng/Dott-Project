import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * Proxy for CRM customer API endpoints
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend with query parameters
    // Backend will determine tenant from the session
    const url = `${BACKEND_URL}/api/crm/customers/${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[CRM Customers API] GET error:', {
        status: response.status,
        statusText: response.statusText,
        error: error.substring(0, 500)
      });
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customers API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    console.log('[CRM Customers API] POST request body:', JSON.stringify(body));
    
    // Create a new object with properly mapped fields
    const mappedBody = {
      // Personal info
      first_name: body.first_name || '',
      last_name: body.last_name || '',
      business_name: body.business_name || '',
      email: body.email || '',
      phone: body.phone || '',
      notes: body.notes || '',
      
      // Billing address fields - map frontend names to backend names
      street: body.address || body.street || '',
      city: body.city || '',
      billing_state: body.state || body.billing_state || '',
      billing_county: body.billing_county || '',
      postcode: body.zip_code || body.postcode || '',
      billing_country: body.country || body.billing_country || '',
      
      // Shipping address fields
      shipping_street: body.shipping_street || '',
      shipping_city: body.shipping_city || '',
      shipping_state: body.shipping_state || '',
      shipping_county: body.shipping_county || '',
      shipping_postcode: body.shipping_postcode || '',
      shipping_country: body.shipping_country || '',
      
      // Tax exemption fields
      is_tax_exempt: Boolean(body.is_tax_exempt),
      tax_exempt_certificate: body.tax_exempt_certificate || '',
      tax_exempt_expiry: body.tax_exempt_expiry || null,
    };
    
    // Clean up date fields - convert empty strings to null
    if (mappedBody.tax_exempt_expiry === '') {
      mappedBody.tax_exempt_expiry = null;
    }
    
    console.log('[CRM Customers API] Mapped body:', JSON.stringify(mappedBody));
    console.log('[CRM Customers API] Forwarding to:', `${BACKEND_URL}/api/crm/customers/`);
    
    // Forward request to Django backend
    // Backend will determine tenant from the session
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappedBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[CRM Customers API] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        error: error.substring(0, 500),
        mappedBody: JSON.stringify(mappedBody)
      });
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customers API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}