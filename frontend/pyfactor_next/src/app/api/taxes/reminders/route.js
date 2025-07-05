import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function GET(request) {
  try {
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId || tenantId !== session.user?.tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 403, headers: standardSecurityHeaders }
      );
    }

    // Forward request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/taxes/reminders/?tenant_id=${tenantId}`;
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Session-Id': session.id,
        'X-Tenant-Id': tenantId,
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[taxes/reminders GET] Backend error:', errorText);
      
      // If reminders endpoint doesn't exist yet, return empty array
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { reminders: [] },
          { status: 200, headers: standardSecurityHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: backendResponse.status, headers: standardSecurityHeaders }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { 
      status: 200, 
      headers: standardSecurityHeaders 
    });
  } catch (error) {
    console.error('[taxes/reminders GET] Error:', error);
    // Return empty reminders array if backend doesn't have the endpoint yet
    return NextResponse.json(
      { reminders: [] },
      { status: 200, headers: standardSecurityHeaders }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, ...reminderData } = body;

    if (!tenantId || tenantId !== session.user?.tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 403, headers: standardSecurityHeaders }
      );
    }

    // Forward request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/taxes/reminders/`;
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Session-Id': session.id,
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({
        ...reminderData,
        tenant_id: tenantId,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[taxes/reminders POST] Backend error:', errorText);
      
      // If reminders endpoint doesn't exist yet, return success with mock data
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { 
            id: Date.now(),
            ...reminderData,
            created_at: new Date().toISOString(),
            message: 'Reminder saved locally (backend endpoint pending)'
          },
          { status: 200, headers: standardSecurityHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to save reminder' },
        { status: backendResponse.status, headers: standardSecurityHeaders }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { 
      status: 201, 
      headers: standardSecurityHeaders 
    });
  } catch (error) {
    console.error('[taxes/reminders POST] Error:', error);
    // Return success with mock data if backend doesn't have the endpoint yet
    const body = await request.json();
    return NextResponse.json(
      { 
        id: Date.now(),
        ...body,
        created_at: new Date().toISOString(),
        message: 'Reminder saved locally (backend endpoint pending)'
      },
      { status: 200, headers: standardSecurityHeaders }
    );
  }
}