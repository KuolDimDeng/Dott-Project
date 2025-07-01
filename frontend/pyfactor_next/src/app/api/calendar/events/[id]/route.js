// Individual Calendar Event API Endpoint
// Handles operations on specific calendar events

import { NextResponse } from 'next/server';

// PUT - Update specific calendar event
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { tenantId, title, type, start, end, allDay, description, location } = body;

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the event exists and belongs to the tenant
    // 3. Update the event in the database
    
    const updatedEvent = {
      id,
      title,
      type,
      start,
      end,
      allDay,
      description,
      location,
      updatedAt: new Date().toISOString()
    };

    console.log(`[Calendar API] Updating specific event ${id} for tenant: ${tenantId}`, updatedEvent);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('[Calendar API] Error updating specific event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific calendar event
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the event exists and belongs to the tenant
    // 3. Delete the event from the database
    
    console.log(`[Calendar API] Deleting specific event ${id} for tenant: ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('[Calendar API] Error deleting specific event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}

// GET - Fetch specific calendar event
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json(
        { error: 'Event ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Query the database for the specific event
    
    console.log(`[Calendar API] Fetching specific event ${id} for tenant: ${tenantId}`);

    // Mock event data
    const event = {
      id,
      title: 'Sample Event',
      start: '2025-07-01T10:00:00',
      end: '2025-07-01T11:00:00',
      type: 'appointment',
      description: 'Sample event description',
      location: 'Sample location',
      allDay: false,
      editable: true
    };

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('[Calendar API] Error fetching specific event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    );
  }
}