import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/sentry';

// Example API route with Sentry integration
export async function GET(request: NextRequest) {
  // Start a transaction for performance monitoring
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'GET /api/example-sentry',
  });

  // Set transaction on the scope so it's accessible throughout the request
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

  try {
    // Log the request
    logger.info('Example Sentry API called', {
      method: 'GET',
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Simulate some work with performance monitoring
    const span = transaction.startChild({
      op: 'db.query',
      description: 'Fetch example data',
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    span.finish();

    // Example of adding custom context
    Sentry.setContext('api_response', {
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    // Success response
    const response = {
      message: 'Example API with Sentry integration',
      timestamp: new Date().toISOString(),
    };

    transaction.setStatus('ok');
    return NextResponse.json(response);

  } catch (error) {
    // Log and capture the error
    logger.error('Error in example Sentry API', error, {
      url: request.url,
      method: 'GET',
    });

    transaction.setStatus('internal_error');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    transaction.finish();
  }
}

// Example POST endpoint with validation error handling
export async function POST(request: NextRequest) {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'POST /api/example-sentry',
  });

  try {
    const body = await request.json();

    // Validate request body
    if (!body.name || !body.email) {
      // This is a user error, not an application error
      logger.warn('Validation error in example API', {
        missingFields: {
          name: !body.name,
          email: !body.email,
        },
      });

      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Track custom event
    Sentry.addBreadcrumb({
      message: 'Processing user submission',
      category: 'user-action',
      level: 'info',
      data: {
        userName: body.name,
        userEmail: body.email,
      },
    });

    // Simulate processing
    const processSpan = transaction.startChild({
      op: 'process',
      description: 'Process user data',
    });

    await new Promise(resolve => setTimeout(resolve, 200));
    processSpan.finish();

    // Example of intentional error for testing
    if (body.triggerError) {
      throw new Error('This is a test error triggered intentionally');
    }

    transaction.setStatus('ok');
    return NextResponse.json({
      success: true,
      message: `Processed data for ${body.name}`,
    });

  } catch (error) {
    logger.error('Error processing POST request', error);
    transaction.setStatus('internal_error');
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  } finally {
    transaction.finish();
  }
}