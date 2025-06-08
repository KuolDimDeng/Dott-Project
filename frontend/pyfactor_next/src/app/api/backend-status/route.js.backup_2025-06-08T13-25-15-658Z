import { NextResponse } from 'next/server';

/**
 * Backend Status Check API
 * Tests connectivity to Elastic Beanstalk backend and provides status
 */
export async function GET() {
  const backendUrl = 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com';
  const results = {
    timestamp: new Date().toISOString(),
    frontend: {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development'
    },
    backend: {
      url: backendUrl,
      status: 'unknown',
      connectivity: 'unknown',
      error: null
    }
  };

  try {
    // Test backend connectivity with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${backendUrl}/health/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DottApps-Frontend/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      results.backend.status = 'ok';
      results.backend.connectivity = 'success';
      results.backend.response = data;
    } else {
      results.backend.status = 'error';
      results.backend.connectivity = 'http_error';
      results.backend.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    results.backend.status = 'error';
    results.backend.connectivity = 'failed';
    results.backend.error = error.message;
    
    if (error.name === 'AbortError') {
      results.backend.error = 'Connection timeout (>10s)';
    }
  }

  const httpStatus = results.backend.status === 'ok' ? 200 : 503;
  
  return NextResponse.json(results, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json'
    }
  });
}
