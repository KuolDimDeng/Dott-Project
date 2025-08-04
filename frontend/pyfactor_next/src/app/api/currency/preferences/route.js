import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper to create consistent responses
function createResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Helper to log with timestamp
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Currency API] ${message}`;
  
  if (data) {
    console[level](logMessage, JSON.stringify(data, null, 2));
  } else {
    console[level](logMessage);
  }
}

export async function GET(request) {
  log('info', '=== GET REQUEST START ===');
  
  try {
    const cookieStore = cookies();
    
    // Get session cookie
    const sidCookie = cookieStore.get('sid');
    log('info', 'Session cookie check', { 
      hasSid: !!sidCookie,
      sidLength: sidCookie?.value?.length 
    });
    
    if (!sidCookie) {
      log('error', 'No session cookie found');
      return createResponse({
        success: false,
        error: 'Not authenticated'
      }, 401);
    }
    
    // Backend URL
    const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/preferences`;
    
    log('info', 'Making backend request', { 
      url: backendUrl,
      method: 'GET'
    });
    
    // Make request to backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'Next.js API Route',
      },
      credentials: 'include',
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    log('info', 'Backend response received', { 
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      log('error', 'Non-JSON response from backend', { 
        text: text.substring(0, 500),
        contentType,
        status: response.status
      });
      
      // Check if it's a tenant ID error (RLS middleware)
      if (text.includes('Tenant ID required')) {
        return createResponse({
          success: false,
          error: 'Authentication error. Please sign in again.'
        }, 401);
      }
      
      return createResponse({
        success: false,
        error: 'Invalid response from backend service'
      }, 502);
    }
    
    if (!response.ok) {
      log('error', 'Backend returned error', { 
        status: response.status,
        data 
      });
      
      return createResponse({
        success: false,
        error: data.error || 'Failed to fetch currency preferences'
      }, response.status);
    }
    
    log('info', '=== GET REQUEST SUCCESS ===', { 
      preferences: data.preferences 
    });
    
    return createResponse(data);
    
  } catch (error) {
    log('error', '=== GET REQUEST ERROR ===', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return createResponse({
        success: false,
        error: 'Request timeout - backend service is slow to respond'
      }, 504);
    }
    
    if (error.message?.includes('fetch failed')) {
      return createResponse({
        success: false,
        error: 'Cannot connect to backend service'
      }, 503);
    }
    
    return createResponse({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}

export async function PUT(request) {
  log('info', '=== PUT REQUEST START ===');
  const startTime = Date.now();
  
  try {
    const cookieStore = cookies();
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      log('info', 'Request body parsed', body);
    } catch (parseError) {
      log('error', 'Failed to parse request body', { error: parseError.message });
      return createResponse({
        success: false,
        error: 'Invalid request body'
      }, 400);
    }
    
    // Get session cookie
    const sidCookie = cookieStore.get('sid');
    log('info', 'Session cookie check', { 
      hasSid: !!sidCookie,
      sidLength: sidCookie?.value?.length 
    });
    
    if (!sidCookie) {
      log('error', 'No session cookie found');
      return createResponse({
        success: false,
        error: 'Not authenticated'
      }, 401);
    }
    
    // Backend URL
    const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/preferences`;
    
    log('info', 'Making backend request', { 
      url: backendUrl,
      method: 'PUT',
      body 
    });
    
    // Make request to backend with longer timeout for PUT
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'Next.js API Route',
      },
      body: JSON.stringify(body),
      credentials: 'include',
      // Longer timeout for PUT operations
      signal: AbortSignal.timeout(20000) // 20 second timeout
    });
    
    const elapsed = Date.now() - startTime;
    log('info', `Backend response received in ${elapsed}ms`, { 
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      log('error', 'Non-JSON response from backend', { 
        text: text.substring(0, 500),
        contentType,
        status: response.status
      });
      
      // Check if it's a tenant ID error (RLS middleware)
      if (text.includes('Tenant ID required')) {
        return createResponse({
          success: false,
          error: 'Authentication error. Please sign in again.'
        }, 401);
      }
      
      // Check if it's a Cloudflare error page
      if (text.includes('502: Bad gateway') || text.includes('cloudflare')) {
        return createResponse({
          success: false,
          error: 'Backend service is temporarily unavailable. Please try again in a moment.'
        }, 502);
      }
      
      return createResponse({
        success: false,
        error: 'Invalid response from backend service'
      }, 502);
    }
    
    if (!response.ok) {
      log('error', 'Backend returned error', { 
        status: response.status,
        data 
      });
      
      return createResponse({
        success: false,
        error: data.error || data.detail || 'Failed to update currency preferences'
      }, response.status);
    }
    
    log('info', `=== PUT REQUEST SUCCESS (${elapsed}ms) ===`, { 
      preferences: data.preferences,
      currency: body.currency_code 
    });
    
    return createResponse(data);
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log('error', `=== PUT REQUEST ERROR after ${elapsed}ms ===`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
      cause: error.cause
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return createResponse({
        success: false,
        error: 'Request timeout - backend service is slow to respond'
      }, 504);
    }
    
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      return createResponse({
        success: false,
        error: 'Cannot connect to backend service. Please check if the backend is running.'
      }, 503);
    }
    
    return createResponse({
      success: false,
      error: 'Internal server error while updating currency'
    }, 500);
  }
}

// Test endpoint for debugging
export async function OPTIONS(request) {
  log('info', 'OPTIONS request received - API is reachable');
  return createResponse({
    success: true,
    message: 'Currency API is reachable',
    methods: ['GET', 'PUT', 'OPTIONS'],
    timestamp: new Date().toISOString()
  });
}