import { NextResponse } from 'next/server';

/**
 * Direct backend test to bypass all caching and test raw connectivity
 */
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Direct fetch to backend with no variables
  try {
    const response = await fetch('https://api.dottapps.com/health/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    results.tests.push({
      test: 'Direct API health check',
      url: 'https://api.dottapps.com/health/',
      status: response.status,
      ok: response.ok,
      headers: {
        server: response.headers.get('server'),
        'content-type': response.headers.get('content-type')
      }
    });

    if (response.ok) {
      const data = await response.json();
      results.tests[0].data = data;
    }
  } catch (error) {
    results.tests.push({
      test: 'Direct API health check',
      error: error.message,
      type: error.constructor.name
    });
  }

  // Test 2: Using environment variable
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${apiUrl}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    results.tests.push({
      test: 'Environment variable API check',
      apiUrl: apiUrl,
      url: `${apiUrl}/health/`,
      status: response.status,
      ok: response.ok
    });
  } catch (error) {
    results.tests.push({
      test: 'Environment variable API check',
      error: error.message
    });
  }

  // Test 3: Session endpoint test
  try {
    const response = await fetch('https://api.dottapps.com/api/sessions/cloudflare/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ test: true }),
      cache: 'no-store'
    });

    const text = await response.text();
    results.tests.push({
      test: 'Session endpoint check',
      url: 'https://api.dottapps.com/api/sessions/cloudflare/create/',
      status: response.status,
      ok: response.ok,
      responseLength: text.length,
      isCloudflareError: text.includes('Cloudflare') && text.includes('Error 1000')
    });
  } catch (error) {
    results.tests.push({
      test: 'Session endpoint check',
      error: error.message
    });
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}