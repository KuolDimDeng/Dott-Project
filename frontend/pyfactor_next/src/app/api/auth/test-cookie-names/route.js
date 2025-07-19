import { NextResponse } from 'next/server';

/**
 * Test different cookie names to see if 'sid' and 'session_token' are specifically blocked
 */
export async function GET(request) {
  console.log('🧪 [TestCookieNames] ===== COOKIE NAME TEST START =====');
  
  const testValue = '38a07d2b-a395-4b79-b190-2ca4ef5c70bc'; // Same format as real session
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = NextResponse.json({
    success: true,
    testValue,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      host: request.headers.get('host')
    },
    timestamp: new Date().toISOString()
  });
  
  // Base cookie options that work for test cookies
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400, // 24 hours
    ...(isProduction && { domain: '.dottapps.com' })
  };
  
  // Test various cookie names
  const cookieTests = [
    // Original problematic names
    { name: 'sid', desc: 'Original sid' },
    { name: 'session_token', desc: 'Original session_token' },
    
    // Variations of sid
    { name: 'SID', desc: 'Uppercase SID' },
    { name: 'sid_test', desc: 'sid with suffix' },
    { name: 'test_sid', desc: 'sid with prefix' },
    { name: 's_id', desc: 'sid with underscore' },
    { name: 'session_id', desc: 'session_id instead of sid' },
    
    // Variations of session
    { name: 'session', desc: 'Just session' },
    { name: 'sessionToken', desc: 'camelCase sessionToken' },
    { name: 'session-token', desc: 'Hyphenated session-token' },
    { name: 'sess_token', desc: 'Abbreviated sess_token' },
    
    // Common session cookie names
    { name: 'PHPSESSID', desc: 'PHP style' },
    { name: 'JSESSIONID', desc: 'Java style' },
    { name: 'ASP.NET_SessionId', desc: 'ASP.NET style' },
    { name: 'connect.sid', desc: 'Express.js style' },
    
    // Custom names
    { name: 'dott_session', desc: 'Custom prefixed' },
    { name: 'auth_token', desc: 'Auth token' },
    { name: 'user_session', desc: 'User session' },
    { name: 'app_session', desc: 'App session' }
  ];
  
  console.log('🧪 [TestCookieNames] Testing', cookieTests.length, 'cookie names...');
  
  // Set all test cookies
  cookieTests.forEach(({ name, desc }) => {
    try {
      response.cookies.set(name, testValue, cookieOptions);
      console.log(`✅ Set cookie: ${name} (${desc})`);
    } catch (error) {
      console.log(`❌ Failed to set cookie: ${name} (${desc}) - Error:`, error.message);
    }
  });
  
  // Also try setting with headers directly
  try {
    const headerCookie = `sid_direct=${testValue}; HttpOnly; Secure=${isProduction}; SameSite=lax; Path=/; Max-Age=86400${isProduction ? '; Domain=.dottapps.com' : ''}`;
    response.headers.append('Set-Cookie', headerCookie);
    console.log('✅ Set cookie via header: sid_direct');
  } catch (error) {
    console.log('❌ Failed to set cookie via header:', error.message);
  }
  
  console.log('🧪 [TestCookieNames] All Set-Cookie headers:', response.headers.getSetCookie ? response.headers.getSetCookie() : 'Not available');
  console.log('🧪 [TestCookieNames] ===== COOKIE NAME TEST END =====');
  
  return response;
}