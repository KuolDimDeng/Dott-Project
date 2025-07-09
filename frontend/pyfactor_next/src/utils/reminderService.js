// Calendar Reminder Service
// Manages scheduling and displaying reminders for calendar events

// Note: We'll need to pass the toast function from the component since this is a utility class

class ReminderService {
  constructor() {
    this.reminders = new Map(); // Store active reminders
    this.checkInterval = null;
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.toastFunction = null; // Will be set by the component
  }

  // Initialize the reminder service with toast function
  init(toastFunction = null) {
    // Store the toast function
    if (toastFunction) {
      this.toastFunction = toastFunction;
    }
    
    // Load existing reminders from localStorage
    this.loadReminders();
    
    // Start checking for reminders every minute
    this.startChecking();
    
    // Clean up old reminders on init
    this.cleanupOldReminders();
  }

  // Update timezone (call this when user's timezone changes)
  setTimezone(timezone) {
    this.userTimezone = timezone;
  }

  // Schedule a reminder for an event
  scheduleReminder(event) {
    if (!event.sendReminder || !event.reminderMinutes || event.reminderMinutes <= 0) {
      return;
    }

    const reminderTime = this.calculateReminderTime(event.start, event.reminderMinutes);
    
    const reminder = {
      id: `reminder_${event.id}`,
      eventId: event.id,
      eventTitle: event.title,
      eventType: event.type || 'appointment',
      eventStart: event.start,
      reminderTime: reminderTime,
      reminderMinutes: event.reminderMinutes,
      shown: false
    };

    // Store in memory
    this.reminders.set(reminder.id, reminder);
    
    // Persist to localStorage
    this.saveReminders();
    
    console.log(`[ReminderService] Scheduled reminder for "${event.title}" at ${new Date(reminderTime).toLocaleString('en-US', { timeZone: this.userTimezone })}`);
  }

  // Calculate when to show the reminder
  calculateReminderTime(eventStart, minutesBefore) {
    const startTime = new Date(eventStart).getTime();
    const reminderTime = startTime - (minutesBefore * 60 * 1000);
    return reminderTime;
  }

  // Check if any reminders need to be shown
  checkReminders() {
    const now = Date.now();
    
    this.reminders.forEach((reminder, id) => {
      // Skip if already shown
      if (reminder.shown) return;
      
      // Check if it's time to show the reminder
      if (now >= reminder.reminderTime && now < new Date(reminder.eventStart).getTime()) {
        this.showReminder(reminder);
        reminder.shown = true;
        this.saveReminders();
      }
    });
  }

  // Display a reminder notification
  showReminder(reminder) {
    const eventTime = new Date(reminder.eventStart).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: this.userTimezone
    });
    
    const eventTypeLabel = this.getEventTypeLabel(reminder.eventType);
    const message = `🔔 ${eventTypeLabel}: ${reminder.eventTitle} at ${eventTime}`;
    
    console.log(`[ReminderService] Showing reminder: ${message}`);
    console.log('[ReminderService] Toast function available:', !!this.toastFunction);
    
    // Show toast notification using the custom toast system
    if (this.toastFunction && this.toastFunction.info) {
      this.toastFunction.info(message, 8000);
      console.log('[ReminderService] Toast notification sent');
    } else {
      console.error('[ReminderService] Toast function not available - reminder cannot be displayed');
      // Fallback to alert if toast not available
      alert(message);
    }

    // Also show browser notification if permission granted
    this.showBrowserNotification(reminder);
  }

  // Get friendly label for event type
  getEventTypeLabel(type) {
    const labels = {
      appointment: 'Calendar Alert',
      meeting: 'Meeting',
      task: 'Task Due',
      reminder: 'Reminder',
      birthday: 'Birthday',
      tax: 'Tax Deadline',
      payroll: 'Payroll',
      productExpiry: 'Product Expiry',
      delivery: 'Delivery'
    };
    
    return labels[type] || 'Calendar Alert';
  }

  // Show browser notification if permitted
  async showBrowserNotification(reminder) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const eventTime = new Date(reminder.eventStart).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: this.userTimezone
      });
      
      new Notification(`${this.getEventTypeLabel(reminder.eventType)}`, {
        body: `${reminder.eventTitle} at ${eventTime}`,
        icon: '/logo192.png', // Add your app icon
        tag: reminder.id,
        requireInteraction: false
      });
    }
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return Notification.permission === 'granted';
  }

  // Update a reminder (e.g., if event is edited)
  updateReminder(event) {
    const reminderId = `reminder_${event.id}`;
    
    // Remove old reminder
    this.cancelReminder(event.id);
    
    // Schedule new one if needed
    if (event.sendReminder && event.reminderMinutes > 0) {
      this.scheduleReminder(event);
    }
  }

  // Cancel a reminder
  cancelReminder(eventId) {
    const reminderId = `reminder_${eventId}`;
    this.reminders.delete(reminderId);
    this.saveReminders();
    console.log(`[ReminderService] Cancelled reminder for event ${eventId}`);
  }

  // Start the reminder checking interval
  startChecking() {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkReminders();
      this.cleanupOldReminders();
    }, 30000);
    
    // Wait a bit before first check to ensure React is fully mounted
    setTimeout(() => {
      console.log('[ReminderService] Initial reminder check');
      this.checkReminders();
    }, 2000);
  }

  // Stop the reminder checking interval
  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Clean up old reminders that have passed
  cleanupOldReminders() {
    const now = Date.now();
    const cutoffTime = now - (24 * 60 * 60 * 1000); // 24 hours ago
    
    let cleaned = 0;
    this.reminders.forEach((reminder, id) => {
      const eventTime = new Date(reminder.eventStart).getTime();
      if (eventTime < cutoffTime) {
        this.reminders.delete(id);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.saveReminders();
      console.log(`[ReminderService] Cleaned up ${cleaned} old reminders`);
    }
  }

  // Save reminders to localStorage
  saveReminders() {
    try {
      const remindersArray = Array.from(this.reminders.values());
      localStorage.setItem('calendarReminders', JSON.stringify(remindersArray));
    } catch (error) {
      console.error('[ReminderService] Error saving reminders:', error);
    }
  }

  // Load reminders from localStorage
  loadReminders() {
    try {
      const stored = localStorage.getItem('calendarReminders');
      if (stored) {
        const remindersArray = JSON.parse(stored);
        remindersArray.forEach(reminder => {
          this.reminders.set(reminder.id, reminder);
        });
        console.log(`[ReminderService] Loaded ${remindersArray.length} reminders from storage`);
      }
    } catch (error) {
      console.error('[ReminderService] Error loading reminders:', error);
    }
  }

  // Clear all reminders
  clearAllReminders() {
    this.reminders.clear();
    localStorage.removeItem('calendarReminders');
    console.log('[ReminderService] Cleared all reminders');
  }

  // Get active reminders count
  getActiveRemindersCount() {
    const now = Date.now();
    let count = 0;
    
    this.reminders.forEach(reminder => {
      if (!reminder.shown && reminder.reminderTime > now) {
        count++;
      }
    });
    
    return count;
  }
}

// Create singleton instance
const reminderService = new ReminderService();

export default reminderService;