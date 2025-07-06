import { NextResponse } from 'next/server';

/**
 * Debug endpoint to test backend connectivity
 */
export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      BACKEND_API_URL: process.env.BACKEND_API_URL,
      isRender: !!process.env.RENDER,
      renderServiceName: process.env.RENDER_SERVICE_NAME
    },
    tests: {}
  };

  // Test 1: Direct backend health check
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[BackendTest] Testing backend health at:', `${apiUrl}/health/`);
    
    const healthResponse = await fetch(`${apiUrl}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend-Test'
      }
    });
    
    const healthText = await healthResponse.text();
    let healthData;
    try {
      healthData = JSON.parse(healthText);
    } catch {
      healthData = { rawResponse: healthText.substring(0, 200) };
    }
    
    results.tests.health = {
      success: healthResponse.ok,
      status: healthResponse.status,
      data: healthData,
      headers: Object.fromEntries(healthResponse.headers.entries())
    };
  } catch (error) {
    results.tests.health = {
      success: false,
      error: error.message,
      type: error.constructor.name
    };
  }

  // Test 2: Session endpoint
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const timestamp = Date.now();
    const sessionUrl = `${apiUrl}/api/sessions/cloudflare/create/?_t=${timestamp}`;
    
    console.log('[BackendTest] Testing session endpoint at:', sessionUrl);
    
    const sessionResponse = await fetch(sessionUrl, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://dottapps.com'
      }
    });
    
    results.tests.sessionOptions = {
      success: sessionResponse.ok,
      status: sessionResponse.status,
      headers: Object.fromEntries(sessionResponse.headers.entries())
    };
  } catch (error) {
    results.tests.sessionOptions = {
      success: false,
      error: error.message,
      type: error.constructor.name
    };
  }

  // Test 3: DNS resolution (if not in production)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const dns = await import('dns').then(m => m.promises);
      const apiHostname = new URL(process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com').hostname;
      const addresses = await dns.resolve4(apiHostname);
      
      results.tests.dns = {
        success: true,
        hostname: apiHostname,
        addresses: addresses
      };
    } catch (error) {
      results.tests.dns = {
        success: false,
        error: error.message
      };
    }
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}