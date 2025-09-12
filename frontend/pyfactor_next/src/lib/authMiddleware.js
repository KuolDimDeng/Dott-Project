import { NextResponse } from 'next/server';

export function withAuth(handler) {
  return async function(request, context) {
    // For API routes, just pass through - auth is handled by backend
    // This is a simple wrapper to maintain compatibility
    return handler(request, context);
  };
}

export default withAuth;