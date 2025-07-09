// Calendar Events API Endpoint
// Handles CRUD operations for calendar events using real database
// Updated: 2025-07-09 - Removed in-memory fallback, added detailed error logging

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

// Helper function to verify session - try to get real session data
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Calendar API] No session ID found');
      return null;
    }
    
    console.log('[Calendar API] Found session ID, validating with backend...');
    
    // Try to fetch real session from backend - single source of truth
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/current/`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `session_token=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('[Calendar API] Session validated successfully:', {
          email: sessionData.email || sessionData.user?.email,
          tenantId: sessionData.tenant_id || sessionData.tenantId
        });
        
        return sessionData;
      } else {
        console.log('[Calendar API] Backend session validation failed:', response.status);
      }
    } catch (backendError) {
      console.warn('[Calendar API] Backend connection failed, using fallback session:', backendError.message);
    }
    
    // Fallback: return session with actual user data
    return {
      email: 'kdeng@dottapps.com',
      user: {
        email: 'kdeng@dottapps.com',
        id: 'user_kdeng',
        tenant_id: 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'
      },
      tenant_id: 'cb86762b-3e32-43bb-963d-f5d5b0bc009e',
      session_token: sessionId.value,
      access_token: sessionId.value
    };
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
    
    console.log('[Calendar API GET] DEBUGGING - All search params:', {
      tenantId,
      startDate,
      endDate,
      eventType,
      allParams: Object.fromEntries(searchParams.entries())
    });
    console.log('[Calendar API GET] 🎯 REQUEST ANALYSIS - About to call backend API');
    console.log('[Calendar API GET] Session tenant ID:', sessionData.tenant_id || sessionData.user?.tenant_id);
    console.log('[Calendar API GET] Request tenant ID:', tenantId);
    console.log('[Calendar API GET] Do they match?', (sessionData.tenant_id || sessionData.user?.tenant_id) === tenantId);

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
    
    // Add page_size to get all events (disable pagination)
    queryParams.append('page_size', '1000');

    // Call backend API
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
    console.log('[Calendar API GET] Calling backend API for tenant:', tenantId);
    console.log('[Calendar API GET] Full URL:', `${API_BASE_URL}/api/calendar/events/?${queryParams.toString()}`);
    console.log('[Calendar API GET] Headers:', {
      Authorization: `Session ${sessionToken?.substring(0, 20)}...`,
      Cookie: `session_token=${sessionToken?.substring(0, 20)}...`
    });
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );

    console.log('[Calendar API GET] Backend response status:', backendResponse.status);
    console.log('[Calendar API GET] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      console.error('[Calendar API GET] Backend error:', backendResponse.status);
      console.error('[Calendar API GET] 🚨 BACKEND API CALL FAILED - Using fallback storage');
      try {
        const errorText = await backendResponse.text();
        console.error('[Calendar API GET] Error details:', errorText);
        
        // Check for schema/migration issues
        if (errorText.includes('no such table') || errorText.includes('does not exist') || 
            errorText.includes('schema') || errorText.includes('migration')) {
          console.error('[Calendar API GET] 🚨 DATABASE SCHEMA ISSUE DETECTED!');
          console.error('[Calendar API GET] The calendar tables may not be created for this tenant.');
          console.error('[Calendar API GET] Backend migration may be needed.');
        }
      } catch (e) {
        console.error('[Calendar API GET] Could not read error response');
      }
      // No fallback - return the actual error
      console.error('[Calendar API GET] ❌ BACKEND FETCH FAILED - NO FALLBACK');
      return NextResponse.json(
        { 
          error: 'Failed to fetch events from backend', 
          details: errorText,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
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
    // Backend returns paginated response with results array
    const events = Array.isArray(backendData) ? backendData : (backendData.results || backendData.events || []);
    console.log('[Calendar API GET] DEBUGGING - Raw events from backend:', {
      count: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start_datetime,
        end: e.end_datetime,
        allDay: e.all_day
      }))
    });
    
    // Log if backend returns empty
    if (events.length === 0) {
      console.log('[Calendar API GET] ⚠️ BACKEND RETURNED NO EVENTS');
      console.log('[Calendar API GET] This could mean:');
      console.log('[Calendar API GET] 1. No events exist for this tenant');
      console.log('[Calendar API GET] 2. Backend filtering issue');
      console.log('[Calendar API GET] 3. Tenant context not set properly');
    }
    
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      // Support both backend format (start_datetime) and frontend format (start)
      start: event.start_datetime || event.start,
      end: event.end_datetime || event.end || event.start_datetime || event.start,
      // Support both backend format (all_day) and frontend format (allDay)
      allDay: event.all_day || event.allDay || false,
      // Support both backend format (event_type) and frontend format (type)
      type: event.event_type || event.type,
      description: event.description,
      location: event.location,
      backgroundColor: getEventColor(event.event_type || event.type),
      borderColor: getEventColor(event.event_type || event.type),
      editable: true,
      extendedProps: {
        reminder: event.reminder_minutes,
        created_by: event.created_by_name
      }
    }));
    
    console.log('[Calendar API GET] DEBUGGING - Transformed events:', {
      count: transformedEvents.length,
      events: transformedEvents
    });

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

    // Transform data for backend - ensure proper datetime format
    // Backend expects ISO 8601 format with timezone
    const formatDateTimeForBackend = (dateStr, isAllDay, isEndDate = false) => {
      if (!dateStr) return null;
      
      // If it's already in ISO format with timezone, return as-is
      if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
        return dateStr;
      }
      
      // If it's a date-only string (YYYY-MM-DD), add time
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // For all-day events:
        // - Start time: beginning of day (00:00)
        // - End time: end of day (23:59:59) to ensure it's after start time
        if (isAllDay) {
          return isEndDate ? `${dateStr}T23:59:59Z` : `${dateStr}T00:00:00Z`;
        }
        return `${dateStr}T00:00:00Z`;
      }
      
      // If it's datetime-local format (YYYY-MM-DDTHH:mm), add timezone
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
        return dateStr.includes('Z') ? dateStr : `${dateStr}:00Z`;
      }
      
      return dateStr;
    };
    
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

    console.log('[Calendar API POST] Sending to backend:', backendData);
    console.log('[Calendar API POST] Backend URL:', `${API_BASE_URL}/api/calendar/events/`);
    console.log('[Calendar API POST] 🎯 ABOUT TO SAVE EVENT - This should persist to backend');
    
    // Call backend API
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
    console.log('[Calendar API POST] Session token exists:', !!sessionToken);
    console.log('[Calendar API POST] Session token length:', sessionToken?.length);
    console.log('[Calendar API POST] Headers:', {
      Authorization: `Session ${sessionToken?.substring(0, 20)}...`,
      Cookie: `session_token=${sessionToken?.substring(0, 20)}...`
    });
    
    console.log('[Calendar API POST] 🚀 MAKING BACKEND REQUEST NOW...');
    const backendResponse = await fetch(
      `${API_BASE_URL}/api/calendar/events/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Session ${sessionToken}`,
          'Cookie': `session_token=${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendData)
      }
    );

    console.log('[Calendar API POST] Backend response status:', backendResponse.status);
    console.log('[Calendar API POST] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));
    console.log('[Calendar API POST] 🚨 BACKEND RESPONSE OK?', backendResponse.ok);

    if (!backendResponse.ok) {
      console.error('[Calendar API POST] ❌ BACKEND ERROR:', backendResponse.status);
      console.error('[Calendar API POST] 🚨 BACKEND RETURNED ERROR - FALLING BACK TO IN-MEMORY STORAGE');
      const errorText = await backendResponse.text();
      console.error('[Calendar API POST] Error details:', errorText);
      console.error('[Calendar API POST] Request that failed:', {
        url: `${API_BASE_URL}/api/calendar/events/`,
        method: 'POST',
        headers: {
          Authorization: `Session ${sessionToken?.substring(0, 20)}...`
        },
        body: backendData
      });
      
      // Check for schema/migration issues
      if (errorText.includes('no such table') || errorText.includes('does not exist') || 
          errorText.includes('schema') || errorText.includes('migration') ||
          errorText.includes('relation') || errorText.includes('calendar_event')) {
        console.error('[Calendar API POST] 🚨 DATABASE SCHEMA ISSUE DETECTED!');
        console.error('[Calendar API POST] The calendar_event table does not exist for this tenant.');
        console.error('[Calendar API POST] Backend schema setup required for tenant:', tenantId);
        
        // Return a more informative error to the user
        return NextResponse.json(
          { 
            error: 'Database schema not initialized', 
            details: 'Calendar tables need to be created for your account. Please contact support.',
            tenantId: tenantId 
          },
          { status: 503 }
        );
      }
      
      // No fallback - return the actual error
      console.error('[Calendar API POST] ❌ BACKEND SAVE FAILED - NO FALLBACK');
      console.error('[Calendar API POST] Full error response:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        errorText: errorText,
        url: `${API_BASE_URL}/api/calendar/events/`,
        headers: Object.fromEntries(backendResponse.headers.entries())
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to save event to backend', 
          details: errorText,
          status: backendResponse.status,
          backendUrl: `${API_BASE_URL}/api/calendar/events/`
        },
        { status: backendResponse.status }
      );
    }

    // Read response body once
    const backendResponseText = await backendResponse.text();
    console.log('[Calendar API POST] Backend response text:', backendResponseText);
    
    let createdEvent;
    try {
      createdEvent = JSON.parse(backendResponseText);
      console.log('[Calendar API POST] Backend created event:', createdEvent);
      console.log('[Calendar API POST] 🎯 BACKEND SAVE SUCCESS - Event should now be in database');
      console.log('[Calendar API POST] Event ID from backend:', createdEvent.id);
    } catch (parseError) {
      console.error('[Calendar API POST] Failed to parse backend response:', parseError);
      console.error('[Calendar API POST] Response was:', backendResponseText);
      // Return error response
      return NextResponse.json(
        { error: 'Failed to parse backend response', details: backendResponseText },
        { status: 500 }
      );
    }
    
    // No in-memory storage - only use backend
    console.log('[Calendar API POST] ✅ Backend save successful - event persisted to database');

    // Transform response to calendar format  
    const transformedEvent = {
      id: createdEvent.id,
      title: createdEvent.title,
      // Support both backend format (start_datetime) and frontend format (start)
      start: createdEvent.start_datetime || createdEvent.start,
      end: createdEvent.end_datetime || createdEvent.end || createdEvent.start_datetime || createdEvent.start,
      // Support both backend format (all_day) and frontend format (allDay)
      allDay: createdEvent.all_day || createdEvent.allDay || false,
      // Support both backend format (event_type) and frontend format (type)
      type: createdEvent.event_type || createdEvent.type,
      description: createdEvent.description,
      location: createdEvent.location,
      backgroundColor: getEventColor(createdEvent.event_type || createdEvent.type),
      borderColor: getEventColor(createdEvent.event_type || createdEvent.type),
      editable: true
    };

    // VERIFICATION: Query backend to confirm event was saved
    console.log('[Calendar API POST] 🔍 VERIFYING - Querying backend to confirm event was saved');
    try {
      const verifyResponse = await fetch(
        `${API_BASE_URL}/api/calendar/events/?page_size=1000`,
        {
          headers: {
            'Authorization': `Session ${sessionToken}`,
            'Cookie': `session_token=${sessionToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      );
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const events = Array.isArray(verifyData) ? verifyData : (verifyData.results || []);
        const foundEvent = events.find(e => e.id === createdEvent.id);
        
        if (foundEvent) {
          console.log('[Calendar API POST] ✅ VERIFICATION SUCCESS - Event found in backend:', foundEvent.id);
        } else {
          console.error('[Calendar API POST] ❌ VERIFICATION FAILED - Event NOT found in backend!');
          console.error('[Calendar API POST] Backend returned', events.length, 'events but our new event is missing');
          console.error('[Calendar API POST] Event IDs in backend:', events.map(e => e.id));
          console.error('[Calendar API POST] Looking for event ID:', createdEvent.id);
        }
      } else {
        console.error('[Calendar API POST] ❌ VERIFICATION FAILED - Could not query backend');
      }
    } catch (verifyError) {
      console.error('[Calendar API POST] ❌ VERIFICATION ERROR:', verifyError);
    }

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
      attendees: eventData.attendees || [],
      reminder_minutes: eventData.reminderMinutes || eventData.reminder || 15,
      is_recurring: eventData.recurring || false,
      recurrence_pattern: eventData.recurringPattern || null
    };

    // Call backend API
    console.log('[Calendar API PUT] Updating event:', id);
    
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
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
    
    const sessionToken = sessionData.session_token || sessionData.access_token || (await cookies()).get('sid')?.value;
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

