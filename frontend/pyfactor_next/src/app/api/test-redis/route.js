import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('[Test-Redis] Testing Redis connectivity...');
    
    // Test Redis cache endpoint
    const testSessionId = 'test-' + Date.now();
    const testData = {
      test: true,
      timestamp: Date.now(),
      message: 'Redis test data'
    };
    
    // 1. Test SET operation
    console.log('[Test-Redis] Testing SET operation...');
    const setResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/cache/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set',
        sessionId: testSessionId,
        sessionData: testData,
        ttl: 60 // 1 minute TTL for test
      })
    });
    
    const setResult = await setResponse.json();
    console.log('[Test-Redis] SET result:', setResult);
    
    // 2. Test GET operation
    console.log('[Test-Redis] Testing GET operation...');
    const getResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/cache/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get',
        sessionId: testSessionId
      })
    });
    
    const getResult = await getResponse.json();
    console.log('[Test-Redis] GET result:', getResult);
    
    // 3. Test cache status
    console.log('[Test-Redis] Getting cache status...');
    const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/cache/session`);
    const statusResult = await statusResponse.json();
    console.log('[Test-Redis] Cache status:', statusResult);
    
    // 4. Clean up test data
    console.log('[Test-Redis] Cleaning up test data...');
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/cache/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        sessionId: testSessionId
      })
    });
    
    return NextResponse.json({
      success: true,
      redisUrl: process.env.REDIS_URL ? 'Configured' : 'Not configured',
      setResult,
      getResult,
      cacheStatus: statusResult,
      testPassed: getResult.session?.test === true
    });
    
  } catch (error) {
    console.error('[Test-Redis] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      redisUrl: process.env.REDIS_URL ? 'Configured' : 'Not configured'
    }, { status: 500 });
  }
}