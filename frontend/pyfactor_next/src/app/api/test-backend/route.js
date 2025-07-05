import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET() {
  try {
    // Test backend health endpoint
    const healthResponse = await fetch(`${API_URL}/health/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const healthText = await healthResponse.text();
    let healthData;
    try {
      healthData = JSON.parse(healthText);
    } catch {
      healthData = { raw: healthText };
    }
    
    // Test if we can reach the sessions endpoint
    const sessionsResponse = await fetch(`${API_URL}/api/sessions/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return NextResponse.json({
      backend_url: API_URL,
      health_check: {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthData
      },
      sessions_endpoint: {
        status: sessionsResponse.status,
        ok: sessionsResponse.ok
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Backend connection test failed',
      message: error.message,
      backend_url: API_URL
    }, { status: 500 });
  }
}