import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to test cookie parsing and setting at the lowest level
 */
export async function GET(request) {
  console.log('🔍 [DebugCookieParser] ===== COOKIE PARSER DEBUG START =====');
  
  // Test 1: Raw cookie header
  const rawCookieHeader = request.headers.get('cookie');
  console.log('🔍 [DebugCookieParser] Raw Cookie Header:', rawCookieHeader);
  
  // Test 2: Next.js cookies() function
  const cookieStore = cookies();
  const nextJsCookies = cookieStore.getAll();
  console.log('🔍 [DebugCookieParser] Next.js cookies():', nextJsCookies.map(c => ({
    name: c.name,
    value: c.value?.substring(0, 20) + '...',
    length: c.value?.length
  })));
  
  // Test 3: Manual cookie parsing
  const manualParsedCookies = {};
  if (rawCookieHeader) {
    rawCookieHeader.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name) {
        const value = valueParts.join('='); // Handle values with = in them
        manualParsedCookies[name] = value;
      }
    });
  }
  console.log('🔍 [DebugCookieParser] Manual parsed cookies:', Object.entries(manualParsedCookies).map(([name, value]) => ({
    name,
    value: value?.substring(0, 20) + '...',
    length: value?.length
  })));
  
  // Test 4: Check for specific cookies
  const targetCookies = ['sid', 'session_token', 'test_cookie_1', 'cf_test_basic'];
  const foundCookies = {};
  targetCookies.forEach(name => {
    const nextJsCookie = cookieStore.get(name);
    const manualCookie = manualParsedCookies[name];
    foundCookies[name] = {
      nextJs: nextJsCookie ? { found: true, value: nextJsCookie.value?.substring(0, 20) + '...' } : { found: false },
      manual: manualCookie ? { found: true, value: manualCookie.substring(0, 20) + '...' } : { found: false }
    };
  });
  console.log('🔍 [DebugCookieParser] Target cookies search:', foundCookies);
  
  // Create response
  const response = NextResponse.json({
    success: true,
    analysis: {
      rawHeader: {
        exists: !!rawCookieHeader,
        length: rawCookieHeader?.length,
        preview: rawCookieHeader?.substring(0, 100) + '...'
      },
      nextJsParsing: {
        count: nextJsCookies.length,
        cookies: nextJsCookies.map(c => c.name)
      },
      manualParsing: {
        count: Object.keys(manualParsedCookies).length,
        cookies: Object.keys(manualParsedCookies)
      },
      targetCookies: foundCookies
    },
    timestamp: new Date().toISOString()
  });
  
  // Test 5: Try setting cookies with minimal options
  const testToken = '38a07d2b-a395-4b79-b190-2ca4ef5c70bc';
  
  // Absolute minimal cookie
  response.cookies.set('debug_minimal', testToken);
  console.log('✅ Set minimal cookie: debug_minimal');
  
  // With only path
  response.cookies.set('debug_path', testToken, { path: '/' });
  console.log('✅ Set path cookie: debug_path');
  
  // Try setting sid with minimal options
  response.cookies.set('sid', testToken, { path: '/' });
  console.log('✅ Set sid with path only');
  
  // Try setting session_token with minimal options
  response.cookies.set('session_token', testToken, { path: '/' });
  console.log('✅ Set session_token with path only');
  
  console.log('🔍 [DebugCookieParser] ===== COOKIE PARSER DEBUG END =====');
  
  return response;
}