import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint to verify the frontend application is running
 * This helps avoid 404 errors when the network monitor checks API health
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }, { status: 200 });
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