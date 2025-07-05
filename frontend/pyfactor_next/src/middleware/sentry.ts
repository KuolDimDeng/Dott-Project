import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export function withSentry(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${request.method} ${request.nextUrl.pathname}`,
    });

    // Add request context
    Sentry.setContext('request', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });

    try {
      const response = await handler(request);
      transaction.setStatus('ok');
      return response;
    } catch (error) {
      Sentry.captureException(error);
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  };
}