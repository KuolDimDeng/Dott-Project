import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/utils/api-wrapper';
import { logger } from '@/utils/sentry';

// Example handlers using the API wrapper
const handlers = createApiHandler({
  GET: async (request: NextRequest) => {
    // This is automatically wrapped with Sentry error handling
    logger.info('GET request to wrapped example');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      message: 'This API is automatically monitored by Sentry',
      timestamp: new Date().toISOString(),
    });
  },

  POST: async (request: NextRequest) => {
    const body = await request.json();
    
    // Example validation that will be caught by wrapper
    if (!body.name) {
      throw new Error('validation: Name is required');
    }
    
    // Example of "not found" error
    if (body.id === 'notfound') {
      throw new Error('not found: Resource does not exist');
    }
    
    // Example of generic error
    if (body.triggerError) {
      throw new Error('Something went wrong processing your request');
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: Math.random().toString(36).substr(2, 9),
        name: body.name,
        createdAt: new Date().toISOString(),
      },
    });
  },
}, {
  requireAuth: false, // Set to true to require authentication
  logRequest: true,   // Enable request logging
});

// Export the wrapped handlers
export const GET = handlers.GET;
export const POST = handlers.POST;