import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * Supplies API - for repair supplies, materials, and parts used in service jobs
 * This is different from:
 * - Vendors (businesses that supply TO you)
 * - Product-Suppliers (products you sell to customers)
 * Maps to Django materials endpoint
 */

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward to Django backend materials endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/materials/${queryString ? `?${queryString}` : ''}`;
    
    console.log('[Supplies API] Fetching from:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Supplies API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the response to match frontend expectations
    let supplies = [];
    if (Array.isArray(data)) {
      supplies = data;
    } else if (data?.results) {
      supplies = data.results;
    }
    
    // Add compatibility fields
    supplies = supplies.map(supply => ({
      ...supply,
      stock_quantity: supply.quantity || supply.stock_quantity || 0,
      quantity_in_stock: supply.quantity || supply.stock_quantity || 0
    }));
    
    // Return in the expected format
    const responseData = {
      results: supplies,
      count: data?.count || supplies.length,
      next: data?.next || null,
      previous: data?.previous || null
    };
    
    console.log('[Supplies API] Returning', responseData.results.length, 'supplies');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Supplies API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Transform the data if needed
    const supplyData = {
      ...body,
      is_active: true,
      // Ensure quantity is set - handle various field names
      quantity: body.quantity || body.stock_quantity || body.quantity_in_stock || 0,
    };
    
    console.log('[Supplies API] Creating supply:', supplyData);
    
    // Forward to Django backend materials endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/materials/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(supplyData),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Supplies API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Add compatibility fields
    if (data) {
      data.stock_quantity = data.quantity || data.stock_quantity || 0;
      data.quantity_in_stock = data.quantity || data.stock_quantity || 0;
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Supplies API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create supply' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Extract supply ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const supplyId = pathParts[pathParts.length - 1];
    
    if (!supplyId || supplyId === 'supplies') {
      return NextResponse.json({ error: 'Supply ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Transform the data if needed
    const supplyData = {
      ...body,
      quantity: body.quantity || body.stock_quantity || body.quantity_in_stock || 0,
    };
    
    // Forward to Django backend
    const backendUrl = `${BACKEND_URL}/api/inventory/materials/${supplyId}/`;
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(supplyData),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Supplies API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Add compatibility fields
    if (data) {
      data.stock_quantity = data.quantity || data.stock_quantity || 0;
      data.quantity_in_stock = data.quantity || data.stock_quantity || 0;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Supplies API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update supply' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Extract supply ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const supplyId = pathParts[pathParts.length - 1];
    
    if (!supplyId || supplyId === 'supplies') {
      return NextResponse.json({ error: 'Supply ID is required' }, { status: 400 });
    }
    
    // Forward to Django backend
    const backendUrl = `${BACKEND_URL}/api/inventory/materials/${supplyId}/`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Supplies API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    // DELETE might return 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Supplies API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete supply' },
      { status: 500 }
    );
  }
}