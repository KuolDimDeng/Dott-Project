'use client';

import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  BellIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CakeIcon,
  TruckIcon,
  DocumentTextIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

// Event type configurations
const EVENT_TYPES = {
  appointment: { color: '#3B82F6', icon: ClockIcon, label: 'Appointment' },
  tax: { color: '#DC2626', icon: DocumentTextIcon, label: 'Tax Deadline' },
  payroll: { color: '#10B981', icon: CurrencyDollarIcon, label: 'Payroll' },
  birthday: { color: '#F59E0B', icon: CakeIcon, label: 'Birthday' },
  productExpiry: { color: '#EF4444', icon: ExclamationCircleIcon, label: 'Product Expiry' },
  delivery: { color: '#8B5CF6', icon: TruckIcon, label: 'Delivery' },
  meeting: { color: '#6366F1', icon: BuildingOfficeIcon, label: 'Meeting' },
  reminder: { color: '#14B8A6', icon: BellIcon, label: 'Reminder' }
};

export default function Calendar({ onNavigate }) {
  console.log('[Calendar] COMPONENT LOADED - DEBUG VERSION 2025-07-09-v2');
  const { user, loading: sessionLoading } = useSession();
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [calendarRef, setCalendarRef] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for new/edit event
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'appointment',
    start: '',
    end: '',
    allDay: false,
    description: '',
    location: '',
    sendReminder: true,
    reminderMinutes: 30
  });

  // Initialize and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          await loadEvents(id);
        }
      } catch (error) {
        console.error('[Calendar] Error during initialization:', error);
        toast.error('Failed to initialize calendar');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!sessionLoading) {
      initialize();
    }
  }, [sessionLoading]);

  // Load events from multiple sources
  const loadEvents = async (tenantId) => {
    try {
      console.log('[Calendar] loadEvents called with tenantId:', tenantId);
      
      // Load calendar events
      const calendarEvents = await fetchCalendarEvents(tenantId);
      console.log('[Calendar] Loaded calendar events:', calendarEvents.length);
      
      // Load employee birthdays
      const birthdays = await fetchEmployeeBirthdays(tenantId);
      
      // Load tax deadlines
      const taxDeadlines = await fetchTaxDeadlines(tenantId);
      
      // Load payroll dates
      const payrollDates = await fetchPayrollDates(tenantId);
      
      // Load product expiry dates
      const productExpiries = await fetchProductExpiries(tenantId);
      
      // Combine all events
      const allEvents = [
        ...calendarEvents,
        ...birthdays,
        ...taxDeadlines,
        ...payrollDates,
        ...productExpiries
      ];
      
      console.log('[Calendar] Total events to display:', allEvents.length);
      console.log('[Calendar] All events:', allEvents);
      
      // Log first event details for debugging
      if (allEvents.length > 0) {
        console.log('[Calendar] First event details:', {
          id: allEvents[0].id,
          title: allEvents[0].title,
          start: allEvents[0].start,
          end: allEvents[0].end,
          allDay: allEvents[0].allDay,
          type: allEvents[0].type,
          color: allEvents[0].color,
          backgroundColor: allEvents[0].backgroundColor,
          borderColor: allEvents[0].borderColor
        });
      }
      
      console.log('[Calendar] Setting events state with:', allEvents.length, 'events');
      setEvents(allEvents);
      
      // Events will be automatically displayed via the events prop
      console.log('[Calendar] Events loaded and set in state - FullCalendar will render them automatically');
      console.log('[Calendar] Calendar ref available:', !!calendarRef);
      
      if (calendarRef) {
        const calendarApi = calendarRef.getApi();
        console.log('[Calendar] Forcing calendar re-render to ensure events are displayed');
        calendarApi.render();
      }
    } catch (error) {
      console.error('[Calendar] Error loading events:', error);
      toast.error('Failed to load calendar events');
    }
  };

  // Fetch calendar events
  const fetchCalendarEvents = async (tenantId) => {
    try {
      console.log('[Calendar] Fetching calendar events for tenant:', tenantId);
      const response = await fetch(`/api/calendar/events?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      console.log('[Calendar] Calendar events response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Calendar] Calendar events data:', data);
        // Handle both array response and object with events property
        const events = Array.isArray(data) ? data : (data.events || []);
        console.log('[Calendar] Processed calendar events:', events);
        
        // COMPARISON DEBUG: Analyze each event to understand the differences
        events.forEach((event, index) => {
          console.log(`🎯 [Calendar] RAW EVENT ${index + 1} ANALYSIS:`, {
            id: event.id,
            title: event.title,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            all_day: event.all_day,
            type: event.type,
            event_type: event.event_type,
            isPlaceholder: event.title === "Test Event from API",
            rawEventKeys: Object.keys(event)
          });
        });
        
        const mappedEvents = events.map((event, index) => {
          console.log(`[Calendar] Processing event ${index + 1}/${events.length}:`, {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            type: event.type
          });
          
          const eventData = {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end || event.start,
            allDay: event.allDay || false,
            color: EVENT_TYPES[event.type]?.color || '#6B7280',
            backgroundColor: event.backgroundColor || EVENT_TYPES[event.type]?.color || '#6B7280',
            borderColor: event.borderColor || EVENT_TYPES[event.type]?.color || '#6B7280',
            extendedProps: {
              type: event.type,
              description: event.description,
              location: event.location,
              editable: true,
              sendReminder: event.sendReminder,
              reminderMinutes: event.reminderMinutes
            }
          };
          
          console.log(`[Calendar] Mapped event ${index + 1}:`, {
            id: eventData.id,
            title: eventData.title,
            start: eventData.start,
            end: eventData.end,
            allDay: eventData.allDay,
            color: eventData.color
          });
          
          return eventData;
        });
        console.log('[Calendar] Mapped events with colors:', mappedEvents);
        return mappedEvents;
      }
      console.log('[Calendar] Calendar events response not ok');
      return [];
    } catch (error) {
      console.error('[Calendar] Error fetching calendar events:', error);
      return [];
    }
  };

  // Fetch employee birthdays
  const fetchEmployeeBirthdays = async (tenantId) => {
    try {
      const response = await fetch(`/api/hr/employees/birthdays?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.birthdays || []).map(birthday => ({
          id: `birthday-${birthday.employeeId}`,
          title: `🎂 ${birthday.name}'s Birthday`,
          start: birthday.date,
          allDay: true,
          type: 'birthday',
          color: EVENT_TYPES.birthday.color,
          editable: false,
          className: 'birthday-event'
        }));
      }
      return [];
    } catch (error) {
      console.error('[Calendar] Error fetching birthdays:', error);
      return [];
    }
  };

  // Fetch tax deadlines
  const fetchTaxDeadlines = async (tenantId) => {
    try {
      const response = await fetch(`/api/taxes/deadlines?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.deadlines || []).map(deadline => ({
          id: `tax-${deadline.id}`,
          title: `📋 ${deadline.title}`,
          start: deadline.dueDate,
          allDay: true,
          type: 'tax',
          color: EVENT_TYPES.tax.color,
          editable: false,
          className: 'tax-deadline'
        }));
      }
      return [];
    } catch (error) {
      console.error('[Calendar] Error fetching tax deadlines:', error);
      return [];
    }
  };

  // Fetch payroll dates
  const fetchPayrollDates = async (tenantId) => {
    try {
      const response = await fetch(`/api/payroll/schedule?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.payrollDates || []).map(payroll => ({
          id: `payroll-${payroll.id}`,
          title: `💰 Payroll Processing`,
          start: payroll.date,
          allDay: true,
          type: 'payroll',
          color: EVENT_TYPES.payroll.color,
          editable: false,
          className: 'payroll-event'
        }));
      }
      return [];
    } catch (error) {
      console.error('[Calendar] Error fetching payroll dates:', error);
      return [];
    }
  };

  // Fetch product expiry dates
  const fetchProductExpiries = async (tenantId) => {
    try {
      const response = await fetch(`/api/inventory/expiring-products?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.products || []).map(product => ({
          id: `expiry-${product.id}`,
          title: `⚠️ ${product.name} expires`,
          start: product.expiryDate,
          allDay: true,
          type: 'productExpiry',
          color: EVENT_TYPES.productExpiry.color,
          editable: false,
          className: 'expiry-event'
        }));
      }
      return [];
    } catch (error) {
      console.error('[Calendar] Error fetching product expiries:', error);
      return [];
    }
  };

  // Handle date click
  const handleDateClick = (arg) => {
    console.log('[Calendar] Date clicked:', arg.dateStr);
    setSelectedDate(arg.date);
    setSelectedEvent(null);
    
    // Format the date for datetime-local input
    // If allDay is true, just use the date, otherwise add time
    let startDateTime, endDateTime;
    
    if (arg.allDay) {
      // For all-day events, use just the date
      startDateTime = arg.dateStr;
      endDateTime = arg.dateStr;
    } else {
      // For timed events, add a default time (9 AM to 10 AM)
      const clickedDate = new Date(arg.date);
      clickedDate.setHours(9, 0, 0, 0);
      startDateTime = clickedDate.toISOString().slice(0, 16);
      
      const endDate = new Date(clickedDate);
      endDate.setHours(10, 0, 0, 0);
      endDateTime = endDate.toISOString().slice(0, 16);
    }
    
    setEventForm({
      title: '',
      type: 'appointment',
      start: startDateTime,
      end: endDateTime,
      allDay: arg.allDay || false,
      description: '',
      location: '',
      sendReminder: true,
      reminderMinutes: 30
    });
    setShowEventModal(true);
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    
    // Don't allow editing of system-generated events
    if (event.extendedProps.editable === false) {
      toast.info(`This is a system-generated event: ${event.title}`);
      return;
    }
    
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      type: event.extendedProps.type || 'appointment',
      start: event.startStr,
      end: event.endStr || event.startStr,
      allDay: event.allDay,
      description: event.extendedProps.description || '',
      location: event.extendedProps.location || '',
      sendReminder: event.extendedProps.sendReminder || false,
      reminderMinutes: event.extendedProps.reminderMinutes || 30
    });
    setShowEventModal(true);
  };

  // Save event
  const handleSaveEvent = async () => {
    console.log('[Calendar] handleSaveEvent called');
    console.log('[Calendar] Event form data:', eventForm);
    console.log('[Calendar] Tenant ID:', tenantId);
    console.log('[Calendar] Selected event:', selectedEvent);
    
    if (!eventForm.title) {
      console.error('[Calendar] No title provided');
      toast.error('Please enter a title for the event');
      return;
    }
    
    if (!tenantId) {
      console.error('[Calendar] No tenant ID available');
      toast.error('Unable to save event - no tenant ID');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const endpoint = selectedEvent 
        ? `/api/calendar/events/${selectedEvent.id}`
        : '/api/calendar/events';
      
      const method = selectedEvent ? 'PUT' : 'POST';
      
      console.log('[Calendar] Making request to:', endpoint);
      console.log('[Calendar] Method:', method);
      console.log('[Calendar] Request body:', {
        ...eventForm,
        tenantId
      });
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...eventForm,
          tenantId
        })
      });
      
      console.log('[Calendar] Response status:', response.status);
      console.log('[Calendar] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Calendar] Save successful, response data:', data);
        
        // COMPARISON DEBUG: Analyze the saved event structure
        console.log(`🎯 [Calendar] SAVED EVENT ANALYSIS:`, {
          id: data.id,
          title: data.title,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          start: data.start,
          end: data.end,
          allDay: data.allDay,
          all_day: data.all_day,
          type: data.type,
          event_type: data.event_type,
          backgroundColor: data.backgroundColor,
          borderColor: data.borderColor,
          savedEventKeys: Object.keys(data)
        });
        
        toast.success(selectedEvent ? 'Event updated!' : 'Event created!');
        
        // Close modal immediately
        console.log('[Calendar] Closing modal and resetting form');
        setShowEventModal(false);
        setEventForm({
          title: '',
          type: 'appointment',
          start: '',
          end: '',
          allDay: false,
          description: '',
          location: '',
          sendReminder: true,
          reminderMinutes: 30
        });
        
        // Reload events to show the new event
        console.log('[Calendar] Reloading events after successful save');
        await loadEvents(tenantId);
        console.log('[Calendar] Events reload completed after save');
        
        // Send reminder notification if requested
        if (eventForm.sendReminder) {
          console.log('[Calendar] Scheduling reminder');
          scheduleReminder(eventForm);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] Save error response:', errorData);
        console.error('[Calendar] Response status:', response.status);
        console.error('[Calendar] Response headers:', response.headers);
        throw new Error(errorData.error || `Failed to save event (${response.status})`);
      }
    } catch (error) {
      console.error('[Calendar] Error saving event:', error);
      console.error('[Calendar] Error stack:', error.stack);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}?tenantId=${tenantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Event deleted!');
        await loadEvents(tenantId);
        setShowEventModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] Delete error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('[Calendar] Error deleting event:', error);
      toast.error(error.message || 'Failed to delete event');
    }
  };

  // Schedule reminder (mock implementation)
  const scheduleReminder = (event) => {
    // In a real app, this would schedule a notification
    console.log(`Reminder scheduled for ${event.title} - ${event.reminderMinutes} minutes before`);
  };

  // Handle calendar debugging when calendarRef becomes available
  useEffect(() => {
    console.log('[Calendar] useEffect - Calendar ref and events state changed');
    console.log('[Calendar] calendarRef available:', !!calendarRef);
    console.log('[Calendar] events count:', events.length);
    console.log('[Calendar] events data:', events);
    
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      const calendarEvents = calendarApi.getEvents();
      console.log('[Calendar] Calendar API events count:', calendarEvents.length);
      
      if (calendarEvents.length > 0) {
        console.log('[Calendar] Calendar API events:', calendarEvents.map(e => ({
          id: e.id,
          title: e.title,
          start: e.startStr,
          end: e.endStr,
          allDay: e.allDay,
          display: e.display,
          backgroundColor: e.backgroundColor,
          borderColor: e.borderColor
        })));
        
        // Check if events fall within view range
        const view = calendarApi.view;
        calendarEvents.forEach((event, index) => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end || event.start);
          const viewStart = view.currentStart;
          const viewEnd = view.currentEnd;
          
          console.log(`[Calendar] Event ${index + 1} visibility check:`, {
            title: event.title,
            eventStart: eventStart.toISOString(),
            eventEnd: eventEnd.toISOString(),
            viewStart: viewStart.toISOString(),
            viewEnd: viewEnd.toISOString(),
            isInViewRange: eventStart >= viewStart && eventStart < viewEnd,
            isVisible: event.display !== 'none'
          });
        });
      }
      
      // Check current view
      const view = calendarApi.view;
      console.log('[Calendar] Current view:', view.type);
      console.log('[Calendar] View date range:', view.currentStart, 'to', view.currentEnd);
      
      // If we have events in state but not on calendar, investigate why
      if (events.length > 0 && calendarEvents.length === 0) {
        console.warn('[Calendar] Events exist in state but not visible on calendar!');
        console.log('[Calendar] First event in state:', events[0]);
        
        // Force re-render
        console.log('[Calendar] Forcing calendar re-render to show events');
        calendarApi.render();
        
        // Add a test event to verify calendar is working
        console.log('[Calendar] Adding test event to verify calendar functionality');
        const testEvent = {
          id: 'test-event-' + Date.now(),
          title: 'TEST EVENT - Today',
          start: new Date().toISOString().split('T')[0], // Today's date
          allDay: true,
          backgroundColor: '#FF0000',
          borderColor: '#FF0000'
        };
        console.log('[Calendar] Test event data:', testEvent);
        calendarApi.addEvent(testEvent);
        console.log('[Calendar] Test event added - should appear in red today');
      }
    }
  }, [calendarRef, events]);

  // Check for upcoming events and show toast notifications
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
      
      events.forEach(event => {
        const eventStart = new Date(event.start);
        if (eventStart > now && eventStart <= soon) {
          toast(`Upcoming: ${event.title}`, {
            icon: '⏰',
            duration: 5000
          });
        }
      });
    };
    
    // Check every 5 minutes
    const interval = setInterval(checkUpcomingEvents, 5 * 60000);
    checkUpcomingEvents(); // Check immediately
    
    return () => clearInterval(interval);
  }, [events]);

  if (sessionLoading || isLoading) {
    return <CenteredSpinner size="large" text="Loading calendar..." showText={true} />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">Manage appointments, deadlines, and reminders</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedEvent(null);
              setEventForm({
                title: '',
                type: 'appointment',
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                allDay: false,
                description: '',
                location: '',
                sendReminder: true,
                reminderMinutes: 30
              });
              setShowEventModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        {Object.entries(EVENT_TYPES).map(([key, config]) => (
          <div key={key} className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-2" 
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm text-gray-600">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <FullCalendar
          ref={setCalendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List'
          }}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={async (info) => {
            // Handle event drag and drop
            try {
              const response = await fetch(`/api/calendar/events/${info.event.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                  start: info.event.startStr,
                  end: info.event.endStr || info.event.startStr,
                  tenantId
                })
              });
              
              if (!response.ok) {
                info.revert();
                toast.error('Failed to update event');
              } else {
                toast.success('Event updated!');
              }
            } catch (error) {
              info.revert();
              toast.error('Failed to update event');
            }
          }}
          height="auto"
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'long' }
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            }
          }}
        />
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent ? 'Edit Event' : 'New Event'}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(EVENT_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type={eventForm.allDay ? "date" : "datetime-local"}
                    value={eventForm.start}
                    onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type={eventForm.allDay ? "date" : "datetime-local"}
                    value={eventForm.end}
                    onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.allDay}
                    onChange={(e) => {
                      const isAllDay = e.target.checked;
                      if (isAllDay) {
                        // Convert datetime to date only
                        const startDate = eventForm.start.split('T')[0];
                        const endDate = eventForm.end.split('T')[0];
                        setEventForm({ 
                          ...eventForm, 
                          allDay: isAllDay,
                          start: startDate,
                          end: endDate
                        });
                      } else {
                        // Convert date to datetime (9 AM default)
                        const startDateTime = eventForm.start.includes('T') 
                          ? eventForm.start 
                          : `${eventForm.start}T09:00`;
                        const endDateTime = eventForm.end.includes('T') 
                          ? eventForm.end 
                          : `${eventForm.end}T10:00`;
                        setEventForm({ 
                          ...eventForm, 
                          allDay: isAllDay,
                          start: startDateTime,
                          end: endDateTime
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">All day event</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event description"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.sendReminder}
                    onChange={(e) => setEventForm({ ...eventForm, sendReminder: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Send reminder</span>
                </label>
                {eventForm.sendReminder && (
                  <div className="mt-2 ml-6">
                    <label className="block text-xs text-gray-600 mb-1">
                      Minutes before
                    </label>
                    <select
                      value={eventForm.reminderMinutes}
                      onChange={(e) => setEventForm({ ...eventForm, reminderMinutes: parseInt(e.target.value) })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={1440}>1 day</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <div>
                {selectedEvent && (
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('[Calendar] Save button clicked');
                    handleSaveEvent();
                  }}
                  disabled={isSaving}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    isSaving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isSaving ? (
                    <>
                      <StandardSpinner size="small" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}