import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle individual CRM contacts
 */
export async function GET(request, { params }) {
  try {
    // Get contact ID from route params
    const id = params.id;
    
    // Get auth token from request headers
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch contact from backend API
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/crm/contacts/${id}/`,
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

export async function PUT(request, { params }) {
  try {
    // Get contact ID from route params
    const id = params.id;
    
    // Get auth token from request headers
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Update contact in backend API
    const response = await fetch(`${process.env.BACKEND_API_URL}/crm/contacts/${id}/`, {
      method: 'PUT',
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

export async function DELETE(request, { params }) {
  try {
    // Get contact ID from route params
    const id = params.id;
    
    // Get auth token from request headers
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete contact in backend API
    const response = await fetch(`${process.env.BACKEND_API_URL}/crm/contacts/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: authHeader }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error('Error in CRM contacts API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}