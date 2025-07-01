// Shared in-memory storage for calendar events
// TEMPORARY: Until backend calendar API is implemented

// Use a Map for better persistence in serverless environments
// Note: This will still reset on server restart/redeploy
const calendarEventsMap = new Map();

// Initialize with a marker to track persistence
if (!global.__calendarStorageInitialized) {
  global.__calendarStorage = new Map();
  global.__calendarStorageInitialized = true;
  console.log('[Calendar Storage] Initialized global storage');
}

// Use the global storage
const storage = global.__calendarStorage;

// Export storage functions
export const getCalendarEvents = () => {
  const allEvents = [];
  for (const [, events] of storage.entries()) {
    allEvents.push(...events);
  }
  return allEvents;
};

export const addCalendarEvent = (event) => {
  const tenantId = event.tenant_id;
  if (!storage.has(tenantId)) {
    storage.set(tenantId, []);
  }
  const tenantEvents = storage.get(tenantId);
  tenantEvents.push(event);
  console.log(`[Calendar Storage] Added event ${event.id} for tenant ${tenantId}. Total events for tenant: ${tenantEvents.length}`);
  return event;
};

export const updateCalendarEvent = (id, tenantId, updatedData) => {
  if (!storage.has(tenantId)) return null;
  
  const tenantEvents = storage.get(tenantId);
  const eventIndex = tenantEvents.findIndex(event => event.id === id);
  if (eventIndex === -1) return null;
  
  const updatedEvent = {
    ...tenantEvents[eventIndex],
    ...updatedData,
    updated_at: new Date().toISOString()
  };
  
  tenantEvents[eventIndex] = updatedEvent;
  console.log(`[Calendar Storage] Updated event ${id} for tenant ${tenantId}`);
  return updatedEvent;
};

export const deleteCalendarEvent = (id, tenantId) => {
  if (!storage.has(tenantId)) return false;
  
  const tenantEvents = storage.get(tenantId);
  const eventIndex = tenantEvents.findIndex(event => event.id === id);
  if (eventIndex === -1) return false;
  
  tenantEvents.splice(eventIndex, 1);
  console.log(`[Calendar Storage] Deleted event ${id} for tenant ${tenantId}. Remaining events: ${tenantEvents.length}`);
  return true;
};

export const findCalendarEvent = (id, tenantId) => {
  if (!storage.has(tenantId)) return null;
  const tenantEvents = storage.get(tenantId);
  return tenantEvents.find(event => event.id === id);
};

export const getEventsByTenant = (tenantId) => {
  const events = storage.get(tenantId) || [];
  console.log(`[Calendar Storage] Retrieved ${events.length} events for tenant ${tenantId}`);
  return events;
};

export const getTotalEventCount = () => {
  let total = 0;
  for (const [, events] of storage.entries()) {
    total += events.length;
  }
  return total;
};

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