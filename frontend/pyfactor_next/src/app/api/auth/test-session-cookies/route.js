import { NextResponse } from 'next/server';

/**
 * Test endpoint specifically for session cookie setting
 * This tests various formats to see what works
 */
export async function GET(request) {
  console.log('🧪 [TestSessionCookies] ===== SESSION COOKIE TEST START =====');
  
  const testSessionId = '38a07d2b-a395-4b79-b190-2ca4ef5c70bc'; // Same format as real session
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = NextResponse.json({
    success: true,
    testSessionId,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      host: request.headers.get('host')
    },
    timestamp: new Date().toISOString()
  });
  
  // Base cookie options that work for test cookies
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400 // 24 hours
  };
  
  // Test 1: sid with domain
  response.cookies.set('sid', testSessionId, {
    ...baseCookieOptions,
    domain: isProduction ? '.dottapps.com' : undefined
  });
  
  // Test 2: session_token with domain
  response.cookies.set('session_token', testSessionId, {
    ...baseCookieOptions,
    domain: isProduction ? '.dottapps.com' : undefined
  });
  
  // Test 3: sid without domain
  response.cookies.set('sid_no_domain', testSessionId, baseCookieOptions);
  
  // Test 4: Different name format
  response.cookies.set('sessionId', testSessionId, baseCookieOptions);
  
  // Test 5: Shorter value
  response.cookies.set('sid_short', 'test123', baseCookieOptions);
  
  // Test 6: Using headers directly
  const cookieString = `sid_header=${testSessionId}; HttpOnly; Secure=${isProduction}; SameSite=lax; Path=/; Max-Age=86400${isProduction ? '; Domain=.dottapps.com' : ''}`;
  response.headers.append('Set-Cookie', cookieString);
  
  // Test 7: Simple sid with no UUID
  response.cookies.set('sid_simple', 'simple123', baseCookieOptions);
  
  // Test 8: Base64 encoded UUID (in case special chars are an issue)
  const base64SessionId = Buffer.from(testSessionId).toString('base64');
  response.cookies.set('sid_base64', base64SessionId, baseCookieOptions);
  
  // Test 9: URL encoded UUID
  response.cookies.set('sid_urlencoded', encodeURIComponent(testSessionId), baseCookieOptions);
  
  // Test 10: Exact production pattern - no domain first
  const productionOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 86400
  };
  response.cookies.set('sid_prod_nodomain', testSessionId, productionOptions);
  
  console.log('🧪 [TestSessionCookies] Set-Cookie headers:', response.headers.getSetCookie ? response.headers.getSetCookie() : 'Not available');
  console.log('🧪 [TestSessionCookies] ===== SESSION COOKIE TEST END =====');
  
  return response;
}

export async function POST(request) {
  console.log('🧪 [TestSessionCookies] ===== FORM SESSION TEST START =====');
  
  const formData = await request.formData();
  const testSessionId = formData.get('sessionId') || '38a07d2b-a395-4b79-b190-2ca4ef5c70bc';
  const redirectUrl = formData.get('redirectUrl') || '/api/auth/debug-cookies';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Create redirect response
  const baseUrl = isProduction ? 'https://dottapps.com' : `https://${request.headers.get('host')}`;
  const absoluteUrl = `${baseUrl}${redirectUrl}`;
  
  const response = NextResponse.redirect(absoluteUrl, 303);
  
  // Set cookies on redirect (this works for form_test_cookie)
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
    ...(isProduction && { domain: '.dottapps.com' })
  };
  
  // Try setting both sid and session_token
  response.cookies.set('sid_form', testSessionId, cookieOptions);
  response.cookies.set('session_token_form', testSessionId, cookieOptions);
  
  console.log('🧪 [TestSessionCookies] Form redirect with session cookies');
  console.log('🧪 [TestSessionCookies] ===== FORM SESSION TEST END =====');
  
  return response;
}