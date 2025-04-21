import { NextResponse } from 'next/server';

/**
 * Simple ping endpoint to verify the application is alive
 * This provides an alternative health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    ping: 'pong',
    timestamp: Date.now()
  }, { status: 200 });
}

/**
 * Handle HEAD requests for health checking
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