import { Platform, Alert, Linking } from 'react-native';
import * as Calendar from 'expo-calendar';
import moment from 'moment';

/**
 * Calendar integration service for scheduled appointments
 * Supports iOS Calendar, Google Calendar, and other calendar apps
 */

class CalendarService {
  constructor() {
    this.calendarId = null;
    this.hasPermission = false;
  }

  /**
   * Request calendar permissions
   */
  async requestPermissions() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get or create app calendar
   */
  async getOrCreateCalendar() {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Calendar permission is required to save appointments',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return null;
      }
    }

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      // Look for existing app calendar
      const appCalendar = calendars.find(cal => cal.title === 'Dott Business');
      
      if (appCalendar) {
        this.calendarId = appCalendar.id;
        return appCalendar.id;
      }

      // Create new calendar
      const defaultCalendarSource = Platform.select({
        ios: calendars.find(cal => cal.source.name === 'iCloud')?.source ||
              calendars[0]?.source,
        android: { isLocalAccount: true, name: 'Dott Business' },
      });

      if (!defaultCalendarSource) {
        throw new Error('No calendar source available');
      }

      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'Dott Business',
        color: '#2563eb',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendarSource.id,
        source: defaultCalendarSource,
        name: 'Dott Business',
        ownerAccount: 'Dott Business App',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      this.calendarId = newCalendarId;
      return newCalendarId;
    } catch (error) {
      console.error('Error creating calendar:', error);
      return null;
    }
  }

  /**
   * Add appointment to calendar
   */
  async addAppointment(appointment) {
    const {
      title,
      customerName,
      service,
      startTime,
      endTime,
      location,
      notes,
      price,
      phoneNumber,
    } = appointment;

    const calendarId = await this.getOrCreateCalendar();
    if (!calendarId) return null;

    try {
      const eventDetails = {
        calendarId,
        title: title || `${service} - ${customerName}`,
        startDate: new Date(startTime),
        endDate: new Date(endTime || moment(startTime).add(1, 'hour').toISOString()),
        location: location?.address || '',
        notes: this.formatNotes(appointment),
        alarms: [
          { relativeOffset: -60 }, // 1 hour before
          { relativeOffset: -15 }, // 15 minutes before
        ],
        timeZone: Calendar.getTimeZoneAsync ? await Calendar.getTimeZoneAsync() : 'GMT',
      };

      const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
      return eventId;
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Could not add appointment to calendar');
      return null;
    }
  }

  /**
   * Update existing appointment
   */
  async updateAppointment(eventId, updates) {
    if (!this.hasPermission) {
      await this.requestPermissions();
    }

    try {
      const eventUpdates = {};
      
      if (updates.title) eventUpdates.title = updates.title;
      if (updates.startTime) eventUpdates.startDate = new Date(updates.startTime);
      if (updates.endTime) eventUpdates.endDate = new Date(updates.endTime);
      if (updates.location) eventUpdates.location = updates.location.address;
      if (updates.notes) eventUpdates.notes = this.formatNotes(updates);

      await Calendar.updateEventAsync(eventId, eventUpdates);
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      return false;
    }
  }

  /**
   * Delete appointment from calendar
   */
  async deleteAppointment(eventId) {
    if (!this.hasPermission) {
      await this.requestPermissions();
    }

    try {
      await Calendar.deleteEventAsync(eventId);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  /**
   * Get appointments for a date range
   */
  async getAppointments(startDate, endDate) {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) return [];
    }

    try {
      const calendarId = await this.getOrCreateCalendar();
      if (!calendarId) return [];

      const events = await Calendar.getEventsAsync(
        [calendarId],
        new Date(startDate),
        new Date(endDate)
      );

      return events.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startDate,
        endTime: event.endDate,
        location: event.location,
        notes: event.notes,
      }));
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  /**
   * Format notes for calendar event
   */
  formatNotes(appointment) {
    const {
      service,
      customerName,
      phoneNumber,
      price,
      notes,
      paymentStatus,
    } = appointment;

    let formattedNotes = '';
    
    if (service) formattedNotes += `Service: ${service}\n`;
    if (customerName) formattedNotes += `Customer: ${customerName}\n`;
    if (phoneNumber) formattedNotes += `Phone: ${phoneNumber}\n`;
    if (price) formattedNotes += `Price: $${price}\n`;
    if (paymentStatus) formattedNotes += `Payment: ${paymentStatus}\n`;
    if (notes) formattedNotes += `\nNotes: ${notes}`;

    return formattedNotes.trim();
  }

  /**
   * Create recurring appointment
   */
  async createRecurringAppointment(appointment, recurrence) {
    const {
      frequency, // 'daily', 'weekly', 'monthly'
      interval, // 1, 2, 3, etc.
      endDate,
      daysOfWeek, // for weekly: [1, 3, 5] (Mon, Wed, Fri)
    } = recurrence;

    const calendarId = await this.getOrCreateCalendar();
    if (!calendarId) return null;

    try {
      const recurrenceRule = {
        frequency: frequency.toUpperCase(),
        interval: interval || 1,
      };

      if (endDate) {
        recurrenceRule.endDate = new Date(endDate);
      }

      if (frequency === 'weekly' && daysOfWeek) {
        recurrenceRule.daysOfWeek = daysOfWeek;
      }

      const eventDetails = {
        calendarId,
        title: appointment.title || `${appointment.service} - ${appointment.customerName}`,
        startDate: new Date(appointment.startTime),
        endDate: new Date(appointment.endTime),
        location: appointment.location?.address || '',
        notes: this.formatNotes(appointment),
        recurrenceRule,
        alarms: [
          { relativeOffset: -60 },
          { relativeOffset: -15 },
        ],
      };

      const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
      return eventId;
    } catch (error) {
      console.error('Error creating recurring event:', error);
      Alert.alert('Error', 'Could not create recurring appointment');
      return null;
    }
  }

  /**
   * Open native calendar app
   */
  openCalendarApp(date = null) {
    const url = Platform.select({
      ios: date ? `calshow:${Math.floor(date.getTime() / 1000)}` : 'calshow:',
      android: 'content://com.android.calendar/time/',
    });

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Could not open calendar app');
        }
      })
      .catch(error => {
        console.error('Error opening calendar:', error);
      });
  }

  /**
   * Check for appointment conflicts
   */
  async checkConflicts(startTime, endTime) {
    const appointments = await this.getAppointments(startTime, endTime);
    
    const conflicts = appointments.filter(apt => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);
      
      return (
        (newStart >= aptStart && newStart < aptEnd) ||
        (newEnd > aptStart && newEnd <= aptEnd) ||
        (newStart <= aptStart && newEnd >= aptEnd)
      );
    });

    return conflicts;
  }

  /**
   * Export calendar events
   */
  async exportEvents(startDate, endDate, format = 'ics') {
    const events = await this.getAppointments(startDate, endDate);
    
    if (format === 'ics') {
      return this.generateICS(events);
    }
    
    return events;
  }

  /**
   * Generate ICS file content
   */
  generateICS(events) {
    let icsContent = 'BEGIN:VCALENDAR\n';
    icsContent += 'VERSION:2.0\n';
    icsContent += 'PRODID:-//Dott Business//EN\n';
    
    events.forEach(event => {
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${event.id}@dottbusiness.com\n`;
      icsContent += `DTSTART:${this.formatICSDate(event.startTime)}\n`;
      icsContent += `DTEND:${this.formatICSDate(event.endTime)}\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      if (event.location) icsContent += `LOCATION:${event.location}\n`;
      if (event.notes) icsContent += `DESCRIPTION:${event.notes.replace(/\n/g, '\\n')}\n`;
      icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';
    return icsContent;
  }

  /**
   * Format date for ICS file
   */
  formatICSDate(date) {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
}

export default new CalendarService();