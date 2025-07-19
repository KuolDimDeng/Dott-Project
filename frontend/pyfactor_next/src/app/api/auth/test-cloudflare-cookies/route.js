import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Test to see if Cloudflare is stripping certain cookies
 * This endpoint will set cookies and immediately read them back
 */
export async function GET(request) {
  console.log('🧪 [TestCloudflareCookies] ===== CLOUDFLARE COOKIE TEST START =====');
  
  const testValue = '38a07d2b-a395-4b79-b190-2ca4ef5c70bc';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // First, read existing cookies
  const cookieStore = cookies();
  const existingCookies = cookieStore.getAll();
  console.log('🧪 [TestCloudflareCookies] Existing cookies:', existingCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 8) + '...' })));
  
  // Create response
  const response = NextResponse.json({
    success: true,
    stage: 'cloudflare-test',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      host: request.headers.get('host'),
      cfRay: request.headers.get('cf-ray'),
      cfConnectingIp: request.headers.get('cf-connecting-ip'),
      cfIpCountry: request.headers.get('cf-ipcountry'),
      cfVisitor: request.headers.get('cf-visitor')
    },
    headers: {
      cookie: request.headers.get('cookie'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    },
    existingCookies: existingCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    timestamp: new Date().toISOString()
  });
  
  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400
  };
  
  // Try setting cookies with different configurations
  const cookieConfigs = [
    { name: 'cf_test_basic', options: cookieOptions },
    { name: 'cf_test_domain', options: { ...cookieOptions, domain: '.dottapps.com' } },
    { name: 'cf_test_samesite_none', options: { ...cookieOptions, sameSite: 'none' } },
    { name: 'cf_test_not_httponly', options: { ...cookieOptions, httpOnly: false } },
    { name: 'sid_cf_test', options: cookieOptions },
    { name: 'session_token_cf_test', options: cookieOptions }
  ];
  
  console.log('🧪 [TestCloudflareCookies] Setting test cookies...');
  
  cookieConfigs.forEach(({ name, options }) => {
    try {
      response.cookies.set(name, testValue, options);
      console.log(`✅ Set cookie: ${name} with options:`, options);
    } catch (error) {
      console.log(`❌ Failed to set cookie: ${name} - Error:`, error.message);
    }
  });
  
  // Get all Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  console.log('🧪 [TestCloudflareCookies] Set-Cookie headers count:', setCookieHeaders.length);
  setCookieHeaders.forEach((header, index) => {
    console.log(`  [${index}]:`, header);
  });
  
  // Add custom headers to track Cloudflare processing
  response.headers.set('X-Cookie-Test', 'cloudflare-test');
  response.headers.set('X-Timestamp', new Date().toISOString());
  
  console.log('🧪 [TestCloudflareCookies] ===== CLOUDFLARE COOKIE TEST END =====');
  
  return response;
}

/**
 * POST endpoint to test form-based cookie setting through Cloudflare
 */
export async function POST(request) {
  console.log('🧪 [TestCloudflareCookies] ===== CLOUDFLARE FORM TEST START =====');
  
  const formData = await request.formData();
  const action = formData.get('action') || 'set';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (action === 'verify') {
    // Verify cookies were set
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    return NextResponse.json({
      success: true,
      action: 'verify',
      cookies: allCookies.map(c => ({ 
        name: c.name, 
        value: c.value?.substring(0, 20) + '...', 
        length: c.value?.length 
      })),
      timestamp: new Date().toISOString()
    });
  }
  
  // Set cookies and redirect
  const redirectUrl = '/api/auth/test-cloudflare-cookies?action=verify';
  const baseUrl = isProduction ? 'https://dottapps.com' : `https://${request.headers.get('host')}`;
  const absoluteUrl = `${baseUrl}${redirectUrl}`;
  
  const response = NextResponse.redirect(absoluteUrl, 303);
  
  // Set test cookies
  const testValue = '38a07d2b-a395-4b79-b190-2ca4ef5c70bc';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
    ...(isProduction && { domain: '.dottapps.com' })
  };
  
  response.cookies.set('cf_form_test', testValue, cookieOptions);
  response.cookies.set('sid_form_cf', testValue, cookieOptions);
  response.cookies.set('session_token_form_cf', testValue, cookieOptions);
  
  console.log('🧪 [TestCloudflareCookies] Form cookies set, redirecting to:', absoluteUrl);
  console.log('🧪 [TestCloudflareCookies] ===== CLOUDFLARE FORM TEST END =====');
  
  return response;
}