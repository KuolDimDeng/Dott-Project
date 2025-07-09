// Debug endpoint to check backend calendar API directly
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'cb86762b-3e32-43bb-963d-f5d5b0bc009e';
    
    console.log('[Calendar Debug] Checking backend calendar API for tenant:', tenantId);
    
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    // Test different API endpoints
    const endpoints = [
      '/api/calendar/events/',
      '/api/events/',
      '/api/events/event/',
      '/api/calendar/',
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const url = `${API_BASE_URL}${endpoint}?tenant_id=${tenantId}`;
        console.log('[Calendar Debug] Testing endpoint:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Session ${sessionId.value}`,
            'Cookie': `session_token=${sessionId.value}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        if (response.ok) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            results[endpoint].data = data;
            results[endpoint].eventCount = Array.isArray(data) ? data.length : (data.results?.length || 0);
          } catch (e) {
            results[endpoint].rawText = text.substring(0, 200);
          }
        } else {
          const errorText = await response.text();
          results[endpoint].error = errorText.substring(0, 200);
        }
      } catch (error) {
        results[endpoint] = {
          error: error.message,
          type: 'fetch_error'
        };
      }
    }
    
    // Also check what endpoints exist
    try {
      const optionsResponse = await fetch(`${API_BASE_URL}/api/`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Session ${sessionId.value}`,
        }
      });
      
      if (optionsResponse.ok) {
        const optionsText = await optionsResponse.text();
        results.availableEndpoints = optionsText;
      }
    } catch (e) {
      // Ignore options error
    }
    
    return NextResponse.json({
      tenantId,
      timestamp: new Date().toISOString(),
      apiBaseUrl: API_BASE_URL,
      results,
      recommendation: determineRecommendation(results)
    });
    
  } catch (error) {
    console.error('[Calendar Debug] Error:', error);
    return NextResponse.json(
      { error: 'Debug error', details: error.message },
      { status: 500 }
    );
  }
}

function determineRecommendation(results) {
  // Check which endpoint works
  for (const [endpoint, result] of Object.entries(results)) {
    if (result.ok && result.eventCount > 0) {
      return {
        status: 'found',
        workingEndpoint: endpoint,
        eventCount: result.eventCount,
        message: `Use this endpoint: ${endpoint}`
      };
    }
  }
  
  // Check if any endpoint exists but returns empty
  for (const [endpoint, result] of Object.entries(results)) {
    if (result.ok) {
      return {
        status: 'empty',
        endpoint: endpoint,
        message: `Endpoint ${endpoint} exists but returns no events. Backend may not be filtering by tenant_id correctly.`
      };
    }
  }
  
  // All endpoints failed
  return {
    status: 'not_found',
    message: 'No working calendar API endpoint found. Backend implementation may be missing.'
  };
}