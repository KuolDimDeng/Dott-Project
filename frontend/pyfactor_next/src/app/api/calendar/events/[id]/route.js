// Calendar Events API - Individual Event Endpoint
// Handles updating and deleting specific calendar events

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEventColor } from '../../shared-storage.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Helper function to verify session
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Calendar API] No session ID found');
      return null;
    }
    
    // Return minimal session data
    return {
      session_token: sessionId.value,
      access_token: sessionId.value
    };
  } catch (error) {
    console.error('[Calendar API] Session verification error:', error);
    return null;
  }
}

// PUT - Update calendar event
export async function PUT(request, { params }) {
  try {
    console.log('[Calendar API PUT] Starting request for event:', params.id);
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API PUT] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, ...eventData } = body;
    const id = params.id;

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Use the same date formatting function
    const formatDateTimeForBackend = (dateStr, isAllDay, isEndDate = false) => {
      if (!dateStr) return null;
      
      if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
        return dateStr;
      }
      
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        if (isAllDay) {
          return isEndDate ? `${dateStr}T23:59:59Z` : `${dateStr}T00:00:00Z`;
        }
        return `${dateStr}T00:00:00Z`;
      }
      
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
        return dateStr.includes('Z') ? dateStr : `${dateStr}:00Z`;
      }
      
      return dateStr;
    };

    // Transform data for backend
    const backendData = {
      title: eventData.title,
      start_datetime: formatDateTimeForBackend(eventData.start, eventData.allDay, false),
      end_datetime: formatDateTimeForBackend(eventData.end || eventData.start, eventData.allDay, true),
      all_day: eventData.allDay || false,
      event_type: eventData.type || 'appointment',
      description: eventData.description || '',
      location: eventData.location || '',
      reminder_minutes: eventData.reminderMinutes || eventData.reminder || 15
    };

    // Call backend API
    console.log('[Calendar API PUT] Updating event:', id);
    console.log('[Calendar API PUT] Backend data being sent:', backendData);
    console.log('[Calendar API PUT] Backend URL:', `${API_BASE_URL}/api/calendar/events/${id}/`);
    
    const sessionToken = sessionData.session_token || sessionData.access_token;
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}/`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendData)
      }
    );
    
    console.log('[Calendar API PUT] Backend response status:', backendResponse.status);
    console.log('[Calendar API PUT] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Calendar API PUT] Backend error:', backendResponse.status);
      console.error('[Calendar API PUT] Error details:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to update event', 
          details: errorText,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    // Read response body once and handle non-JSON responses
    const backendResponseText = await backendResponse.text();
    console.log('[Calendar API PUT] Backend response text:', backendResponseText);
    
    let updatedEvent;
    try {
      updatedEvent = JSON.parse(backendResponseText);
      console.log('[Calendar API PUT] Backend updated event:', updatedEvent);
    } catch (parseError) {
      console.error('[Calendar API PUT] Failed to parse backend response:', parseError);
      console.error('[Calendar API PUT] Response was:', backendResponseText);
      
      // If parsing fails but request was successful, return success with the original data
      const transformedEvent = {
        id: id,
        title: eventData.title,
        start: eventData.start,
        end: eventData.end || eventData.start,
        allDay: eventData.allDay || false,
        type: eventData.type || 'appointment',
        description: eventData.description || '',
        location: eventData.location || '',
        backgroundColor: getEventColor(eventData.type || 'appointment'),
        borderColor: getEventColor(eventData.type || 'appointment'),
        editable: true
      };
      
      return NextResponse.json(transformedEvent);
    }

    // Transform response to calendar format
    const transformedEvent = {
      id: updatedEvent.id || id,
      title: updatedEvent.title,
      // Support both backend format (start_datetime) and frontend format (start)
      start: updatedEvent.start_datetime || updatedEvent.start,
      end: updatedEvent.end_datetime || updatedEvent.end || updatedEvent.start_datetime || updatedEvent.start,
      // Support both backend format (all_day) and frontend format (allDay)
      allDay: updatedEvent.all_day || updatedEvent.allDay || false,
      // Support both backend format (event_type) and frontend format (type)
      type: updatedEvent.event_type || updatedEvent.type,
      description: updatedEvent.description,
      location: updatedEvent.location,
      backgroundColor: getEventColor(updatedEvent.event_type || updatedEvent.type),
      borderColor: getEventColor(updatedEvent.event_type || updatedEvent.type),
      editable: true
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('[Calendar API PUT] Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(request, { params }) {
  try {
    console.log('[Calendar API DELETE] Starting request for event:', params.id);
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API DELETE] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const id = params.id;
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Call backend API
    console.log('[Calendar API DELETE] Deleting event:', id);
    
    const sessionToken = sessionData.session_token || sessionData.access_token;
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}/`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Calendar API DELETE] Backend error:', backendResponse.status);
      console.error('[Calendar API DELETE] Error details:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to delete event', details: errorText },
        { status: backendResponse.status }
      );
    }

    console.log('[Calendar API DELETE] Backend deleted event successfully');
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[Calendar API DELETE] Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}