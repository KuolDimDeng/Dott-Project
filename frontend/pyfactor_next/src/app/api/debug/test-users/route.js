import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    logger.info('[DebugTestUsers] Testing backend RBAC users endpoint');
    
    // Get cookies
    const cookieHeader = request.headers.get('cookie') || '';
    logger.info('[DebugTestUsers] Cookie header:', cookieHeader);
    
    // Test backend endpoint directly
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const fullUrl = `${backendUrl}/auth/rbac/users?unlinked=true`;
    
    logger.info('[DebugTestUsers] Testing URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      cache: 'no-store'
    });
    
    logger.info('[DebugTestUsers] Response status:', response.status);
    logger.info('[DebugTestUsers] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    logger.info('[DebugTestUsers] Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: 'Invalid JSON response', text: responseText };
    }
    
    return NextResponse.json({
      debug: true,
      backendUrl: fullUrl,
      status: response.status,
      ok: response.ok,
      data: data
    });
    
  } catch (error) {
    logger.error('[DebugTestUsers] Error:', error);
    return NextResponse.json({
      debug: true,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}