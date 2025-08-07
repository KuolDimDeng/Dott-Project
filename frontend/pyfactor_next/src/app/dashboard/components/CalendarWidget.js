'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function CalendarWidget({ onNavigate }) {
  const { t } = useTranslation('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Fetch calendar events - REAL DATA ONLY
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        
        // Get the last day of current month for end date
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          const response = await fetch(`/api/calendar/events?start=${startDate}&end=${endDate}`, {
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[CalendarWidget] Events API Response:', data);
            
            // Handle different response formats - use real data only
            const eventsList = data.events || data.results || data.data || [];
            
            if (Array.isArray(eventsList) && eventsList.length > 0) {
              // Format real events for display
              const formattedEvents = eventsList.map(event => ({
                id: event.id,
                title: event.title || event.name || event.subject || 'Untitled Event',
                time: event.start_time || event.time || event.start || 'All Day',
                date: event.date || event.start_date || event.start,
                type: event.type || event.eventType || 'general',
                description: event.description || ''
              }));
              
              // Filter for today's events
              const todayEvents = formattedEvents.filter(event => {
                if (!event.date) return false;
                const eventDate = new Date(event.date).toDateString();
                return eventDate === today.toDateString();
              });
              
              setEvents(todayEvents);
            } else {
              // No events - keep empty array (don't use mock data)
              console.log('[CalendarWidget] No events found in database');
              setEvents([]);
            }
          } else if (response.status === 401) {
            console.log('[CalendarWidget] Authentication required for calendar events');
            setEvents([]);
          } else if (response.status === 404) {
            console.log('[CalendarWidget] Calendar API endpoint not found');
            setEvents([]);
          } else {
            console.log('[CalendarWidget] Failed to fetch events:', response.status);
            setEvents([]);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.log('[CalendarWidget] Request timed out after 8 seconds');
          } else {
            console.error('[CalendarWidget] Network error fetching events:', fetchError);
          }
          setEvents([]);
        }
      } catch (error) {
        console.error('[CalendarWidget] Error in fetchEvents:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Add debouncing to prevent excessive requests
    const timeoutId = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timeoutId);
  }, [currentDate]);
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const handleCalendarClick = () => {
    console.log('[CalendarWidget] Navigating to calendar');
    // Dispatch a custom event for navigation
    const event = new CustomEvent('menuNavigation', {
      detail: { item: 'calendar' }
    });
    window.dispatchEvent(event);
    
    // Also try the onNavigate prop if available
    if (onNavigate) {
      onNavigate('calendar');
    }
  };
  
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === today.getDate() && 
        currentDate.getMonth() === today.getMonth() && 
        currentDate.getFullYear() === today.getFullYear();
      
      // Check if this day has events
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasEvents = events.some(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === dayDate.toDateString();
      });
      
      days.push(
        <div
          key={day}
          className={`h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors relative
            ${isToday 
              ? 'bg-blue-600 text-white font-semibold' 
              : 'hover:bg-gray-100 text-gray-700'
            }`}
          onClick={handleCalendarClick}
        >
          {day}
          {hasEvents && !isToday && (
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></span>
          )}
        </div>
      );
    }
    
    return days;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Calendar
          </h2>
          <button
            onClick={handleCalendarClick}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            View Full Calendar
            <CalendarIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Today's Events</h4>
            <button
              onClick={handleCalendarClick}
              className="text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={handleCalendarClick}
                >
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500">{event.time}</p>
                </div>
              ))}
              {events.length > 3 && (
                <button
                  onClick={handleCalendarClick}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  +{events.length - 3} more events
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No events scheduled</p>
              <button
                onClick={handleCalendarClick}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add an event
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarWidget;