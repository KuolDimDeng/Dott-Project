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
    
    // Map frontend field names to backend field names
    const mappedBody = {
      ...body,
      // Map address fields
      street: body.address || body.street || '',
      postcode: body.zip_code || body.postcode || '',
      billing_state: body.state || body.billing_state || '',
      billing_country: body.country || body.billing_country || '',
      // Keep original fields too for compatibility
      address: undefined, // Remove frontend field
      zip_code: undefined, // Remove frontend field
      state: undefined, // Remove frontend field  
      country: undefined, // Remove frontend field
    };
    
    // Clean up date fields - convert empty strings to null
    if (mappedBody.tax_exempt_expiry === '' || mappedBody.tax_exempt_expiry === undefined) {
      mappedBody.tax_exempt_expiry = null;
    }
    
    // Ensure boolean fields are properly typed
    if (mappedBody.is_tax_exempt !== undefined) {
      mappedBody.is_tax_exempt = Boolean(mappedBody.is_tax_exempt);
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
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customers API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}