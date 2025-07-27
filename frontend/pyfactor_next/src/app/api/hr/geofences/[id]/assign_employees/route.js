import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function POST(request, { params }) {
  try {
    console.log('[Geofences Assign API] === POST REQUEST START ===');
    console.log('[Geofences Assign API] Geofence ID:', params.id);
    
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Geofences Assign API] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const body = await request.json();
    console.log('[Geofences Assign API] Request body:', body);
    console.log('[Geofences Assign API] Employee IDs:', body.employee_ids);

    const backendUrl = `${BACKEND_URL}/api/hr/geofences/${params.id}/assign_employees/`;
    console.log('[Geofences Assign API] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    console.log('[Geofences Assign API] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geofences Assign API] ❌ Backend error response:', errorText);
      console.error('[Geofences Assign API] Backend status:', response.status);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to assign employees',
          detail: errorData,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Geofences Assign API] Success, data received:', data);
    console.log('[Geofences Assign API] Total assigned:', data.total_assigned);
    console.log('[Geofences Assign API] Final count:', data.final_count);
    console.log('[Geofences Assign API] === POST REQUEST END ===');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Geofences Assign API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    );
  }
}