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
    
    // Map frontend field names to backend field names
    const mappedBody = {
      ...body,
      // Map address fields
      street: body.address || body.street || '',
      postcode: body.zip_code || body.postcode || '',
      billing_state: body.state || body.billing_state || '',
      billing_country: body.country || body.billing_country || '',
      // Remove frontend fields
      address: undefined,
      zip_code: undefined,
      state: undefined,
      country: undefined,
    };
    
    // Clean up date fields - convert empty strings to null
    if (mappedBody.tax_exempt_expiry === '' || mappedBody.tax_exempt_expiry === undefined) {
      mappedBody.tax_exempt_expiry = null;
    }
    
    // Ensure boolean fields are properly typed
    if (mappedBody.is_tax_exempt !== undefined) {
      mappedBody.is_tax_exempt = Boolean(mappedBody.is_tax_exempt);
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