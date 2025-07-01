# Calendar Events App

This Django app provides calendar event functionality with automatic tenant isolation using Row-Level Security (RLS).

## Features

- Full CRUD operations for calendar events
- Automatic tenant isolation - users can only see/manage events in their tenant
- Event types: meeting, appointment, task, reminder, deadline, personal, business, other
- All-day event support
- Event reminders (in minutes before event)
- Date range filtering
- Special endpoints for upcoming events and today's events

## API Endpoints

The following endpoints are available:

- `GET /api/calendar/events/` - List all events for the tenant
- `POST /api/calendar/events/` - Create a new event
- `GET /api/calendar/events/{id}/` - Get a specific event
- `PUT /api/calendar/events/{id}/` - Update an event
- `DELETE /api/calendar/events/{id}/` - Delete an event
- `GET /api/calendar/events/upcoming/` - Get events for the next 7 days
- `GET /api/calendar/events/today/` - Get today's events

### Query Parameters

- `start_date` - Filter events starting from this date (ISO format)
- `end_date` - Filter events ending before this date (ISO format)
- `event_type` - Filter by event type

## Event Model Fields

- `id` - UUID primary key
- `title` - Event title (required)
- `start_datetime` - Start date/time (required)
- `end_datetime` - End date/time (required, must be after start)
- `all_day` - Boolean flag for all-day events
- `event_type` - Type of event (choices listed above)
- `description` - Optional text description
- `location` - Optional location string
- `reminder_minutes` - Minutes before event to send reminder (0 = no reminder)
- `created_by` - User who created the event (set automatically)
- `tenant_id` - Tenant ID (set automatically from authenticated user)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Security

- All endpoints require authentication
- Automatic tenant filtering based on authenticated user
- Backend validates all tenant access
- Returns 404 (not 403) for cross-tenant access attempts
- Full audit logging of all operations

## Installation

1. The app is already added to INSTALLED_APPS in settings.py
2. Run migrations:
   ```bash
   python manage.py migrate events
   ```
   Or use the SQL script:
   ```bash
   psql -U dott_user -d dott_production -f events/migrations/create_events_table.sql
   ```

## Example Usage

### Create an event:
```json
POST /api/calendar/events/
{
    "title": "Team Meeting",
    "start_datetime": "2025-01-02T10:00:00Z",
    "end_datetime": "2025-01-02T11:00:00Z",
    "event_type": "meeting",
    "location": "Conference Room A",
    "reminder_minutes": 15,
    "all_day": false
}
```

### Get events for a date range:
```
GET /api/calendar/events/?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z
```

### Update an event:
```json
PATCH /api/calendar/events/{event_id}/
{
    "title": "Updated Team Meeting",
    "location": "Conference Room B"
}
```