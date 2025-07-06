import { NextResponse } from 'next/server';

/**
 * Enhanced test endpoint to diagnose backend connectivity and DNS/Cloudflare issues
 */
export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      BACKEND_API_URL: process.env.BACKEND_API_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      isRender: !!process.env.RENDER,
      renderServiceName: process.env.RENDER_SERVICE_NAME
    },
    tests: []
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  // Test 1: Direct Backend Health Check
  try {
    console.log('[TestBackend] Testing health endpoint:', `${API_URL}/health/`);
    const healthResponse = await fetch(`${API_URL}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend-Test',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    const responseText = await healthResponse.text();
    let healthData;
    try {
      healthData = JSON.parse(responseText);
    } catch {
      healthData = { raw: responseText.substring(0, 500) };
    }

    results.tests.push({
      test: 'Backend Health Check',
      endpoint: `${API_URL}/health/`,
      success: healthResponse.ok,
      status: healthResponse.status,
      statusText: healthResponse.statusText,
      headers: Object.fromEntries(healthResponse.headers.entries()),
      data: healthData,
      isCloudflareError: responseText.includes('Cloudflare') && responseText.includes('<!DOCTYPE'),
      isError1000: responseText.includes('Error 1000') || responseText.includes('DNS points to prohibited IP')
    });
  } catch (error) {
    results.tests.push({
      test: 'Backend Health Check',
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      errorCode: error.code,
      errorDetails: {
        errno: error.errno,
        syscall: error.syscall
      }
    });
  }

  // Test 2: Session Creation Endpoint
  try {
    const sessionResponse = await fetch(`${API_URL}/api/sessions/cloudflare/create/`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://dottapps.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    const responseText = await sessionResponse.text();
    
    results.tests.push({
      test: 'Session Endpoint CORS Check',
      endpoint: `${API_URL}/api/sessions/cloudflare/create/`,
      success: sessionResponse.ok,
      status: sessionResponse.status,
      headers: Object.fromEntries(sessionResponse.headers.entries()),
      hasAccessControlHeaders: sessionResponse.headers.has('access-control-allow-origin'),
      isCloudflareError: responseText.includes('Cloudflare') && responseText.includes('<!DOCTYPE')
    });
  } catch (error) {
    results.tests.push({
      test: 'Session Endpoint CORS Check',
      success: false,
      error: error.message
    });
  }

  // Test 3: Alternative Backend URLs
  const alternativeUrls = [
    'https://dott-api.onrender.com',
    'https://api.dottapps.com'
  ];

  for (const altUrl of alternativeUrls) {
    try {
      const response = await fetch(`${altUrl}/health/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dott-Frontend-Test'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const responseText = await response.text();
      
      results.tests.push({
        test: `Alternative URL Test: ${altUrl}`,
        success: response.ok,
        status: response.status,
        headers: {
          'cf-ray': response.headers.get('cf-ray'),
          'server': response.headers.get('server'),
          'x-powered-by': response.headers.get('x-powered-by')
        },
        isCloudflareError: responseText.includes('Error 1000')
      });
    } catch (error) {
      results.tests.push({
        test: `Alternative URL Test: ${altUrl}`,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  results.summary = {
    totalTests: results.tests.length,
    successfulTests: results.tests.filter(t => t.success).length,
    failedTests: results.tests.filter(t => !t.success).length,
    hasCloudflareError: results.tests.some(t => t.isCloudflareError || t.isError1000),
    recommendations: []
  };

  if (results.summary.hasCloudflareError) {
    results.summary.recommendations.push(
      'Cloudflare Error 1000 detected: DNS for api.dottapps.com may be pointing to Cloudflare IP',
      'Check Cloudflare DNS settings and ensure API subdomain is properly configured',
      'Consider using direct Render URL: https://dott-api.onrender.com'
    );
  }

  if (results.tests.some(t => t.test.includes('Alternative') && t.success && t.test.includes('onrender'))) {
    results.summary.recommendations.push(
      'Direct Render URL is working - consider updating NEXT_PUBLIC_API_URL to https://dott-api.onrender.com'
    );
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}