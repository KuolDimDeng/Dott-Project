import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const { id } = params;

    // Forward to Django backend - no need for X-Tenant-ID, backend handles it via session
    const response = await fetch(`${API_URL}/api/hr/employees/${id}/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Employee] Get failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get employee' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Employee] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Full update of employee
export async function PUT(request, { params }) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    
    logger.info('[Employee] Updating employee:', { id, fieldsToUpdate: Object.keys(body) });

    // Forward to Django backend
    const response = await fetch(`${API_URL}/api/hr/employees/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Employee] Update failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to update employee' }, { status: response.status });
    }

    const data = await response.json();
    logger.info('[Employee] Update successful:', { id });
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Employee] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Partial update (e.g., status change)
export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    
    logger.info('[Employee] Patching employee:', { id, updates: body });

    // Forward to Django backend
    const response = await fetch(`${API_URL}/api/hr/employees/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Employee] Patch failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to update employee status' }, { status: response.status });
    }

    const data = await response.json();
    logger.info('[Employee] Patch successful:', { id, status: body.status });
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Employee] Patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}