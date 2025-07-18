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
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import reminderService from '@/utils/reminderService';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslation } from 'react-i18next';

// Event type configurations
const getEventTypes = (t) => ({
  appointment: { color: '#3B82F6', icon: ClockIcon, label: t('eventTypes.appointment') },
  tax: { color: '#DC2626', icon: DocumentTextIcon, label: t('eventTypes.tax') },
  payroll: { color: '#10B981', icon: CurrencyDollarIcon, label: t('eventTypes.payroll') },
  birthday: { color: '#F59E0B', icon: CakeIcon, label: t('eventTypes.birthday') },
  productExpiry: { color: '#EF4444', icon: ExclamationCircleIcon, label: t('eventTypes.productExpiry') },
  delivery: { color: '#8B5CF6', icon: TruckIcon, label: t('eventTypes.delivery') },
  meeting: { color: '#6366F1', icon: BuildingOfficeIcon, label: t('eventTypes.meeting') },
  reminder: { color: '#14B8A6', icon: BellIcon, label: t('eventTypes.reminder') }
});

// Common timezones grouped by region
const getTimezoneOptions = (t) => [
  { group: t('timezoneGroups.usCanada'), zones: [
    { value: 'America/New_York', label: t('timezoneLabels.americaNewYork') },
    { value: 'America/Chicago', label: t('timezoneLabels.americaChicago') },
    { value: 'America/Denver', label: t('timezoneLabels.americaDenver') },
    { value: 'America/Phoenix', label: t('timezoneLabels.americaPhoenix') },
    { value: 'America/Los_Angeles', label: t('timezoneLabels.americaLosAngeles') },
    { value: 'America/Anchorage', label: t('timezoneLabels.americaAnchorage') },
    { value: 'Pacific/Honolulu', label: t('timezoneLabels.pacificHonolulu') }
  ]},
  { group: t('timezoneGroups.europe'), zones: [
    { value: 'Europe/London', label: t('timezoneLabels.europeLondon') },
    { value: 'Europe/Paris', label: t('timezoneLabels.europeParis') },
    { value: 'Europe/Berlin', label: t('timezoneLabels.europeBerlin') },
    { value: 'Europe/Moscow', label: t('timezoneLabels.europeMoscow') }
  ]},
  { group: t('timezoneGroups.asia'), zones: [
    { value: 'Asia/Tokyo', label: t('timezoneLabels.asiaTokyo') },
    { value: 'Asia/Shanghai', label: t('timezoneLabels.asiaShanghai') },
    { value: 'Asia/Kolkata', label: t('timezoneLabels.asiaKolkata') },
    { value: 'Asia/Dubai', label: t('timezoneLabels.asiaDubai') }
  ]},
  { group: t('timezoneGroups.africa'), zones: [
    { value: 'Africa/Nairobi', label: t('timezoneLabels.africaNairobi') },
    { value: 'Africa/Lagos', label: t('timezoneLabels.africaLagos') },
    { value: 'Africa/Johannesburg', label: t('timezoneLabels.africaJohannesburg') }
  ]},
  { group: t('timezoneGroups.australiaPacific'), zones: [
    { value: 'Australia/Sydney', label: t('timezoneLabels.australiaSydney') },
    { value: 'Australia/Perth', label: t('timezoneLabels.australiaPerth') },
    { value: 'Pacific/Auckland', label: t('timezoneLabels.pacificAuckland') }
  ]}
];

// Helper function to format datetime for display with timezone
const formatDateTimeWithTimezone = (dateStr, timezone) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

// Helper function to get friendly timezone display name
const getTimezoneDisplayName = (timezone) => {
  const friendlyNames = {
    'America/New_York': 'Eastern Time',
    'America/Chicago': 'Central Time', 
    'America/Denver': 'Mountain Time',
    'America/Phoenix': 'Arizona Time',
    'America/Los_Angeles': 'Pacific Time',
    'America/Anchorage': 'Alaska Time',
    'Pacific/Honolulu': 'Hawaii Time',
    'Europe/London': 'Greenwich Mean Time',
    'Europe/Paris': 'Central European Time',
    'Asia/Tokyo': 'Japan Standard Time',
    'Asia/Shanghai': 'China Standard Time',
    'Asia/Kolkata': 'India Standard Time',
    'Australia/Sydney': 'Australian Eastern Time',
    'UTC': 'Coordinated Universal Time'
  };
  
  const friendlyName = friendlyNames[timezone];
  if (friendlyName) {
    return `${friendlyName} (${timezone})`;
  }
  
  // Fallback: convert underscores to spaces
  return timezone.replace(/_/g, ' ');
};

export default function Calendar({ onNavigate }) {
  console.log('[Calendar] COMPONENT LOADED - DEBUG VERSION 2025-07-09-v2');
  const { user, loading: sessionLoading } = useSession();
  const toast = useToast();
  const { t } = useTranslation('calendar');
  
  // Get translated configurations
  const EVENT_TYPES = getEventTypes(t);
  const TIMEZONE_OPTIONS = getTimezoneOptions(t);
  
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [calendarRef, setCalendarRef] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Form state for new/edit event
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'appointment',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    start: '', // Combined datetime for backend
    end: '', // Combined datetime for backend
    allDay: false,
    description: '',
    location: '',
    sendReminder: true,
    reminderMinutes: 30,
    timezone: userTimezone
  });

  // Initialize and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          
          // Initialize reminder service with toast function
          reminderService.init(toast);
          console.log('[Calendar] Reminder service initialized with toast');
          
          // Request notification permission if not already granted
          if ('Notification' in window && Notification.permission === 'default') {
            const permission = await reminderService.requestNotificationPermission();
            if (permission) {
              console.log('[Calendar] Notification permission granted');
            }
          }
          
          // Load user's timezone from backend
          await loadUserTimezone();
          
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
    
    // Cleanup on unmount
    return () => {
      reminderService.stopChecking();
    };
  }, [sessionLoading]);

  // Load user's timezone from backend
  const loadUserTimezone = async () => {
    try {
      const response = await fetch('/api/user/timezone', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const savedTimezone = data.timezone;
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // If user has no timezone saved (existing user), auto-detect and save it
        if (!savedTimezone || savedTimezone === 'UTC') {
          console.log('[Calendar] No timezone saved, auto-detecting and saving:', detectedTimezone);
          
          // Save detected timezone to backend
          await fetch('/api/user/timezone', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              timezone: detectedTimezone
            })
          });
          
          setUserTimezone(detectedTimezone);
          reminderService.setTimezone(detectedTimezone);
          console.log('[Calendar] Auto-detected timezone saved:', detectedTimezone);
        } else {
          setUserTimezone(savedTimezone);
          reminderService.setTimezone(savedTimezone);
          console.log('[Calendar] User timezone loaded:', savedTimezone);
        }
        
        // Update form default timezone
        setEventForm(prev => ({
          ...prev,
          timezone: savedTimezone || detectedTimezone
        }));
      }
    } catch (error) {
      console.error('[Calendar] Error loading timezone:', error);
      // Keep using auto-detected timezone as fallback
    }
  };

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
      console.log('🎯🎯🎯 [Calendar] ABOUT TO CALL API ENDPOINT: /api/calendar/events');
      const response = await fetch(`/api/calendar/events?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      console.log('[Calendar] Calendar events response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Calendar] Calendar events data:', data);
        
        // Check if we got an error response
        if (data.error) {
          console.error('[Calendar] ❌ API returned error:', data);
          toast.error(`Failed to load events: ${data.error}`);
          return [];
        }
        
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
          
          // Schedule reminder for this event if it has reminder settings and is in the future
          if (event.sendReminder && event.reminderMinutes && new Date(event.start) > new Date()) {
            reminderService.scheduleReminder({
              id: event.id,
              title: event.title,
              start: event.start,
              type: event.type,
              sendReminder: event.sendReminder,
              reminderMinutes: event.reminderMinutes
            });
          }
          
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
    
    // Set default date as the clicked date
    const clickedDateStr = arg.dateStr;
    
    setEventForm({
      title: '',
      type: 'appointment',
      startDate: clickedDateStr,
      startTime: '09:00',
      endDate: clickedDateStr,
      endTime: '10:00',
      start: '', // Will be combined on save
      end: '', // Will be combined on save
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
    
    // Split datetime into date and time components
    let startDate, startTime, endDate, endTime;
    
    if (event.allDay) {
      // For all-day events, just use the date
      startDate = event.startStr.split('T')[0];
      endDate = event.endStr ? event.endStr.split('T')[0] : startDate;
      startTime = '09:00';
      endTime = '10:00';
    } else {
      // For timed events, split the datetime
      if (event.startStr.includes('T')) {
        const [sDate, sTimeWithTZ] = event.startStr.split('T');
        startDate = sDate;
        startTime = sTimeWithTZ.substring(0, 5); // Get HH:MM
      } else {
        startDate = event.startStr;
        startTime = '09:00';
      }
      
      if (event.endStr && event.endStr.includes('T')) {
        const [eDate, eTimeWithTZ] = event.endStr.split('T');
        endDate = eDate;
        endTime = eTimeWithTZ.substring(0, 5); // Get HH:MM
      } else {
        endDate = event.endStr || startDate;
        endTime = '10:00';
      }
    }
    
    setEventForm({
      title: event.title,
      type: event.extendedProps.type || 'appointment',
      startDate,
      startTime,
      endDate,
      endTime,
      start: event.startStr, // Keep original for reference
      end: event.endStr || event.startStr, // Keep original for reference
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
    
    if (!eventForm.startDate || !eventForm.endDate) {
      console.error('[Calendar] Missing date fields');
      toast.error('Please select start and end dates');
      return;
    }
    
    if (!tenantId) {
      console.error('[Calendar] No tenant ID available');
      toast.error('Unable to save event - no tenant ID');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Combine date and time fields for backend
      let startDateTime, endDateTime;
      
      if (eventForm.allDay) {
        // For all-day events, just use the date
        startDateTime = eventForm.startDate;
        endDateTime = eventForm.endDate;
      } else {
        // For timed events, combine date and time
        startDateTime = `${eventForm.startDate}T${eventForm.startTime}`;
        endDateTime = `${eventForm.endDate}T${eventForm.endTime}`;
      }
      
      const endpoint = selectedEvent 
        ? `/api/calendar/events/${selectedEvent.id}`
        : '/api/calendar/events';
      
      const method = selectedEvent ? 'PUT' : 'POST';
      
      const requestBody = {
        title: eventForm.title,
        type: eventForm.type,
        start: startDateTime,
        end: endDateTime,
        allDay: eventForm.allDay,
        description: eventForm.description,
        location: eventForm.location,
        sendReminder: eventForm.sendReminder,
        reminderMinutes: eventForm.reminderMinutes,
        tenantId
      };
      
      console.log('[Calendar] Making request to:', endpoint);
      console.log('[Calendar] Method:', method);
      console.log('[Calendar] Request body:', requestBody);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
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
          startDate: '',
          startTime: '09:00',
          endDate: '',
          endTime: '10:00',
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
        
        // Handle reminders
        if (selectedEvent) {
          // Update reminder for edited event
          console.log('[Calendar] Updating reminder for edited event');
          reminderService.updateReminder({
            id: data.id,
            title: eventForm.title,
            start: startDateTime, // Use the combined datetime we created for backend
            type: eventForm.type,
            sendReminder: eventForm.sendReminder,
            reminderMinutes: eventForm.reminderMinutes
          });
        } else if (eventForm.sendReminder && eventForm.reminderMinutes > 0) {
          // Schedule reminder for new event
          console.log('[Calendar] Scheduling reminder for new event');
          reminderService.scheduleReminder({
            id: data.id,
            title: eventForm.title,
            start: startDateTime, // Use the combined datetime we created for backend
            type: eventForm.type,
            sendReminder: eventForm.sendReminder,
            reminderMinutes: eventForm.reminderMinutes
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] ❌ Save failed with status:', response.status);
        console.error('[Calendar] ❌ Error details:', errorData);
        console.error('[Calendar] ❌ Backend URL:', errorData.backendUrl);
        console.error('[Calendar] ❌ Full error object:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
          backendUrl: errorData.backendUrl
        });
        
        // Show detailed error to user
        const errorMessage = errorData.details || errorData.error || `Failed to save event (${response.status})`;
        alert(`Failed to save event:\n\n${errorMessage}\n\nBackend URL: ${errorData.backendUrl || 'Unknown'}`);
        
        throw new Error(errorMessage);
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
        // Cancel reminder for deleted event
        reminderService.cancelReminder(selectedEvent.id);
        console.log('[Calendar] Cancelled reminder for deleted event');
        
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


  if (sessionLoading || isLoading) {
    return <CenteredSpinner size="large" text={t('loadingCalendar')} showText={true} />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-gray-600">
                {t('subtitle')}
                <span className="ml-2 text-sm text-gray-500">
                  • {t('timezoneNote')} {getTimezoneDisplayName(userTimezone)}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedEvent(null);
              const today = new Date().toISOString().split('T')[0];
              setEventForm({
                title: '',
                type: 'appointment',
                startDate: today,
                startTime: '09:00',
                endDate: today,
                endTime: '10:00',
                start: '',
                end: '',
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
            {t('addEvent')}
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
          timeZone={userTimezone}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          buttonText={{
            today: t('buttons.today'),
            month: t('buttons.month'),
            week: t('buttons.week'),
            day: t('buttons.day'),
            list: t('buttons.list')
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
                {selectedEvent ? t('editEvent') : t('newEvent')}
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

              <div className="space-y-4">
                {/* Date Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Time Fields - Only show if not all day */}
                {!eventForm.allDay && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={eventForm.startTime}
                          onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={eventForm.endTime}
                          onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Times are in {getTimezoneDisplayName(userTimezone)}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.allDay}
                    onChange={(e) => {
                      const isAllDay = e.target.checked;
                      setEventForm({ 
                        ...eventForm, 
                        allDay: isAllDay
                      });
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
                    {t('buttons.delete')}
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  {t('buttons.cancel')}
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
                      {t('buttons.save')}
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