import { NextResponse } from 'next/server';

/**
 * Direct backend connectivity check to diagnose DNS issues
 */
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Environment variables
  results.checks.environment = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV
  };

  // Check 2: DNS resolution test
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  try {
    const url = new URL(apiUrl);
    results.checks.dns = {
      hostname: url.hostname,
      protocol: url.protocol,
      port: url.port || (url.protocol === 'https:' ? '443' : '80')
    };
  } catch (error) {
    results.checks.dns = { error: error.message };
  }

  // Check 3: Direct backend health check
  try {
    console.log('[BackendCheck] Testing direct connection to:', `${apiUrl}/health/`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiUrl}/health/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-DNS-Prefetch-Control': 'off'
      },
      // Force fresh connection
      cache: 'no-store',
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    
    results.checks.backend = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        'cf-ray': response.headers.get('cf-ray'),
        'server': response.headers.get('server'),
        'content-type': response.headers.get('content-type')
      }
    };

    if (response.ok) {
      try {
        const data = await response.json();
        results.checks.backend.data = data;
      } catch (e) {
        results.checks.backend.parseError = e.message;
      }
    } else {
      const text = await response.text();
      results.checks.backend.errorText = text.substring(0, 500);
      results.checks.backend.isCloudflareError = text.includes('Cloudflare');
      results.checks.backend.hasError1000 = text.includes('Error 1000') || text.includes('DNS points to prohibited IP');
    }
  } catch (error) {
    results.checks.backend = {
      error: error.message,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };
  }

  // Check 4: Test session endpoint
  try {
    const sessionUrl = `${apiUrl}/api/sessions/cloudflare/create/`;
    console.log('[BackendCheck] Testing session endpoint:', sessionUrl);
    
    const response = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ test: true }),
      cache: 'no-store'
    });

    results.checks.sessionEndpoint = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };

    if (!response.ok) {
      const text = await response.text();
      results.checks.sessionEndpoint.errorPreview = text.substring(0, 200);
      results.checks.sessionEndpoint.isCloudflareError = text.includes('Cloudflare');
    }
  } catch (error) {
    results.checks.sessionEndpoint = {
      error: error.message,
      type: error.constructor.name
    };
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}