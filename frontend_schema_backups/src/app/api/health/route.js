import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[API Health] Health check request received');
    
    // Return a basic health response
    return NextResponse.json({
      status: 'ok',
      service: 'pyfactor-api',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('[API Health] Error during health check:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
} 