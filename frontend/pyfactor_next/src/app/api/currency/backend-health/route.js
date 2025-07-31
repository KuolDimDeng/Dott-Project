import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🏥 [Backend Health] === HEALTH CHECK START ===');
  
  const tests = [];
  const backends = [
    'https://api.dottapps.com',
    'https://dott-api-y26w.onrender.com',
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  
  console.log('🏥 [Backend Health] Testing backends:', backends);
  
  for (const backendUrl of backends) {
    // Test 1: Basic health endpoint
    try {
      console.log(`🏥 [Backend Health] Testing ${backendUrl}/health/`);
      const healthResponse = await fetch(`${backendUrl}/health/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Next.js Health Check'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      const healthText = await healthResponse.text();
      let healthData;
      try {
        healthData = JSON.parse(healthText);
      } catch (e) {
        healthData = { raw: healthText.substring(0, 200) };
      }
      
      tests.push({
        backend: backendUrl,
        endpoint: '/health/',
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthData
      });
    } catch (error) {
      tests.push({
        backend: backendUrl,
        endpoint: '/health/',
        error: error.message,
        errorType: error.constructor.name
      });
    }
    
    // Test 2: API endpoint without auth
    try {
      console.log(`🏥 [Backend Health] Testing ${backendUrl}/api/currency/test-public/`);
      const apiResponse = await fetch(`${backendUrl}/api/currency/test-public/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Next.js API Test'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      const contentType = apiResponse.headers.get('content-type');
      const apiText = await apiResponse.text();
      
      let apiData;
      if (contentType?.includes('application/json')) {
        try {
          apiData = JSON.parse(apiText);
        } catch (e) {
          apiData = { parseError: e.message, preview: apiText.substring(0, 200) };
        }
      } else {
        apiData = { 
          contentType, 
          isHtml: apiText.includes('<!DOCTYPE') || apiText.includes('<html'),
          preview: apiText.substring(0, 200) 
        };
      }
      
      tests.push({
        backend: backendUrl,
        endpoint: '/api/currency/test-public/',
        status: apiResponse.status,
        ok: apiResponse.ok,
        contentType,
        data: apiData
      });
    } catch (error) {
      tests.push({
        backend: backendUrl,
        endpoint: '/api/currency/test-public/',
        error: error.message,
        errorType: error.constructor.name
      });
    }
  }
  
  console.log('🏥 [Backend Health] === HEALTH CHECK COMPLETE ===');
  console.log('🏥 [Backend Health] Results:', JSON.stringify(tests, null, 2));
  
  // Check if we're in a server environment
  const serverInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      RENDER: process.env.RENDER,
      IS_SERVER: typeof window === 'undefined'
    }
  };
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    backends,
    tests,
    serverInfo
  });
}