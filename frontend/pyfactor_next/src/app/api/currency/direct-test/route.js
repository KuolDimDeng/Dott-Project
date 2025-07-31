import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('🔬 [Direct Test] === DIRECT BACKEND TEST START ===');
  
  const results = [];
  
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    // Test 1: Direct to Django without any proxy
    const backendUrl = 'https://api.dottapps.com';
    const testUrl = `${backendUrl}/api/currency/preferences/`;
    
    console.log('🔬 [Direct Test] Testing:', testUrl);
    console.log('🔬 [Direct Test] Session:', sessionId ? sessionId.substring(0, 8) + '...' : 'NO SESSION');
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': sessionId ? `Session ${sessionId}` : '',
          'User-Agent': 'Next.js Direct Test'
        },
        // No timeout to see what happens
      });
      
      console.log('🔬 [Direct Test] Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseText = await response.text();
      console.log('🔬 [Direct Test] Response length:', responseText.length);
      console.log('🔬 [Direct Test] Response preview:', responseText.substring(0, 500));
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('🔬 [Direct Test] Parsed as JSON successfully');
      } catch (e) {
        console.log('🔬 [Direct Test] Failed to parse as JSON');
        responseData = { parseError: e.message, rawText: responseText.substring(0, 1000) };
      }
      
      results.push({
        test: 'Direct Django Request',
        url: testUrl,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        hasSession: !!sessionId,
        responseData,
        isJson: !responseData.parseError
      });
      
    } catch (fetchError) {
      console.error('🔬 [Direct Test] Fetch error:', fetchError);
      results.push({
        test: 'Direct Django Request',
        url: testUrl,
        success: false,
        error: fetchError.message,
        errorType: fetchError.constructor.name,
        errorStack: fetchError.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
    // Test 2: Check if it's a DNS/SSL issue
    try {
      const dnsTest = await fetch('https://api.dottapps.com/health/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      results.push({
        test: 'DNS/SSL Test',
        url: 'https://api.dottapps.com/health/',
        success: dnsTest.ok,
        status: dnsTest.status
      });
    } catch (dnsError) {
      results.push({
        test: 'DNS/SSL Test',
        success: false,
        error: dnsError.message
      });
    }
    
    console.log('🔬 [Direct Test] === DIRECT BACKEND TEST COMPLETE ===');
    console.log('🔬 [Direct Test] Results:', JSON.stringify(results, null, 2));
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
    console.error('🔬 [Direct Test] === DIRECT BACKEND TEST ERROR ===', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}