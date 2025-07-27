import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/sentry';

type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

interface ApiWrapperOptions {
  requireAuth?: boolean;
  rateLimit?: number;
  logRequest?: boolean;
}

export function withApiWrapper(
  handler: ApiHandler,
  options: ApiWrapperOptions = {}
) {
  return async (request: NextRequest) => {
    const { requireAuth = false, logRequest = true } = options;
    
    // Start performance transaction
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${request.method} ${request.nextUrl.pathname}`,
    });

    // Set transaction on scope
    Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

    try {
      // Log request if enabled
      if (logRequest) {
        logger.info(`API Request: ${request.method} ${request.nextUrl.pathname}`, {
          headers: Object.fromEntries(request.headers.entries()),
          query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        });
      }

      // Check authentication if required
      if (requireAuth) {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
          logger.warn('Unauthorized API request', {
            path: request.nextUrl.pathname,
          });
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }

      // Execute handler
      const response = await handler(request);
      
      // Set success status
      transaction.setStatus('ok');
      
      return response;
    } catch (error) {
      // Capture error in Sentry
      logger.error(`API Error: ${request.nextUrl.pathname}`, error, {
        method: request.method,
        url: request.url,
      });

      // Set error status
      transaction.setStatus('internal_error');

      // Return appropriate error response
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('validation')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          );
        }
      }

      // Generic error response
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    } finally {
      transaction.finish();
    }
  };
}

// Helper for wrapping multiple HTTP methods
export function createApiHandler(handlers: {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  DELETE?: ApiHandler;
  PATCH?: ApiHandler;
}, options?: ApiWrapperOptions) {
  const wrappedHandlers: Record<string, ApiHandler> = {};
  
  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrappedHandlers[method] = withApiWrapper(handler, options);
    }
  }
  
  return wrappedHandlers;
}