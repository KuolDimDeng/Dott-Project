import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const { id } = await params;
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${id}/`, {
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
    console.error('[CRM Customer Detail API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const { id } = await params;
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
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
    
    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${id}/`, {
      method: 'PUT',
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
    console.error('[CRM Customer Update API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const { id } = await params;
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customer PATCH API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const { id } = await params;
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to delete customer';
      try {
        const errorText = await response.text();
        // Try to parse as JSON first
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.detail || errorMessage;
        } catch {
          // If not JSON, use the text directly
          errorMessage = errorText || errorMessage;
        }
      } catch {
        // If we can't even read the response, use default message
      }
      console.error('[CRM Customer Delete API] Backend error:', response.status, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CRM Customer Delete API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}