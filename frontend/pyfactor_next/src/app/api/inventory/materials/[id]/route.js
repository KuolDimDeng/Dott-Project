import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] GET /api/inventory/materials/${id} - fetching material`);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/inventory/materials/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] PUT /api/inventory/materials/${id} - updating material`);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/inventory/materials/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] PATCH /api/inventory/materials/${id} - partial update`);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/inventory/materials/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] DELETE /api/inventory/materials/${id} - deleting material`);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/inventory/materials/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}