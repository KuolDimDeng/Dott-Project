/**
 * Banking Connection Detail API Route
 * Manages individual bank account connections
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/banking/connections/:id
 * Get a specific bank connection
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/connections/${id}/`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch connection' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Connection GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/banking/connections/:id
 * Updates a bank connection (e.g., set as primary)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/connections/${id}/`;
    
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to update connection' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Connection PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/banking/connections/:id
 * Disconnects a bank account
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log('[Connection DELETE] Attempting to delete connection:', id);
    
    // Django REST framework requires trailing slash
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/connections/${id}/`;
    console.log('[Connection DELETE] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    console.log('[Connection DELETE] Response status:', response.status);

    if (response.status === 204 || response.status === 200) {
      // Success - no content expected
      return NextResponse.json(
        { success: true, message: 'Bank account disconnected' },
        { status: 200 }
      );
    }

    // Try to get error message
    let errorMessage = 'Failed to disconnect bank account';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = `Failed to disconnect: ${response.statusText}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: response.status }
    );

  } catch (error) {
    console.error('[Connection DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect bank account' },
      { status: 500 }
    );
  }
}