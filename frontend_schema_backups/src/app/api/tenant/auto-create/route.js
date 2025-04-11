import { NextResponse } from 'next/server';
import { getJwtFromRequest } from '@/utils/auth/authUtils';

/**
 * API route that forwards to getOrCreate endpoint for tenant creation.
 * This is a compatibility endpoint for the middleware.
 */
export async function POST(request) {
  try {
    // Extract user information from JWT
    const jwt = await getJwtFromRequest(request);
    
    if (!jwt || !jwt.sub) {
      return NextResponse.json({
        success: false,
        message: 'No authenticated user found'
      }, { status: 401 });
    }
    
    // Get the original URL
    const url = new URL(request.url);
    
    // Create a new URL for the getOrCreate endpoint
    const forwardUrl = new URL('/api/tenant/getOrCreate', url.origin);
    
    // Forward the request
    console.log(`Forwarding tenant creation request to getOrCreate endpoint for user: ${jwt.sub}`);
    
    // Headers to forward
    const headers = new Headers(request.headers);
    
    // Request body (if any)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      // No body or invalid JSON
      body = {};
    }
    
    // Forward to getOrCreate endpoint
    const forwardResponse = await fetch(forwardUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    // Return the response from getOrCreate
    return forwardResponse;
    
  } catch (error) {
    console.error(`Error forwarding to getOrCreate: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: `Failed to create tenant: ${error.message}`
    }, { status: 500 });
  }
} 