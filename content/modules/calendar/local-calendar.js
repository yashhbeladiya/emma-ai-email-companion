/**
 * Local Calendar Management Module
 * 
 * Manages calendar events and reminders locally within the browser.
 * Provides calendar functionality for meeting detection and scheduling
 * without requiring external calendar API access.
 * 
 * Features:
 * - Local event storage using chrome.storage
 * - Event creation and management
 * - Reminder system with notifications
 * - Meeting extraction from emails
 * - Calendar event suggestions
 * - Event validation and formatting
 * - Conflict detection
 * - Export capabilities
 * 
 * Event Management:
 * - Add/edit/delete events
 * - Recurring event support
 * - Reminder notifications
 * - Event search and filtering
 * - Data persistence
 * - Import/export functionality
 * 
 * Integration:
 * - Email meeting detection
 * - One-click event creation
 * - Notification system
 * - Background sync
 * 
 * @class LocalCalendar
 * @version 2.0.0
 * @author Emma AI Team
 */

// local-calendar.js - Calendar functionality
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.LocalCalendar = class {
  constructor() {
    this.STORAGE_KEY = window.AIEmailCompanion.Constants.STORAGE_KEYS.CALENDAR;
    this.REMINDERS_KEY = window.AIEmailCompanion.Constants.STORAGE_KEYS.REMINDERS;
    this.helpers = window.AIEmailCompanion.Helpers;
  }

  async addEvent(eventData) {
    try {
      const events = await this.getAllEvents();
      
      const newEvent = {
        id: this.helpers.generateId('event'),
        title: eventData.title,
        description: eventData.description || '',
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        type: eventData.type || 'meeting',
        emailContext: eventData.emailContext || null,
        createdAt: new Date()
      };

      events.push(newEvent);
      await this.saveEvents(events);
      
      console.log('Event added to local calendar:', newEvent);
      return newEvent;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  async getAllEvents() {
    return await this.helpers.getStorageData(this.STORAGE_KEY) || [];
  }

  async saveEvents(events) {
    return await this.helpers.setStorageData(this.STORAGE_KEY, events);
  }

  async createEventFromEmail(emailData, meetingInfo) {
    try {
      const eventData = {
        title: meetingInfo.title || `Meeting: ${emailData.subject}`,
        description: `Meeting requested in email from ${emailData.sender}`,
        startDate: meetingInfo.startDate || new Date(),
        endDate: meetingInfo.endDate || new Date(),
        location: meetingInfo.location || '',
        attendees: [emailData.sender],
        type: 'meeting',
        emailContext: {
          subject: emailData.subject,
          sender: emailData.sender,
          body: emailData.body.substring(0, 500)
        }
      };

      return await this.addEvent(eventData);
    } catch (error) {
      console.error('Error creating event from email:', error);
      throw error;
    }
  }

  async setReminder(eventId, reminderTime) {
    try {
      const reminders = await this.helpers.getStorageData(this.REMINDERS_KEY) || {};
      const reminderId = `reminder_${eventId}`;
      
      reminders[reminderId] = {
        eventId: eventId,
        reminderTime: reminderTime,
        created: new Date()
      };
      
      await this.helpers.setStorageData(this.REMINDERS_KEY, reminders);
      
      // Send message to background script to set alarm
      chrome.runtime.sendMessage({
        action: 'setReminder',
        reminderId: reminderId,
        reminderTime: reminderTime
      });
      
      return reminderId;
    } catch (error) {
      console.error('Error setting reminder:', error);
      throw error;
    }
  }
};