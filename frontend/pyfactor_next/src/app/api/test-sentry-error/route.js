import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request) {
  // Test API error for Sentry
  try {
    // Simulate an error
    throw new Error('Test API error for Sentry');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: 'test-sentry-error',
        method: 'GET'
      }
    });
    
    return NextResponse.json(
      { error: 'Test error generated' },
      { status: 500 }
    );
  }
}