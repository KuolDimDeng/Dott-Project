// Individual Calendar Event API Endpoint
// Handles operations on specific calendar events

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch specific calendar event
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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

    // Fetch specific event from backend
    const response = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}`,
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
        { error: errorData.error || 'Failed to fetch calendar event' },
        { status: response.status }
      );
    }

    const event = await response.json();

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
    console.error('[Calendar API] Error fetching specific event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update specific calendar event
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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

    // Update event in backend
    const response = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        },
        body: JSON.stringify(backendData)
      }
    );

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
    console.error('[Calendar API] Error updating specific event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific calendar event
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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

    // Delete event from backend
    const response = await fetch(
      `${API_BASE_URL}/api/calendar/events/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Calendar API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete event' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    console.error('[Calendar API] Error deleting specific event:', error);
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