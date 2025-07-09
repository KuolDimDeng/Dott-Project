// Admin endpoint to check and setup tenant schema
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Verify admin session
async function verifyAdminSession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return null;
    }
    
    // Verify with backend
    const response = await fetch(`${API_BASE_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      // Check if user is admin/owner
      if (sessionData.user?.role === 'OWNER' || sessionData.user?.role === 'ADMIN') {
        return sessionData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Schema Setup API] Session verification error:', error);
    return null;
  }
}

// GET - Check schema status
export async function GET(request) {
  try {
    console.log('[Schema Setup API] Checking schema status');
    const sessionData = await verifyAdminSession();
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    // Call backend to check schema status
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
    const response = await fetch(
      `${API_BASE_URL}/api/admin/schema-status/?tenant_id=${tenantId}`,
      {
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Schema Setup API] Backend error:', errorText);
      
      // Return basic info if backend doesn't have this endpoint
      return NextResponse.json({
        tenantId,
        status: 'unknown',
        message: 'Schema status endpoint not available',
        tables: [],
        needsSetup: true
      });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Schema Setup API] Error checking schema:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Trigger schema setup
export async function POST(request) {
  try {
    console.log('[Schema Setup API] Triggering schema setup');
    const sessionData = await verifyAdminSession();
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    console.log('[Schema Setup API] Setting up schema for tenant:', tenantId);
    
    // Call backend to trigger schema setup
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
    const response = await fetch(
      `${API_BASE_URL}/api/admin/setup-tenant-schema/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenant_id: tenantId })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Schema Setup API] Backend error:', errorText);
      
      // If endpoint doesn't exist, provide instructions
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Schema setup endpoint not available',
          instructions: 'Please run the following Django management command on the backend:',
          command: `python manage.py setup_tenant_schema ${tenantId}`,
          alternativeCommands: [
            `python manage.py migrate_schemas --tenant ${tenantId}`,
            `python manage.py create_tenant_schema --schema ${tenantId}`,
            `python manage.py sync_schemas --tenant ${tenantId}`
          ]
        }, { status: 404 });
      }
      
      return NextResponse.json(
        { error: 'Failed to setup schema', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Schema setup completed',
      ...data
    });
    
  } catch (error) {
    console.error('[Schema Setup API] Error setting up schema:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}