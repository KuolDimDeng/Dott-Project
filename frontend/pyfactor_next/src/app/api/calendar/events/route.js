// Calendar Events API Endpoint
// Handles CRUD operations for calendar events using real database

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  getEventsByTenant, 
  addCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  findCalendarEvent,
  getTotalEventCount,
  getEventColor 
} from '../shared-storage.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Helper function to verify session using the same pattern as session-v2
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Calendar API] No session ID found');
      return null;
    }
    
    console.log('[Calendar API] Found session ID, validating with backend...');
    
    // Fetch session from backend - single source of truth
    const response = await fetch(`${API_BASE_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.log('[Calendar API] Backend session validation failed:', response.status);
      return null;
    }
    
    const sessionData = await response.json();
    console.log('[Calendar API] Session validated successfully:', {
      email: sessionData.email || sessionData.user?.email,
      tenantId: sessionData.tenant_id || sessionData.tenantId
    });
    
    return sessionData;
  } catch (error) {
    console.error('[Calendar API] Session verification error:', error);
    return null;
  }
}

// GET - Fetch calendar events from database
export async function GET(request) {
  try {
    console.log('[Calendar API GET] Starting request');
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API GET] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const eventType = searchParams.get('type');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams();

    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (eventType) queryParams.append('event_type', eventType);

    // Call backend API
    console.log('[Calendar API GET] Calling backend API for tenant:', tenantId);
    
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token || sessionData.session_token || (await cookies()).get('sid')?.value}`,
          'Content-Type': 'application/json',
          'X-Session-Token': sessionData.session_token || (await cookies()).get('sid')?.value
        },
        cache: 'no-store'
      }
    );

    if (!backendResponse.ok) {
      console.error('[Calendar API GET] Backend error:', backendResponse.status);
      try {
        const errorText = await backendResponse.text();
        console.error('[Calendar API GET] Error details:', errorText);
      } catch (e) {
        console.error('[Calendar API GET] Could not read error response');
      }
      // Fallback to in-memory storage if backend not available
      console.log('[Calendar API GET] Falling back to in-memory storage due to backend error');
      const events = getEventsByTenant(tenantId);
      const transformedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_datetime,
        end: event.end_datetime,
        allDay: event.all_day || false,
        type: event.event_type,
        description: event.description,
        location: event.location,
        backgroundColor: getEventColor(event.event_type),
        borderColor: getEventColor(event.event_type),
        editable: true
      }));
      return NextResponse.json(transformedEvents);
    }

    const backendText = await backendResponse.text();
    console.log('[Calendar API GET] Backend response text:', backendText);
    
    let backendData;
    try {
      backendData = JSON.parse(backendText);
      console.log('[Calendar API GET] Parsed backend response:', backendData);
    } catch (e) {
      console.error('[Calendar API GET] Failed to parse backend response as JSON');
      // Return empty array if parsing fails
      return NextResponse.json([]);
    }

    // Transform backend data to calendar format
    const events = Array.isArray(backendData) ? backendData : (backendData.results || []);
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_datetime,
      end: event.end_datetime,
      allDay: event.all_day || false,
      type: event.event_type,
      description: event.description,
      location: event.location,
      backgroundColor: getEventColor(event.event_type),
      borderColor: getEventColor(event.event_type),
      editable: true,
      extendedProps: {
        reminder: event.reminder_minutes,
        created_by: event.created_by_name
      }
    }));

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('[Calendar API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new calendar event
export async function POST(request) {
  try {
    console.log('[Calendar API POST] Starting request');
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API POST] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Log session info for debugging
    console.log('[Calendar API POST] Session info:', { 
      hasSession: !!sessionData, 
      email: sessionData?.email || sessionData?.user?.email,
      tenantId: sessionData?.tenant_id || sessionData?.tenantId
    });

    const body = await request.json();
    console.log('[Calendar API POST] Request body:', body);
    
    const { tenantId, ...eventData } = body;

    if (!tenantId) {
      console.error('[Calendar API POST] No tenant ID provided');
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!eventData.title || !eventData.start) {
      console.error('[Calendar API POST] Missing required fields:', {
        hasTitle: !!eventData.title,
        hasStart: !!eventData.start
      });
      return NextResponse.json(
        { error: 'Title and start date are required' },
        { status: 400 }
      );
    }

    // Transform data for backend
    const backendData = {
      title: eventData.title,
      start_datetime: eventData.start,
      end_datetime: eventData.end || eventData.start,
      all_day: eventData.allDay || false,
      event_type: eventData.type || 'appointment',
      description: eventData.description || '',
      location: eventData.location || '',
      reminder_minutes: eventData.reminderMinutes || eventData.reminder || 15
    };

    console.log('[Calendar API POST] Sending to backend:', backendData);

    // Call backend API
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.access_token || sessionData.session_token || (await cookies()).get('sid')?.value}`,
          'Content-Type': 'application/json',
          'X-Session-Token': sessionData.session_token || (await cookies()).get('sid')?.value
        },
        body: JSON.stringify(backendData)
      }
    );

    if (!backendResponse.ok) {
      console.error('[Calendar API POST] Backend error:', backendResponse.status);
      const errorText = await backendResponse.text();
      console.error('[Calendar API POST] Error details:', errorText);
      
      // Fallback to in-memory storage
      console.log('[Calendar API POST] Falling back to in-memory storage');
      const eventId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdEvent = {
        id: eventId,
        ...backendData,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      addCalendarEvent(createdEvent);
      
      const transformedEvent = {
        id: createdEvent.id,
        title: createdEvent.title,
        start: createdEvent.start_datetime,
        end: createdEvent.end_datetime,
        allDay: createdEvent.all_day,
        type: createdEvent.event_type,
        description: createdEvent.description,
        location: createdEvent.location,
        backgroundColor: getEventColor(createdEvent.event_type),
        borderColor: getEventColor(createdEvent.event_type),
        editable: true
      };
      
      return NextResponse.json(transformedEvent, { status: 201 });
    }

    const createdEvent = await backendResponse.json();
    console.log('[Calendar API POST] Backend created event:', createdEvent);

    // Transform response to calendar format
    const transformedEvent = {
      id: createdEvent.id,
      title: createdEvent.title,
      start: createdEvent.start_datetime,
      end: createdEvent.end_datetime,
      allDay: createdEvent.all_day,
      type: createdEvent.event_type,
      description: createdEvent.description,
      location: createdEvent.location,
      backgroundColor: getEventColor(createdEvent.event_type),
      borderColor: getEventColor(createdEvent.event_type),
      editable: true
    };

    return NextResponse.json(transformedEvent, { status: 201 });
  } catch (error) {
    console.error('[Calendar API POST] Error creating event:', error);
    console.error('[Calendar API POST] Error stack:', error.stack);
    console.error('[Calendar API POST] Error name:', error.name);
    console.error('[Calendar API POST] Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(request) {
  try {
    console.log('[Calendar API PUT] Starting request');
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API PUT] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both body ID and URL path ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const urlId = pathParts[pathParts.length - 1] !== 'events' ? pathParts[pathParts.length - 1] : null;
    
    const body = await request.json();
    const { id: bodyId, tenantId, ...eventData } = body;
    const id = urlId || bodyId;

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Transform data for backend
    const backendData = {
      title: eventData.title,
      start_datetime: eventData.start,
      end_datetime: eventData.end || eventData.start,
      all_day: eventData.allDay || false,
      event_type: eventData.type || 'appointment',
      description: eventData.description || '',
      location: eventData.location || '',
      attendees: eventData.attendees || [],
      reminder_minutes: eventData.reminderMinutes || eventData.reminder || 15,
      is_recurring: eventData.recurring || false,
      recurrence_pattern: eventData.recurringPattern || null
    };

    // Call backend API
    console.log('[Calendar API PUT] Updating event:', id);
    
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}/`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData.access_token || sessionData.session_token || (await cookies()).get('sid')?.value}`,
          'Content-Type': 'application/json',
          'X-Session-Token': sessionData.session_token || (await cookies()).get('sid')?.value
        },
        body: JSON.stringify(backendData)
      }
    );

    if (!backendResponse.ok) {
      console.error('[Calendar API PUT] Backend error:', backendResponse.status);
      
      // Fallback to in-memory storage
      const updatedEvent = updateCalendarEvent(id, tenantId, backendData);
      if (!updatedEvent) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      
      const transformedEvent = {
        id: updatedEvent.id,
        title: updatedEvent.title,
        start: updatedEvent.start_datetime,
        end: updatedEvent.end_datetime,
        allDay: updatedEvent.all_day,
        type: updatedEvent.event_type,
        description: updatedEvent.description,
        location: updatedEvent.location,
        backgroundColor: getEventColor(updatedEvent.event_type),
        borderColor: getEventColor(updatedEvent.event_type),
        editable: true
      };
      
      return NextResponse.json(transformedEvent);
    }

    const updatedEvent = await backendResponse.json();
    console.log('[Calendar API PUT] Backend updated event:', updatedEvent);

    // Transform response to calendar format
    const transformedEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      start: updatedEvent.start_datetime,
      end: updatedEvent.end_datetime,
      allDay: updatedEvent.all_day,
      type: updatedEvent.event_type,
      description: updatedEvent.description,
      location: updatedEvent.location,
      backgroundColor: getEventColor(updatedEvent.event_type),
      borderColor: getEventColor(updatedEvent.event_type),
      editable: true
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('[Calendar API] Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(request) {
  try {
    console.log('[Calendar API DELETE] Starting request');
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API DELETE] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const pathParts = url.pathname.split('/');
    const urlId = pathParts[pathParts.length - 1] !== 'events' ? pathParts[pathParts.length - 1] : null;
    
    const id = urlId || searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Call backend API
    console.log('[Calendar API DELETE] Deleting event:', id);
    
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}/`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.access_token || sessionData.session_token || (await cookies()).get('sid')?.value}`,
          'X-Session-Token': sessionData.session_token || (await cookies()).get('sid')?.value
        }
      }
    );

    if (!backendResponse.ok) {
      console.error('[Calendar API DELETE] Backend error:', backendResponse.status);
      
      // Fallback to in-memory storage
      const deleted = deleteCalendarEvent(id, tenantId);
      if (!deleted) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      
      return NextResponse.json({ message: 'Event deleted successfully' });
    }

    console.log('[Calendar API DELETE] Backend deleted event successfully');
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[Calendar API] Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

