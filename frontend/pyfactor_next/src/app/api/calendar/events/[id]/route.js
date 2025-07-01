// Individual Calendar Event API Endpoint
// Handles operations on specific calendar events using in-memory storage

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  findCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  getTotalEventCount,
  getEventColor 
} from '../../shared-storage.js';

// SIMPLIFIED: Check for session cookie only (temporary for in-memory storage)
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Calendar API [id]] No session ID found');
      return null;
    }
    
    console.log('[Calendar API [id]] Found session ID, using simplified verification for in-memory storage');
    
    // For temporary in-memory storage, just verify cookie exists
    return {
      authenticated: true,
      user: { email: 'authenticated-user' },
      tenant_id: 'authenticated-tenant'
    };
  } catch (error) {
    console.error('[Calendar API [id]] Session verification error:', error);
    return null;
  }
}

// GET - Fetch specific calendar event
export async function GET(request, { params }) {
  try {
    console.log('[Calendar API [id] GET] Starting request for ID:', params.id);
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API [id] GET] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Find event in memory storage
    const event = findCalendarEvent(id, tenantId);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Transform to calendar format
    const transformedEvent = {
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
        attendees: event.attendees,
        reminder: event.reminder_minutes,
        recurring: event.is_recurring,
        recurringPattern: event.recurrence_pattern
      }
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('[Calendar API [id]] Error fetching specific event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update specific calendar event
export async function PUT(request, { params }) {
  try {
    console.log('[Calendar API [id] PUT] Starting request for ID:', params.id);
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API [id] PUT] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { tenantId, ...eventData } = body;

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
      reminder_minutes: eventData.reminderMinutes || 15,
      is_recurring: eventData.recurring || false,
      recurrence_pattern: eventData.recurringPattern || null
    };

    // Update the event
    const updatedEvent = updateCalendarEvent(id, tenantId, backendData);
    
    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    console.log('[Calendar API [id] PUT] Updated event:', updatedEvent);

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
    console.error('[Calendar API [id]] Error updating specific event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific calendar event
export async function DELETE(request, { params }) {
  try {
    console.log('[Calendar API [id] DELETE] Starting request for ID:', params.id);
    const sessionData = await verifySession();
    
    if (!sessionData) {
      console.error('[Calendar API [id] DELETE] No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Delete event from memory storage
    const deleted = deleteCalendarEvent(id, tenantId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    console.log('[Calendar API [id] DELETE] Deleted event, remaining events:', getTotalEventCount());

    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    console.error('[Calendar API [id]] Error deleting specific event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

