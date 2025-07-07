import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${backendUrl}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend-Health-Check'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeout);
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'ok',
      backend: {
        url: backendUrl,
        status: response.status,
        ok: response.ok,
        data
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      backend: {
        url: backendUrl,
        error: error.message,
        type: error.name
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}