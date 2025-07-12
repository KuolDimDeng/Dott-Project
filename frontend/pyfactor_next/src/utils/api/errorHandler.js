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

export function createErrorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}