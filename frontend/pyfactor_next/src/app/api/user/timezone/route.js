// User Timezone API Endpoint
// Updates user's timezone preference in the backend

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// PUT - Update user timezone
export async function PUT(request) {
  try {
    console.log('[Timezone API] Updating user timezone');
    
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { timezone } = body;
    
    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 });
    }
    
    // Validate timezone format
    try {
      // Test if timezone is valid by trying to use it
      new Date().toLocaleString('en-US', { timeZone: timezone });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }
    
    console.log('[Timezone API] Updating timezone to:', timezone);
    
    // Update user timezone in backend
    const response = await fetch(`${API_BASE_URL}/api/users/me/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ timezone })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Timezone API] Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to update timezone' },
        { status: response.status }
      );
    }
    
    const updatedUser = await response.json();
    console.log('[Timezone API] Timezone updated successfully');
    
    // Also update the session data to reflect the new timezone
    const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      // Update session with new timezone
      if (sessionData.user) {
        sessionData.user.timezone = timezone;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      timezone: updatedUser.timezone || timezone,
      message: 'Timezone updated successfully'
    });
    
  } catch (error) {
    console.error('[Timezone API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's current timezone
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user data from backend
    const response = await fetch(`${API_BASE_URL}/api/users/me/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: response.status }
      );
    }
    
    const userData = await response.json();
    
    return NextResponse.json({ 
      timezone: userData.timezone || 'UTC',
      detectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
  } catch (error) {
    console.error('[Timezone API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}