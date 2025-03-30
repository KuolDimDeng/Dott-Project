import { NextResponse } from 'next/server';
import axios from 'axios';
import { getLogger } from '@/utils/logger';
import { cookies } from 'next/headers';

const logger = getLogger('tenant-current-api');

/**
 * API route to get the current tenant for the authenticated user
 * This acts as a proxy to the backend API
 */
export async function GET(request) {
  try {
    // Get auth credentials from cookies
    const cookieStore = cookies();
    const idToken = cookieStore.get('idToken')?.value;
    const sessionCookie = cookieStore.get('pyfactor_session')?.value;
    
    if (!idToken && !sessionCookie) {
      logger.error('No authentication token found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const apiUrl = `${backendUrl}/api/tenant/current/`;
    
    // Extract headers from original request
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization headers
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    // Make request to backend
    const response = await axios.get(apiUrl, { headers });
    
    // Return the response data
    return NextResponse.json(response.data);
  } catch (error) {
    // Check if error is an Axios error
    if (error.response) {
      // Forward the status code and error message from the backend
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      logger.error(`Backend returned error ${statusCode}:`, errorData);
      return NextResponse.json(errorData, { status: statusCode });
    }
    
    // Handle other errors
    logger.error('Error fetching current tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current tenant', detail: error.message },
      { status: 500 }
    );
  }
} 