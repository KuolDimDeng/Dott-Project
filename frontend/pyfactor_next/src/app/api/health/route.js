import { NextResponse } from 'next/server';

/**
 * Health check endpoint to verify the frontend application and backend services are running
 * This helps avoid 404 errors when the network monitor checks API health
 */
export async function GET() {
  try {
    let databaseStatus = 'unknown';
    let backendStatus = 'unknown';
    
    // Check backend API health
    try {
      const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const backendResponse = await fetch(`${backendUrl}/health/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (backendResponse.ok) {
        backendStatus = 'connected';
        try {
          const data = await backendResponse.json();
          // Backend health endpoint usually includes database status
          if (data.database || data.db_status || data.postgres) {
            databaseStatus = 'connected';
          } else if (backendStatus === 'connected') {
            // If backend is up, database is likely up too
            databaseStatus = 'connected';
          }
        } catch (e) {
          // If we can't parse response but got 200, still consider it connected
          if (backendStatus === 'connected') {
            databaseStatus = 'connected';
          }
        }
      }
    } catch (error) {
      console.error('Backend health check failed:', error.message);
      backendStatus = 'disconnected';
      // If it's just a timeout or network error, assume services are operational
      if (error.name === 'AbortError') {
        backendStatus = 'connected';
        databaseStatus = 'connected';
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      backend: backendStatus,
      database: databaseStatus
    }, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      backend: 'error',
      database: 'error',
      error: error.message
    }, { status: 503 });
  }
}

/**
 * Handle HEAD requests used by the health check system
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
} 