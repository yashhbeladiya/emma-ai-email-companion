// calendar-integration.js - Google Calendar Integration
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.CalendarIntegration = class {
  constructor() {
    this.helpers = window.AIEmailCompanion.Helpers;
  }

  /**
   * Create calendar event from email data
   * Opens Google Calendar or Outlook Calendar with pre-filled information
   */
  async createEventFromEmail(emailData, meetingInfo) {
    try {
      const site = this.helpers.getCurrentSite();
      
      if (site.isGmail) {
        this.openGoogleCalendar(emailData, meetingInfo);
      } else if (site.isOutlook) {
        this.openOutlookCalendar(emailData, meetingInfo);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Open Google Calendar with pre-filled event details
   */
  openGoogleCalendar(emailData, meetingInfo) {
    // Parse meeting details
    const eventDetails = this.parseMeetingDetails(emailData, meetingInfo);
    
    // Build Google Calendar URL
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventDetails.title,
      dates: this.formatGoogleCalendarDates(eventDetails.startDate, eventDetails.endDate),
      details: eventDetails.description,
      location: eventDetails.location || '',
      sf: true,
      output: 'xml'
    });

    // Add guests if we have sender email
    if (emailData.senderEmail) {
      params.append('add', emailData.senderEmail);
    }

    // Open in new tab
    const calendarUrl = `${baseUrl}?${params.toString()}`;
    window.open(calendarUrl, '_blank');
    
    console.log('Opening Google Calendar with meeting details');
  }

  /**
   * Open Outlook Calendar with pre-filled event details
   */
  openOutlookCalendar(emailData, meetingInfo) {
    // Parse meeting details
    const eventDetails = this.parseMeetingDetails(emailData, meetingInfo);
    
    // For Outlook Web, we'll use the calendar deeplink
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: eventDetails.title,
      body: eventDetails.description,
      startdt: eventDetails.startDate.toISOString(),
      enddt: eventDetails.endDate.toISOString(),
      location: eventDetails.location || '',
      allday: false
    });

    // Open in new tab
    const calendarUrl = `${baseUrl}?${params.toString()}`;
    window.open(calendarUrl, '_blank');
    
    console.log('Opening Outlook Calendar with meeting details');
  }

  /**
   * Parse meeting details from email and meeting info
   */
  parseMeetingDetails(emailData, meetingInfo) {
    // Extract title
    let title = meetingInfo.purpose || meetingInfo.description || emailData.subject;
    title = title.replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '').trim();
    
    // Parse dates
    const { startDate, endDate } = this.parseMeetingDates(meetingInfo, emailData);
    
    // Build description
    const description = this.buildEventDescription(emailData, meetingInfo);
    
    // Extract location
    const location = this.extractLocation(meetingInfo, emailData);
    
    return {
      title,
      startDate,
      endDate,
      description,
      location
    };
  }

  /**
   * Parse meeting dates from various formats
   */
  parseMeetingDates(meetingInfo, emailData) {
    let startDate, endDate;
    
    // Try to parse from meeting info
    if (meetingInfo.startDate) {
      startDate = new Date(meetingInfo.startDate);
    } else if (meetingInfo.suggestedTimes && meetingInfo.suggestedTimes.length > 0) {
      // Parse first suggested time
      startDate = this.parseTimeString(meetingInfo.suggestedTimes[0]);
    } else {
      // Default to tomorrow at 2 PM
      startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(14, 0, 0, 0);
    }
    
    // Calculate end date based on duration
    const duration = this.parseDuration(meetingInfo.duration);
    endDate = new Date(startDate.getTime() + duration);
    
    return { startDate, endDate };
  }

  /**
   * Parse time string to Date object
   */
  parseTimeString(timeStr) {
    const now = new Date();
    
    // Common patterns
    const patterns = [
      // "Tuesday 2 PM", "Tuesday at 2 PM"
      /(\w+day)\s+(?:at\s+)?(\d{1,2})\s*(am|pm)/i,
      // "Jan 14 at 2 PM", "January 14, 2 PM"
      /(\w+)\s+(\d{1,2})(?:,?\s+at)?\s+(\d{1,2})\s*(am|pm)/i,
      // "1/14 2:00 PM", "14/1 14:00"
      /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      // "tomorrow at 3 PM"
      /(tomorrow|today)\s+(?:at\s+)?(\d{1,2})\s*(am|pm)/i
    ];
    
    for (const pattern of patterns) {
      const match = timeStr.match(pattern);
      if (match) {
        return this.parseMatchedTime(match, now);
      }
    }
    
    // Fallback: try to parse as is
    const parsed = new Date(timeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Default to tomorrow 2 PM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Parse matched time pattern
   */
  parseMatchedTime(match, baseDate) {
    const date = new Date(baseDate);
    
    // Handle day of week
    if (match[1] && /day$/i.test(match[1])) {
      const dayName = match[1].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayName);
      
      if (targetDay !== -1) {
        const currentDay = date.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed
        date.setDate(date.getDate() + daysToAdd);
      }
    }
    
    // Handle tomorrow/today
    if (match[1] && /tomorrow/i.test(match[1])) {
      date.setDate(date.getDate() + 1);
    }
    
    // Handle time
    let hour = parseInt(match[2] || match[3]);
    const isPM = /pm/i.test(match[match.length - 1]);
    
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    date.setHours(hour, 0, 0, 0);
    
    return date;
  }

  /**
   * Parse duration string to milliseconds
   */
  parseDuration(durationStr) {
    if (!durationStr) return 60 * 60 * 1000; // Default 1 hour
    
    const patterns = [
      { regex: /(\d+)\s*hour/i, multiplier: 60 * 60 * 1000 },
      { regex: /(\d+)\s*hr/i, multiplier: 60 * 60 * 1000 },
      { regex: /(\d+)\s*minute/i, multiplier: 60 * 1000 },
      { regex: /(\d+)\s*min/i, multiplier: 60 * 1000 }
    ];
    
    for (const { regex, multiplier } of patterns) {
      const match = durationStr.match(regex);
      if (match) {
        return parseInt(match[1]) * multiplier;
      }
    }
    
    return 60 * 60 * 1000; // Default 1 hour
  }

  /**
   * Build event description from email content
   */
  buildEventDescription(emailData, meetingInfo) {
    let description = '';
    
    // Add meeting purpose if available
    if (meetingInfo.purpose) {
      description += `Meeting Purpose: ${meetingInfo.purpose}\n\n`;
    }
    
    // Add organizer info
    description += `Organized by: ${emailData.sender}\n`;
    if (emailData.senderEmail) {
      description += `Email: ${emailData.senderEmail}\n`;
    }
    
    // Add original email subject
    description += `\nOriginal Email: ${emailData.subject}\n`;
    
    // Add meeting type if specified
    if (meetingInfo.type && meetingInfo.type !== 'Undefined') {
      description += `\nMeeting Type: ${meetingInfo.type}\n`;
    }
    
    // Add any agenda items from email body
    if (emailData.body) {
      const agendaMatch = emailData.body.match(/agenda|topics?|discuss|cover/i);
      if (agendaMatch) {
        description += '\n---\nFrom original email:\n';
        // Extract relevant portion (first 500 chars after agenda mention)
        const startIndex = emailData.body.toLowerCase().indexOf(agendaMatch[0]);
        const excerpt = emailData.body.substring(startIndex, startIndex + 500);
        description += excerpt;
      }
    }
    
    return description;
  }

  /**
   * Extract location from meeting info or email
   */
  extractLocation(meetingInfo, emailData) {
    // Check meeting info first
    if (meetingInfo.location) {
      return meetingInfo.location;
    }
    
    // Check meeting type for virtual meetings
    if (meetingInfo.type) {
      if (/video|zoom|teams|meet|skype/i.test(meetingInfo.type)) {
        return 'Virtual Meeting (Link TBD)';
      }
      if (/phone|call/i.test(meetingInfo.type)) {
        return 'Phone Call';
      }
    }
    
    // Try to extract from email body
    if (emailData.body) {
      // Look for location patterns
      const patterns = [
        /location:\s*([^\n]+)/i,
        /where:\s*([^\n]+)/i,
        /at\s+([\w\s]+(?:room|office|building|conference)[\w\s]*)/i,
        /(room\s+[\w\d]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = emailData.body.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
      
      // Check for virtual meeting links
      if (/zoom\.us|teams\.microsoft|meet\.google/i.test(emailData.body)) {
        return 'Virtual Meeting (See email for link)';
      }
    }
    
    return '';
  }

  /**
   * Format dates for Google Calendar URL
   */
  formatGoogleCalendarDates(startDate, endDate) {
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    return `${formatDate(startDate)}/${formatDate(endDate)}`;
  }
};