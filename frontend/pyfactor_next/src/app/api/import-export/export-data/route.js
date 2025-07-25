import { NextResponse } from 'next/server';
import { getSession } from '../sessionHelper';
import { captureEvent } from '@/lib/posthog-server';

export async function POST(request) {
  console.log('🚀 [export-data] === POST /api/import-export/export-data START ===');
  console.log('🚀 [export-data] Timestamp:', new Date().toISOString());
  console.log('🚀 [export-data] Request headers:', {
    'content-type': request.headers.get('content-type'),
    'accept': request.headers.get('accept'),
    'cookie': request.headers.get('cookie') ? 'present (length: ' + request.headers.get('cookie').length + ')' : 'missing',
    'user-agent': request.headers.get('user-agent')?.substring(0, 50) + '...',
    'cache-control': request.headers.get('cache-control')
  });
  
  // Parse cookies for debugging
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const hasSid = cookies.some(c => c.startsWith('sid='));
  const hasSessionToken = cookies.some(c => c.startsWith('session_token='));
  const hasCsrf = cookies.some(c => c.startsWith('csrftoken='));
  console.log('🍪 [export-data] Cookie analysis:', {
    totalCookies: cookies.length,
    hasSid,
    hasSessionToken,
    hasCsrf,
    cookieNames: cookies.map(c => c.split('=')[0]).join(', ')
  });
  
  try {
    // Step 1: Check authentication
    console.log('🔐 [export-data] Step 1: Getting session...');
    const sessionStartTime = Date.now();
    
    let session;
    try {
      session = await getSession();
      const sessionTime = Date.now() - sessionStartTime;
      console.log(`🔐 [export-data] Session retrieved in ${sessionTime}ms`);
    } catch (sessionError) {
      console.error('❌ [export-data] Session retrieval error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to retrieve session', details: sessionError.message },
        { status: 500 }
      );
    }
    
    console.log('🔐 [export-data] Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      hasTenantId: !!session?.user?.tenant_id,
      hasBusinessName: !!session?.user?.businessName,
      sessionToken: session?.token ? 'present' : 'missing',
      sid: session?.sid ? 'present' : 'missing'
    });
    
    if (!session) {
      console.error('❌ [export-data] No session object returned from getSession()');
      console.error('❌ [export-data] This typically means:', [
        '1. No session cookie (sid or session_token) in request',
        '2. Session validation failed with backend',
        '3. Session expired or invalid'
      ]);
      return NextResponse.json(
        { error: 'No session found. Please sign in again.' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      console.error('❌ [export-data] Session exists but no user found');
      console.error('❌ [export-data] Session structure:', {
        hasUser: 'user' in session,
        hasToken: 'token' in session,
        hasSid: 'sid' in session,
        keys: Object.keys(session)
      });
      return NextResponse.json(
        { error: 'User not authenticated. Please sign in again.' },
        { status: 401 }
      );
    }

    // Step 2: Parse request body
    console.log('📦 [export-data] Step 2: Parsing request body...');
    let body;
    try {
      const bodyText = await request.text();
      console.log('📦 [export-data] Raw body length:', bodyText.length);
      body = JSON.parse(bodyText);
      console.log('✅ [export-data] Request body successfully parsed');
    } catch (parseError) {
      console.error('❌ [export-data] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: parseError.message },
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
    
    console.log('📦 [export-data] Export parameters:', {
      dataTypes: Array.isArray(dataTypes) ? dataTypes : 'invalid',
      dataTypesCount: Array.isArray(dataTypes) ? dataTypes.length : 0,
      format,
      dateRange,
      hasCustomDateRange: !!customDateRange,
      customDateRange,
      optionKeys: Object.keys(options)
    });

    // Step 3: Validate input
    console.log('✅ [export-data] Step 3: Validating input...');
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      console.error('❌ [export-data] Invalid data types:', dataTypes);
      return NextResponse.json(
        { error: 'No data types selected' },
        { status: 400 }
      );
    }

    // Step 4: Track analytics
    console.log('📊 [export-data] Step 4: Tracking analytics...');
    try {
      await captureEvent('data_export_requested', {
        userId: session.user.id,
        dataTypes,
        format,
        dateRange,
        userRole: session.user.role
      });
      console.log('✅ [export-data] Analytics tracked successfully');
    } catch (analyticsError) {
      console.warn('⚠️ [export-data] Analytics error (non-blocking):', analyticsError.message);
    }

    // Step 5: Prepare backend call
    console.log('🎯 [export-data] Step 5: Preparing backend call...');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const exportUrl = `${apiUrl}/api/data_export/export/`;
    
    console.log('🎯 [export-data] Backend endpoint:', exportUrl);
    console.log('🎯 [export-data] Request payload:', JSON.stringify({
      dataTypes,
      format,
      dateRange,
      customDateRange
    }, null, 2));
    
    const sessionToken = session.token || session.sid;
    console.log('🔑 [export-data] Using session token:', sessionToken ? sessionToken.substring(0, 8) + '...' : 'missing');
    
    try {
      // Step 6: Make backend request
      console.log('📡 [export-data] Step 6: Making backend request...');
      const backendStartTime = Date.now();
      
      // Get all cookies to forward to backend
      const cookieHeader = request.headers.get('cookie') || '';
      console.log('🍪 [export-data] Forwarding cookies to backend:', {
        cookieLength: cookieHeader.length,
        hasCookies: cookieHeader.length > 0
      });
      
      const backendHeaders = {
        'Cookie': cookieHeader, // Forward all cookies including csrftoken and sessionid
        'Content-Type': 'application/json',
        'Accept': 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Dott-Frontend-Export/1.0'
      };
      
      console.log('📡 [export-data] Backend request headers:', {
        ...backendHeaders,
        'Cookie': backendHeaders.Cookie ? 'present (length: ' + backendHeaders.Cookie.length + ')' : 'missing'
      });
      
      const backendResponse = await fetch(exportUrl, {
        method: 'POST',
        headers: backendHeaders,
        body: JSON.stringify({
          dataTypes,
          format,
          dateRange,
          customDateRange
        })
      });
      
      const backendTime = Date.now() - backendStartTime;
      console.log(`📡 [export-data] Backend responded in ${backendTime}ms`);
      
      // Log response details
      const responseHeaders = {};
      backendResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      console.log('📡 [export-data] Backend response:', {
        status: backendResponse.status,
        ok: backendResponse.ok,
        statusText: backendResponse.statusText,
        contentType: backendResponse.headers.get('content-type'),
        contentLength: backendResponse.headers.get('content-length'),
        contentDisposition: backendResponse.headers.get('content-disposition'),
        headers: responseHeaders
      });
      
      if (!backendResponse.ok) {
        console.error('❌ [export-data] Backend request failed');
        
        let errorDetails = '';
        let errorData = null;
        const contentType = backendResponse.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await backendResponse.json();
            errorDetails = JSON.stringify(errorData);
            console.error('❌ [export-data] Backend JSON error:', errorData);
          } else {
            errorDetails = await backendResponse.text();
            console.error('❌ [export-data] Backend text error:', errorDetails.substring(0, 500));
          }
        } catch (bodyError) {
          console.error('❌ [export-data] Failed to read backend error response:', bodyError);
          errorDetails = 'Unable to read error response from backend';
        }
        
        // Analyze error type
        let errorMessage = 'Export failed';
        if (backendResponse.status === 401) {
          errorMessage = 'Backend authentication failed';
        } else if (backendResponse.status === 403) {
          errorMessage = 'Insufficient permissions to export data';
        } else if (backendResponse.status === 404) {
          errorMessage = 'Export endpoint not found';
        } else if (backendResponse.status === 500) {
          errorMessage = 'Backend server error';
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        }
        
        console.error('❌ [export-data] Error summary:', {
          status: backendResponse.status,
          errorMessage,
          errorDetails: errorDetails.substring(0, 200)
        });
        
        return NextResponse.json(
          { error: errorMessage, details: errorDetails },
          { status: backendResponse.status }
        );
      }
      
      // Step 7: Process successful response
      console.log('✅ [export-data] Step 7: Processing successful response...');
      
      let fileBuffer;
      try {
        fileBuffer = await backendResponse.arrayBuffer();
        console.log('✅ [export-data] File buffer created:', {
          byteLength: fileBuffer.byteLength,
          sizeMB: (fileBuffer.byteLength / (1024 * 1024)).toFixed(2)
        });
      } catch (bufferError) {
        console.error('❌ [export-data] Failed to read response buffer:', bufferError);
        return NextResponse.json(
          { error: 'Failed to process export file', details: bufferError.message },
          { status: 500 }
        );
      }
      
      // Step 8: Track success
      console.log('📊 [export-data] Step 8: Tracking success...');
      try {
        await captureEvent('data_export_completed', {
          userId: session.user.id,
          dataTypes,
          format,
          fileSize: fileBuffer.byteLength,
          exportTime: Date.now() - backendStartTime
        });
        console.log('✅ [export-data] Success tracked');
      } catch (trackError) {
        console.warn('⚠️ [export-data] Failed to track success (non-blocking):', trackError.message);
      }
      
      // Step 9: Return file response
      console.log('📤 [export-data] Step 9: Preparing file response...');
      const contentType = backendResponse.headers.get('content-type') || 
        (format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
         format === 'pdf' ? 'application/pdf' : 'text/csv');
      const contentDisposition = backendResponse.headers.get('content-disposition') || 
        `attachment; filename="dott_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}"`;
      
      const responseHeaders = {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Export-Status': 'success',
        'X-Export-Format': format
      };
      
      console.log('📤 [export-data] Response headers:', responseHeaders);
      console.log('✅ [export-data] === Export successful! ===');
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: responseHeaders
      });
      
    } catch (backendError) {
      console.error('❌ [export-data] Backend call error:', backendError);
      console.error('❌ [export-data] Error details:', {
        name: backendError.name,
        message: backendError.message,
        stack: backendError.stack
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to communicate with backend', 
          details: backendError.message,
          type: 'backend_communication_error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [export-data] Unexpected error:', error);
    console.error('❌ [export-data] Error trace:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    // Try to track error
    try {
      await captureEvent('data_export_error', {
        error: error.message,
        errorType: error.name,
        dataTypes: body?.dataTypes || 'unknown'
      });
    } catch (trackError) {
      console.warn('⚠️ [export-data] Failed to track error:', trackError);
    }

    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error.message,
        type: 'unexpected_error'
      },
      { status: 500 }
    );
  } finally {
    console.log('🎬 [export-data] === POST /api/import-export/export-data END ===');
  }
}