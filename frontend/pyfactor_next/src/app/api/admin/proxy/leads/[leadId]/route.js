import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    console.log('🎯 [AdminLeadDetailProxy] === GET LEAD DETAILS START ===');
    console.log('🎯 [AdminLeadDetailProxy] Lead ID:', params.leadId);
    
    const backendUrl = `${BACKEND_URL}/api/leads/${params.leadId}/`;
    console.log('🎯 [AdminLeadDetailProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    
    console.log('🎯 [AdminLeadDetailProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadDetailProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch lead details from backend' },
        { status: backendResponse.status }
      );
    }
    
    const data = await backendResponse.json();
    console.log('🎯 [AdminLeadDetailProxy] Successfully fetched lead details');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🎯 [AdminLeadDetailProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    console.log('🎯 [AdminLeadUpdateProxy] === UPDATE LEAD START ===');
    console.log('🎯 [AdminLeadUpdateProxy] Lead ID:', params.leadId);
    
    const body = await request.json();
    console.log('🎯 [AdminLeadUpdateProxy] Request body:', body);
    
    const backendUrl = `${BACKEND_URL}/api/leads/${params.leadId}/`;
    console.log('🎯 [AdminLeadUpdateProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    
    console.log('🎯 [AdminLeadUpdateProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadUpdateProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update lead' },
        { status: backendResponse.status }
      );
    }
    
    const data = await backendResponse.json();
    console.log('🎯 [AdminLeadUpdateProxy] Successfully updated lead');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🎯 [AdminLeadUpdateProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    console.log('🎯 [AdminLeadDeleteProxy] === DELETE LEAD START ===');
    console.log('🎯 [AdminLeadDeleteProxy] Lead ID:', params.leadId);
    
    const backendUrl = `${BACKEND_URL}/api/leads/${params.leadId}/`;
    console.log('🎯 [AdminLeadDeleteProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    
    console.log('🎯 [AdminLeadDeleteProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadDeleteProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete lead' },
        { status: backendResponse.status }
      );
    }
    
    console.log('🎯 [AdminLeadDeleteProxy] Successfully deleted lead');
    
    return NextResponse.json({ message: 'Lead deleted successfully' });
    
  } catch (error) {
    console.error('🎯 [AdminLeadDeleteProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}