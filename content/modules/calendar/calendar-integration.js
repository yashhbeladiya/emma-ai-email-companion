// calendar-integration.js - Integration with Google Calendar and Outlook Calendar
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.CalendarIntegration = class {
  constructor() {
    this.site = window.AIEmailCompanion.Helpers.getCurrentSite();
  }

  async addToCalendar(meetingData, emailData) {
    if (this.site.isGmail) {
      return this.addToGoogleCalendar(meetingData, emailData);
    } else if (this.site.isOutlook) {
      return this.addToOutlookCalendar(meetingData, emailData);
    } else {
      // Fallback to Google Calendar web interface
      return this.openGoogleCalendarWeb(meetingData, emailData);
    }
  }

  addToGoogleCalendar(meetingData, emailData) {
    try {
      // Format dates for Google Calendar
      const startDate = this.formatDateForGoogle(meetingData.startDate || new Date());
      const endDate = this.formatDateForGoogle(meetingData.endDate || new Date(Date.now() + 60*60*1000));
      
      // Build Google Calendar URL
      const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
      const params = new URLSearchParams({
        text: meetingData.title || meetingData.purpose || `Meeting: ${emailData.subject}`,
        dates: `${startDate}/${endDate}`,
        details: this.buildMeetingDetails(meetingData, emailData),
        location: meetingData.location || '',
        sf: true,
        output: 'xml'
      });
      
      // Open in new tab
      const calendarUrl = `${baseUrl}&${params.toString()}`;
      window.open(calendarUrl, '_blank');
      
      return { success: true, method: 'google_calendar' };
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
      return { success: false, error: error.message };
    }
  }

  addToOutlookCalendar(meetingData, emailData) {
    try {
      // Check if we're in Outlook web app
      if (window.location.hostname.includes('outlook')) {
        // Try to use Outlook's native calendar functionality
        this.openOutlookCalendarPane(meetingData, emailData);
        return { success: true, method: 'outlook_native' };
      } else {
        // Open Outlook Calendar web interface
        return this.openOutlookCalendarWeb(meetingData, emailData);
      }
    } catch (error) {
      console.error('Error adding to Outlook Calendar:', error);
      return { success: false, error: error.message };
    }
  }

  openOutlookCalendarPane(meetingData, emailData) {
    // Try to find and click the calendar button in Outlook
    const calendarButton = document.querySelector('[aria-label*="Calendar"]') ||
                          document.querySelector('[data-icon-name="Calendar"]') ||
                          document.querySelector('.ms-Button--command[title*="Calendar"]');
    
    if (calendarButton) {
      calendarButton.click();
      
      // Wait for calendar to open, then try to create event
      setTimeout(() => {
        const newEventButton = document.querySelector('[aria-label*="New event"]') ||
                               document.querySelector('[aria-label*="New appointment"]');
        if (newEventButton) {
          newEventButton.click();
          // Auto-fill would happen here if we had access to the form
          this.fillOutlookEventForm(meetingData, emailData);
        }
      }, 500);
    } else {
      // Fallback to web interface
      this.openOutlookCalendarWeb(meetingData, emailData);
    }
  }

  fillOutlookEventForm(meetingData, emailData) {
    setTimeout(() => {
      // Try to fill the form fields
      const titleField = document.querySelector('input[aria-label*="title"]') ||
                        document.querySelector('input[placeholder*="title"]');
      const locationField = document.querySelector('input[aria-label*="location"]') ||
                           document.querySelector('input[placeholder*="location"]');
      
      if (titleField) {
        titleField.value = meetingData.title || `Meeting: ${emailData.subject}`;
        titleField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      if (locationField && meetingData.location) {
        locationField.value = meetingData.location;
        locationField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 500);
  }

  openOutlookCalendarWeb(meetingData, emailData) {
    // Build Outlook Calendar web URL
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: meetingData.title || `Meeting: ${emailData.subject}`,
      body: this.buildMeetingDetails(meetingData, emailData),
      startdt: this.formatDateForOutlook(meetingData.startDate || new Date()),
      enddt: this.formatDateForOutlook(meetingData.endDate || new Date(Date.now() + 60*60*1000)),
      location: meetingData.location || '',
      allday: false
    });
    
    const calendarUrl = `${baseUrl}?${params.toString()}`;
    window.open(calendarUrl, '_blank');
    
    return { success: true, method: 'outlook_web' };
  }

  openGoogleCalendarWeb(meetingData, emailData) {
    // Fallback for non-Gmail users
    const startDate = this.formatDateForGoogle(meetingData.startDate || new Date());
    const endDate = this.formatDateForGoogle(meetingData.endDate || new Date(Date.now() + 60*60*1000));
    
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: meetingData.title || `Meeting: ${emailData.subject}`,
      dates: `${startDate}/${endDate}`,
      details: this.buildMeetingDetails(meetingData, emailData),
      location: meetingData.location || ''
    });
    
    const calendarUrl = `${baseUrl}&${params.toString()}`;
    window.open(calendarUrl, '_blank');
    
    return { success: true, method: 'google_calendar_web' };
  }

  buildMeetingDetails(meetingData, emailData) {
    let details = '';
    
    if (meetingData.purpose) {
      details += `Purpose: ${meetingData.purpose}\n\n`;
    }
    
    if (meetingData.description) {
      details += `${meetingData.description}\n\n`;
    }
    
    if (meetingData.type) {
      details += `Meeting Type: ${meetingData.type}\n`;
    }
    
    if (meetingData.duration) {
      details += `Duration: ${meetingData.duration}\n`;
    }
    
    details += `\n---\nOriginal Email:\n`;
    details += `From: ${emailData.sender}\n`;
    details += `Subject: ${emailData.subject}\n`;
    
    if (meetingData.suggestedTimes && meetingData.suggestedTimes.length > 0) {
      details += `\nSuggested Times:\n`;
      meetingData.suggestedTimes.forEach(time => {
        details += `- ${time}\n`;
      });
    }
    
    return details;
  }

  formatDateForGoogle(date) {
    // Format: YYYYMMDDTHHmmssZ
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  formatDateForOutlook(date) {
    // Format: YYYY-MM-DDTHH:mm:ss
    const d = new Date(date);
    return d.toISOString().slice(0, 19);
  }

  // Generate .ics file for universal calendar support
  generateICSFile(meetingData, emailData) {
    const startDate = this.formatDateForICS(meetingData.startDate || new Date());
    const endDate = this.formatDateForICS(meetingData.endDate || new Date(Date.now() + 60*60*1000));
    const uid = `emma-${Date.now()}@aiemailcompanion.com`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Emma AI Email Companion//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatDateForICS(new Date())}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${meetingData.title || emailData.subject}`,
      `DESCRIPTION:${this.buildMeetingDetails(meetingData, emailData).replace(/\n/g, '\\n')}`,
      meetingData.location ? `LOCATION:${meetingData.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n');
    
    // Create and download .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-${Date.now()}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    
    return { success: true, method: 'ics_file' };
  }

  formatDateForICS(date) {
    // Format: YYYYMMDDTHHMMSSZ
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
};