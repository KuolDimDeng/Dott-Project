import { NextResponse } from 'next/server';

export function handleApiError(error) {
  console.error('API Error:', error);
  
  if (error.response) {
    // Error from upstream server
    return NextResponse.json(
      { 
        error: error.response.data?.error || error.message || 'An error occurred',
        details: error.response.data
      },
      { status: error.response.status }
    );
  } else if (error.request) {
    // Network error
    return NextResponse.json(
      { error: 'Network error - unable to reach server' },
      { status: 503 }
    );
  } else {
    // Other errors
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export function handleAuthError(error) {
  console.error('Auth Error:', error);
  
  // Check if it's an authentication error
  if (error.status === 401 || error.response?.status === 401) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // For other auth-related errors
  return handleApiError(error);
}

export function createErrorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}