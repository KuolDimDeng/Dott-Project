import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('🔍 [Currency Debug] === START ===');
  
  try {
    // Log all request details
    console.log('🔍 [Currency Debug] Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('🔍 [Currency Debug] Cookies:', request.headers.get('cookie'));
    
    // Try direct backend URL
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const fullUrl = `${backendUrl}/api/currency/preferences/`;
    
    console.log('🔍 [Currency Debug] Attempting to fetch from:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': 'NextJS-Currency-Debug/1.0',
      },
      // Don't follow redirects automatically
      redirect: 'manual'
    });
    
    console.log('🔍 [Currency Debug] Response status:', response.status);
    console.log('🔍 [Currency Debug] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Check if it's a redirect
    if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
      console.log('🔍 [Currency Debug] Redirect detected to:', response.headers.get('location'));
    }
    
    // Get response as text first
    const responseText = await response.text();
    console.log('🔍 [Currency Debug] Response text (first 500 chars):', responseText.substring(0, 500));
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('🔍 [Currency Debug] Parsed JSON:', data);
    } catch (e) {
      console.log('🔍 [Currency Debug] Failed to parse as JSON');
      data = { raw: responseText.substring(0, 1000) };
    }
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: data,
      debug: {
        url: fullUrl,
        backendUrl: backendUrl,
        headers: Object.fromEntries(response.headers.entries())
      }
    });
    
  } catch (error) {
    console.error('🔍 [Currency Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}