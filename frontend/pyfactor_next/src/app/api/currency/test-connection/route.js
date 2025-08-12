import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.BACKEND_URL || 
                process.env.NEXT_PUBLIC_BACKEND_URL || 
                process.env.NEXT_PUBLIC_API_URL ||
                'https://api.dottapps.com';

export async function GET() {
  console.log('🔌 [Test Connection] === CONNECTION TEST START ===');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BACKEND_URL: process.env.BACKEND_URL,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      COMPUTED_URL: API_URL
    },
    tests: []
  };
  
  try {
    // Test 1: Direct fetch without auth
    console.log('🔌 [Test 1] Testing direct fetch without auth...');
    try {
      const testUrl = `${API_URL}/api/currency/test-public/`;
      console.log('🔌 [Test 1] URL:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      results.tests.push({
        test: 'Direct fetch without auth',
        url: testUrl,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const data = await response.json();
        results.tests[0].data = data;
      }
    } catch (error) {
      results.tests.push({
        test: 'Direct fetch without auth',
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        errorCause: error.cause
      });
    }
    
    // Test 2: Fetch with session auth
    console.log('🔌 [Test 2] Testing fetch with session auth...');
    try {
      const cookieStore = cookies();
      const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
      
      if (sessionId) {
        const testUrl = `${API_URL}/api/currency/test-auth/`;
        console.log('🔌 [Test 2] URL:', testUrl);
        console.log('🔌 [Test 2] Session:', sessionId.substring(0, 8) + '...');
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionId}`,
            'Cookie': `sid=${sessionId}; session_token=${sessionId}`
          },
          signal: AbortSignal.timeout(10000)
        });
        
        results.tests.push({
          test: 'Fetch with session auth',
          url: testUrl,
          hasSession: true,
          sessionPrefix: sessionId.substring(0, 8) + '...',
          success: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        
        if (response.ok) {
          const data = await response.json();
          results.tests[1].data = data;
        }
      } else {
        results.tests.push({
          test: 'Fetch with session auth',
          success: false,
          error: 'No session token found'
        });
      }
    } catch (error) {
      results.tests.push({
        test: 'Fetch with session auth',
        success: false,
        error: error.message,
        errorType: error.constructor.name
      });
    }
    
    // Test 3: DNS resolution
    console.log('🔌 [Test 3] Testing DNS resolution...');
    try {
      const url = new URL(API_URL);
      results.tests.push({
        test: 'DNS/URL parsing',
        success: true,
        hostname: url.hostname,
        protocol: url.protocol,
        port: url.port || (url.protocol === 'https:' ? '443' : '80')
      });
    } catch (error) {
      results.tests.push({
        test: 'DNS/URL parsing',
        success: false,
        error: error.message
      });
    }
    
    console.log('🔌 [Test Connection] === CONNECTION TEST COMPLETE ===');
    console.log('🔌 [Test Connection] Results:', JSON.stringify(results, null, 2));
    
    return NextResponse.json({
      success: true,
      ...results
    });
    
  } catch (error) {
    console.error('🔌 [Test Connection] === CONNECTION TEST ERROR ===', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      ...results
    }, { status: 500 });
  }
}