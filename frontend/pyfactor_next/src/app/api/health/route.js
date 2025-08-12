import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dott-frontend',
    version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    }
  };
  
  // Check backend connectivity
  try {
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/health/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    health.backend = response.ok ? 'connected' : 'error';
  } catch (error) {
    health.backend = 'unreachable';
  }
  
  return NextResponse.json(health, {
    status: health.backend === 'unreachable' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}
