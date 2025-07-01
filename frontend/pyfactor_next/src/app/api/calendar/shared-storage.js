// Shared in-memory storage for calendar events
// TEMPORARY: Until backend calendar API is implemented

// Global in-memory storage array
let calendarEvents = [];

// Export storage functions
export const getCalendarEvents = () => calendarEvents;

export const addCalendarEvent = (event) => {
  calendarEvents.push(event);
  return event;
};

export const updateCalendarEvent = (id, tenantId, updatedData) => {
  const eventIndex = calendarEvents.findIndex(event => event.id === id && event.tenant_id === tenantId);
  if (eventIndex === -1) return null;
  
  const updatedEvent = {
    ...calendarEvents[eventIndex],
    ...updatedData,
    updated_at: new Date().toISOString()
  };
  
  calendarEvents[eventIndex] = updatedEvent;
  return updatedEvent;
};

export const deleteCalendarEvent = (id, tenantId) => {
  const eventIndex = calendarEvents.findIndex(event => event.id === id && event.tenant_id === tenantId);
  if (eventIndex === -1) return false;
  
  calendarEvents.splice(eventIndex, 1);
  return true;
};

export const findCalendarEvent = (id, tenantId) => {
  return calendarEvents.find(event => event.id === id && event.tenant_id === tenantId);
};

export const getEventsByTenant = (tenantId) => {
  return calendarEvents.filter(event => event.tenant_id === tenantId);
};

export const getTotalEventCount = () => calendarEvents.length;

// Helper function to get event color based on type
export function getEventColor(eventType) {
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