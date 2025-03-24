import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle CRM contacts
 */
export async function GET(request) {
  try {
    // Get auth token from request headers
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search params
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || 1;
    const limit = searchParams.get('limit') || 10;
    const search = searchParams.get('search') || '';
    
    // Build query params
    let queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (search) {
      queryParams.append('search', search);
    }
    
    // Fetch contacts from backend API
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/crm/contacts/?${queryParams.toString()}`,
      {
        headers: { Authorization: authHeader }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('Error in CRM contacts API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Get auth token from request headers
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Create contact in backend API
    const response = await fetch(`${process.env.BACKEND_API_URL}/crm/contacts/`, {
      method: 'POST',
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('Error in CRM contacts API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}