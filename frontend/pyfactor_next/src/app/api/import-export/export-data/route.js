import { NextResponse } from 'next/server';
import { getSession } from '../sessionHelper';
import { captureEvent } from '@/lib/posthog-server';

export async function POST(request) {
  console.log('[export-data] === POST request received ===');
  console.log('[export-data] Request headers:', {
    'content-type': request.headers.get('content-type'),
    'cookie': request.headers.get('cookie')?.substring(0, 100) + '...',
    'user-agent': request.headers.get('user-agent')
  });
  
  try {
    // Check authentication
    console.log('[export-data] Getting session...');
    const session = await getSession();
    console.log('[export-data] Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      hasTenantId: !!session?.user?.tenant_id,
      sessionToken: session?.token ? 'present' : 'missing',
      sid: session?.sid ? 'present' : 'missing'
    });
    
    if (!session) {
      console.error('[export-data] No session object returned from getSession()');
      return NextResponse.json(
        { error: 'No session found. Please sign in again.' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      console.error('[export-data] Session exists but no user found');
      console.error('[export-data] Full session object:', JSON.stringify(session, null, 2));
      return NextResponse.json(
        { error: 'User not authenticated. Please sign in again.' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('[export-data] Request body successfully parsed:', body);
    } catch (parseError) {
      console.error('[export-data] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { 
      dataTypes, 
      format = 'excel', 
      dateRange = 'all',
      customDateRange,
      options = {}
    } = body;
    
    console.log('[export-data] Parsed parameters:', {
      dataTypes,
      format,
      dateRange,
      customDateRange,
      options
    });

    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return NextResponse.json(
        { error: 'No data types selected' },
        { status: 400 }
      );
    }

    // Track export request
    await captureEvent('data_export_requested', {
      userId: session.user.id,
      dataTypes,
      format,
      dateRange
    });

    // Call the backend export endpoint directly
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const exportUrl = `${apiUrl}/api/data_export/export/`;
    
    console.log('[export-data] Calling backend export endpoint:', exportUrl);
    console.log('[export-data] Request payload:', {
      dataTypes,
      format,
      dateRange,
      customDateRange
    });
    
    const sessionToken = session.token || session.sid;
    
    try {
      // Get all cookies to forward to backend
      const cookieHeader = request.headers.get('cookie') || '';
      
      const backendResponse = await fetch(exportUrl, {
        method: 'POST',
        headers: {
          'Cookie': cookieHeader, // Forward all cookies including csrftoken and sessionid
          'Content-Type': 'application/json',
          'Accept': 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        body: JSON.stringify({
          dataTypes,
          format,
          dateRange,
          customDateRange
        })
      });
      
      console.log('[export-data] Backend response:', {
        status: backendResponse.status,
        ok: backendResponse.ok,
        headers: Object.fromEntries(backendResponse.headers.entries())
      });
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('[export-data] Backend error:', errorText);
        return NextResponse.json(
          { error: 'Export failed', details: errorText },
          { status: backendResponse.status }
        );
      }
      
      // Get the file buffer from backend
      const fileBuffer = await backendResponse.arrayBuffer();
      
      // Track successful export
      await captureEvent('data_export_completed', {
        userId: session.user.id,
        dataTypes,
        format
      });
      
      // Return the file as a response with appropriate headers
      const contentType = backendResponse.headers.get('content-type') || 
        (format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
      const contentDisposition = backendResponse.headers.get('content-disposition') || 
        `attachment; filename="dott_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}"`;
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
    } catch (error) {
      console.error('[export-data] Error calling backend:', error);
      return NextResponse.json(
        { error: 'Export failed', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Export error:', error);
    
    await captureEvent('data_export_error', {
      error: error.message,
      dataTypes: request.body?.dataTypes
    });

    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}