import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Test endpoint to verify cookie setting works correctly
 * This helps isolate whether the issue is with cookie setting or the session flow
 */
export async function GET(request) {
  console.log('🧪 [TestCookieSetting] ===== COOKIE SETTING TEST START =====');
  
  const testToken = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Try multiple approaches to set cookies
  const response = NextResponse.json({
    success: true,
    testToken,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      host: request.headers.get('host'),
      origin: request.headers.get('origin')
    },
    timestamp: new Date().toISOString()
  });
  
  // Approach 1: Using response.cookies.set
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600 // 1 hour
  };
  
  if (isProduction) {
    cookieOptions.domain = '.dottapps.com';
  }
  
  console.log('🧪 [TestCookieSetting] Setting test cookies with options:', cookieOptions);
  
  // Set multiple test cookies
  response.cookies.set('test_cookie_1', testToken, cookieOptions);
  response.cookies.set('test_cookie_2', `v2-${testToken}`, {
    ...cookieOptions,
    httpOnly: false // Make this one readable by JavaScript
  });
  
  // Approach 2: Direct header manipulation
  const cookieString = `test_cookie_3=${testToken}; HttpOnly; Secure=${isProduction}; SameSite=lax; Path=/; Max-Age=3600${isProduction ? '; Domain=.dottapps.com' : ''}`;
  response.headers.append('Set-Cookie', cookieString);
  
  console.log('🧪 [TestCookieSetting] Response headers:', Object.fromEntries(response.headers.entries()));
  console.log('🧪 [TestCookieSetting] ===== COOKIE SETTING TEST END =====');
  
  return response;
}

export async function POST(request) {
  console.log('🧪 [TestCookieSetting] ===== FORM COOKIE TEST START =====');
  
  const formData = await request.formData();
  const redirectUrl = formData.get('redirectUrl') || '/api/auth/debug-cookies';
  const testToken = `form-test-${Date.now()}`;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Create redirect response
  const baseUrl = isProduction ? 'https://dottapps.com' : `https://${request.headers.get('host')}`;
  const absoluteUrl = `${baseUrl}${redirectUrl}`;
  
  console.log('🧪 [TestCookieSetting] Form test redirect to:', absoluteUrl);
  
  const response = NextResponse.redirect(absoluteUrl, 303);
  
  // Set cookies on redirect
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
    ...(isProduction && { domain: '.dottapps.com' })
  };
  
  response.cookies.set('form_test_cookie', testToken, cookieOptions);
  
  console.log('🧪 [TestCookieSetting] Form cookie set, redirecting...');
  console.log('🧪 [TestCookieSetting] ===== FORM COOKIE TEST END =====');
  
  return response;
}