// Calendar Events API Endpoint
// Handles CRUD operations for calendar events using real database

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch calendar events from database
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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
    const queryParams = new URLSearchParams({
      tenant_id: tenantId
    });

    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (eventType) queryParams.append('event_type', eventType);

    // Fetch calendar events from backend
    const response = await fetch(
      `${API_BASE_URL}/api/calendar/events?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Calendar API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch calendar events' },
        { status: response.status }
      );
    }

    const events = await response.json();

    // Transform backend data to calendar format if needed
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
        attendees: event.attendees,
        reminder: event.reminder_minutes,
        recurring: event.is_recurring,
        recurringPattern: event.recurrence_pattern
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, ...eventData } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!eventData.title || !eventData.start) {
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
      attendees: eventData.attendees || [],
      reminder_minutes: eventData.reminder || 15,
      is_recurring: eventData.recurring || false,
      recurrence_pattern: eventData.recurringPattern || null,
      tenant_id: tenantId
    };

    // Create event in backend
    const response = await fetch(`${API_BASE_URL}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Tenant-Id': tenantId
      },
      body: JSON.stringify(backendData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Calendar API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to create event' },
        { status: response.status }
      );
    }

    const createdEvent = await response.json();

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
    console.error('[Calendar API] Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, tenantId, ...eventData } = body;

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
      reminder_minutes: eventData.reminder || 15,
      is_recurring: eventData.recurring || false,
      recurrence_pattern: eventData.recurringPattern || null
    };

    // Update event in backend
    const response = await fetch(`${API_BASE_URL}/api/calendar/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Tenant-Id': tenantId
      },
      body: JSON.stringify(backendData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Calendar API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to update event' },
        { status: response.status }
      );
    }

    const updatedEvent = await response.json();

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Delete event from backend
    const response = await fetch(`${API_BASE_URL}/api/calendar/events/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Calendar API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete event' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[Calendar API] Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get event color based on type
function getEventColor(eventType) {
  const colors = {
    appointment: '#3B82F6', // Blue
    meeting: '#6366F1', // Indigo
    reminder: '#14B8A6', // Teal
    tax: '#DC2626', // Red
    payroll: '#10B981', // Green
    birthday: '#F59E0B', // Amber
    delivery: '#8B5CF6', // Purple
    productExpiry: '#EF4444' // Red
  };
  return colors[eventType] || '#6B7280'; // Gray default
}