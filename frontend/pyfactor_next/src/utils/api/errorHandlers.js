import { NextResponse } from 'next/server';

/**
 * Handle authentication errors consistently
 */
export function handleAuthError() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    },
    { status: 401 }
  );
}

/**
 * Handle API errors with consistent format
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  console.error('[API Error]', error);
  
  const status = error.status || 500;
  const message = error.message || defaultMessage;
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: error.details || undefined
    },
    { status }
  );
}

/**
 * Handle validation errors
 */
export function handleValidationError(errors) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors: errors
    },
    { status: 400 }
  );
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(resource = 'Resource') {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`
    },
    { status: 404 }
  );
}

/**
 * Handle permission errors
 */
export function handlePermissionError(action = 'perform this action') {
  return NextResponse.json(
    {
      success: false,
      error: `You don't have permission to ${action}`
    },
    { status: 403 }
  );
}