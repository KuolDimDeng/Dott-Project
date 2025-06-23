import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy for CRM customer API endpoints
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get tenant ID from current session
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `session_token=${sidCookie.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.error('[CRM Customers API] Failed to get session:', sessionResponse.status);
      return NextResponse.json({ error: 'Session validation failed' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const tenantId = sessionData.tenant_id || sessionData.tenant?.id;
    
    if (!tenantId) {
      console.error('[CRM Customers API] No tenant ID in session:', sessionData);
      return NextResponse.json({ error: 'Tenant ID required for this resource' }, { status: 403 });
    }
    
    // Forward request to Django backend with tenant ID
    const response = await fetch(`${API_URL}/api/crm/customers/?tenant_id=${tenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
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
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get tenant ID from current session
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `session_token=${sidCookie.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.error('[CRM Customers API] Failed to get session:', sessionResponse.status);
      return NextResponse.json({ error: 'Session validation failed' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const tenantId = sessionData.tenant_id || sessionData.tenant?.id;
    
    if (!tenantId) {
      console.error('[CRM Customers API] No tenant ID in session:', sessionData);
      return NextResponse.json({ error: 'Tenant ID required for this resource' }, { status: 403 });
    }
    
    // Get request body and add tenant_id
    const body = await request.json();
    const bodyWithTenant = {
      ...body,
      tenant_id: tenantId
    };
    
    // Forward request to Django backend with tenant ID
    const response = await fetch(`${API_URL}/api/crm/customers/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(bodyWithTenant),
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