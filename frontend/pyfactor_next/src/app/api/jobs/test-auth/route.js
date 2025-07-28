import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[TEST-AUTH] === START ===');
  
  try {
    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    console.log('[TEST-AUTH] All cookies:', allCookies.map(c => ({
      name: c.name,
      value: c.value?.substring(0, 20) + '...',
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite
    })));
    
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      return NextResponse.json({
        error: 'No session cookie found',
        cookies: allCookies.map(c => c.name)
      }, { status: 401 });
    }
    
    // Test direct backend call
    console.log('[TEST-AUTH] Testing backend with sid:', sid.value.substring(0, 20) + '...');
    
    const response = await fetch(`${BACKEND_URL}/api/jobs/data/customers/`, {
      headers: {
        'Authorization': `Session ${sid.value}`,
        'Cookie': `sid=${sid.value}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('[TEST-AUTH] Backend response status:', response.status);
    console.log('[TEST-AUTH] Backend response headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('[TEST-AUTH] Backend response text (first 200 chars):', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { rawText: text.substring(0, 500), parseError: e.message };
    }
    
    return NextResponse.json({
      status: 'Test complete',
      backendStatus: response.status,
      backendOk: response.ok,
      sid: sid.value.substring(0, 20) + '...',
      data: data
    });
    
  } catch (error) {
    console.error('[TEST-AUTH] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}