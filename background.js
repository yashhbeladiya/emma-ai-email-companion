/**
 * Emma - AI Email Companion Background Script
 * 
 * This service worker handles background tasks for the Emma AI Email Companion extension:
 * - Extension lifecycle management (install, startup, updates)
 * - Context menu creation and handling
 * - Communication between content scripts and popup
 * - Calendar event management
 * - Storage operations for settings and data
 * - Mock API responses for development
 * 
 * @version 2.0.0
 * @author Emma AI Team
 */

// Emma - AI Email Companion Background Script - Enhanced Version
console.log('Emma - AI Email Companion background script loading...');

// Import calendar functionality
let LocalCalendar;

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      autoSummarize: true,
      smartReplies: true,
      toneAssistance: true,
      notifications: true,
      backendUrl: 'https://2f799a89e33e.ngrok-free.app' // Default backend URL
    }, () => {
      console.log('Default settings saved');
    });
    
    // Initialize local calendar
    initializeLocalCalendar();
  }
  
  // Create context menu after installation
  setTimeout(createContextMenu, 1000);
});

// Extension startup handler
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  initializeLocalCalendar();
  setTimeout(createContextMenu, 1000);
});

// Initialize local calendar system
function initializeLocalCalendar() {
  try {
    // Import calendar class (you'll need to include local-calendar.js in manifest)
    if (typeof LocalCalendar === 'undefined') {
      console.log('LocalCalendar not available, creating basic implementation');
      // Create basic calendar implementation
      LocalCalendar = class {
        constructor() {
          this.STORAGE_KEY = 'ai_companion_calendar';
        }
        
        async addEvent(eventData) {
          console.log('Adding event to calendar:', eventData);
          // Basic implementation
          return { success: true, id: Date.now() };
        }
      };
    }
    
    // Set up calendar reminders listener
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name.startsWith('reminder_')) {
        handleCalendarReminder(alarm);
      }
    });
    
    console.log('Local calendar initialized');
  } catch (error) {
    console.error('Error initializing calendar:', error);
  }
}

// Handle calendar reminders
async function handleCalendarReminder(alarm) {
  try {
    const reminders = await getCalendarReminders();
    const reminder = reminders[alarm.name];
    
    if (reminder) {
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Meeting Reminder',
        message: `${reminder.eventTitle} starts in 15 minutes`,
        buttons: [
          { title: 'View Details' },
          { title: 'Snooze 5 mins' }
        ]
      });
      
      console.log('Calendar reminder shown:', reminder.eventTitle);
    }
  } catch (error) {
    console.error('Error handling calendar reminder:', error);
  }
}

// Get calendar reminders from storage
async function getCalendarReminders() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ai_companion_reminders'], (result) => {
      resolve(result.ai_companion_reminders || {});
    });
  });
}

// Create context menu safely
function createContextMenu() {
  if (!chrome.contextMenus) {
    console.log('Context menus API not available');
    return;
  }
  
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'analyzeSelectedText',
      title: 'Analyze with AI Email Companion',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Context menu error:', chrome.runtime.lastError.message);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.id);
  
  if (!tab.url) {
    console.log('No URL available');
    return;
  }
  
  const supportedSites = [
    'mail.google.com',
    'outlook.live.com', 
    'outlook.office.com',
    'outlook.office365.com'
  ];
  
  let hostname = '';
  try {
    hostname = new URL(tab.url).hostname;
  } catch (e) {
    console.log('Invalid URL:', tab.url);
    return;
  }
  
  if (supportedSites.includes(hostname)) {
    // Send message to toggle sidebar
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSidebar'
    }).then(() => {
      console.log('Message sent successfully');
    }).catch((error) => {
      console.log('Message failed, trying to inject script:', error.message);
      injectContentScript(tab.id);
    });
  } else {
    // Show notification for unsupported sites
    showNotification('Please open Gmail or Outlook to use the AI Email Companion.');
  }
});

// Handle context menu clicks
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    
    if (info.menuItemId === 'analyzeSelectedText' && info.selectionText) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'analyzeSelection',
        text: info.selectionText
      }).catch((error) => {
        console.log('Context menu message failed:', error.message);
      });
    }
  });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  switch (request.action) {
    case 'callBackendAPI':
      handleBackendAPICall(request.endpoint, request.data, sendResponse);
      return true;
      
    case 'addToCalendar':
      handleAddToCalendar(request.eventData, sendResponse);
      return true;
      
    case 'getCalendarEvents':
      handleGetCalendarEvents(request.timeframe, sendResponse);
      return true;
      
    case 'saveSettings':
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'getSettings':
      chrome.storage.sync.get(null, (settings) => {
        sendResponse(settings);
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action: ' + request.action });
      return false;
  }
});

// Handle backend API calls
async function handleBackendAPICall(endpoint, data, sendResponse) {
  try {
    console.log('Making backend API call:', endpoint);
    
    // Get backend URL from settings
    const settings = await getStorageData('sync');
    const backendUrl = settings.backendUrl || 'https://your-backend-api.com';
    
    const response = await fetch(backendUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add any authentication headers here
        // 'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Backend API response:', result);
    
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Backend API call failed:', error);
    
    // Provide fallback mock data for development
    const mockData = getMockAPIResponse(endpoint, data);
    sendResponse({ success: true, data: mockData, isMock: true });
  }
}

// Mock API responses for development
function getMockAPIResponse(endpoint, data) {
  const mockResponses = {
    '/api/email/intent': {
      intent: determineEmailIntent(data),
      shortTitle: `${data.sender}: ${data.subject.substring(0, 50)}...`
    },
    
    '/api/email/tone': {
      tone: determineEmailTone(data),
      confidence: 0.85
    },
    
    '/api/email/summary': {
      points: generateSummaryPoints(data)
    },
    
    '/api/reply/quick': {
      replies: [
        { text: "Thank you for your email. I'll review this and get back to you shortly.", tone: "Professional" },
        { text: "Thanks for reaching out! This looks great. I appreciate the detailed information.", tone: "Friendly" },
        { text: "I acknowledge receipt of your email and will respond within 24 hours.", tone: "Formal" },
        { text: "Got it! Let me check on this and circle back with you soon.", tone: "Casual" }
      ],
      alternatives: [
        { type: 'decline', text: 'Decline politely', label: 'Say No' },
        { type: 'reschedule', text: 'Request different time', label: 'Reschedule' },
        { type: 'counter', text: 'Make counter-proposal', label: 'Counter-offer' }
      ]
    },
    
    '/api/reply/alternative': {
      success: true,
      text: generateAlternativeReply(data.alternativeType, data.emailData)
    },
    
    '/api/attachments/suggest': {
      suggestions: generateAttachmentSuggestions(data)
    },
    
    '/api/meeting/extract': {
      hasMeeting: checkForMeeting(data),
      description: extractMeetingDescription(data),
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      type: 'meeting'
    },
    
    '/api/compose/refine': {
      success: true,
      refinedText: refineComposeText(data.userText, data.context)
    }
  };
  
  return mockResponses[endpoint] || { success: false, error: 'Unknown endpoint' };
}

// Mock AI logic functions
function determineEmailIntent(data) {
  const text = (data.subject + ' ' + data.body).toLowerCase();
  
  if (text.includes('meeting') || text.includes('schedule')) return 'Meeting Request';
  if (text.includes('question') || text.includes('?')) return 'Question';
  if (text.includes('feedback') || text.includes('review')) return 'Feedback';
  if (text.includes('task') || text.includes('assignment')) return 'Task Assignment';
  if (text.includes('proposal') || text.includes('suggest')) return 'Proposal';
  if (text.includes('advertisement') || text.includes('promotion')) return 'Advertisement';
  if (text.includes('submit') || text.includes('delivery')) return 'Submission';
  if (text.includes('complaint') || text.includes('issue')) return 'Complaint';
  
  return 'General';
}

function determineEmailTone(data) {
  const text = (data.subject + ' ' + data.body).toLowerCase();
  
  if (text.includes('urgent') || text.includes('asap')) return 'Urgent';
  if (text.includes('dear') || text.includes('sincerely')) return 'Formal';
  if (text.includes('thanks') || text.includes('appreciate')) return 'Friendly';
  if (text.includes('hi') || text.includes('hey')) return 'Casual';
  if (text.includes('?') && !text.includes('thank')) return 'Questioning';
  if (text.includes('disappointed') || text.includes('frustrated')) return 'Angry';
  if (text.includes('sorry') || text.includes('understand')) return 'Empathetic';
  
  return 'Professional';
}

function generateSummaryPoints(data) {
  const points = [];
  const text = data.body.toLowerCase();
  
  // Extract key sentences
  const sentences = data.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Simple heuristic to find important sentences
  const keywords = ['important', 'need', 'request', 'please', 'deadline', 'meeting', 'project'];
  const importantSentences = sentences.filter(sentence => 
    keywords.some(keyword => sentence.toLowerCase().includes(keyword))
  );
  
  if (importantSentences.length > 0) {
    points.push(...importantSentences.slice(0, 3).map(s => s.trim()));
  } else {
    points.push(...sentences.slice(0, 3).map(s => s.trim()));
  }
  
  return points.length > 0 ? points : [`Email from ${data.sender} regarding ${data.subject}`];
}

function generateAlternativeReply(type, emailData) {
  const alternatives = {
    'decline': "Thank you for your email. Unfortunately, I won't be able to accommodate this request at this time. I appreciate your understanding.",
    'reschedule': "Thank you for reaching out. The proposed time doesn't work for me. Could we schedule this for a different time? I'm available [your availability here].",
    'counter': "Thank you for your proposal. I'd like to suggest a few modifications that might work better for both of us. Can we discuss this further?"
  };
  
  return alternatives[type] || "Thank you for your email. I'll get back to you with more details soon.";
}

function generateAttachmentSuggestions(data) {
  const suggestions = [];
  const text = (data.emailData.subject + ' ' + data.emailData.body).toLowerCase();
  
  if (text.includes('receipt') || text.includes('payment')) {
    suggestions.push({
      description: 'Payment receipt or invoice',
      reason: 'Payment-related conversation detected'
    });
  }
  
  if (text.includes('document') || text.includes('file')) {
    suggestions.push({
      description: 'Referenced document',
      reason: 'Document mentioned in email'
    });
  }
  
  if (text.includes('photo') || text.includes('image') || text.includes('picture')) {
    suggestions.push({
      description: 'Relevant photos or images',
      reason: 'Visual content referenced'
    });
  }
  
  if (text.includes('report') || text.includes('analysis')) {
    suggestions.push({
      description: 'Supporting report or analysis',
      reason: 'Report or analysis mentioned'
    });
  }
  
  return suggestions;
}

function checkForMeeting(data) {
  const text = (data.subject + ' ' + data.body).toLowerCase();
  const meetingKeywords = ['meeting', 'call', 'conference', 'discussion', 'sync', 'standup', 'lunch'];
  
  return meetingKeywords.some(keyword => text.includes(keyword));
}

function extractMeetingDescription(data) {
  if (!checkForMeeting(data)) return '';
  
  const text = data.body;
  // Simple extraction - look for time-related patterns
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/gi;
  const datePattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/gi;
  
  const timeMatch = text.match(timePattern);
  const dateMatch = text.match(datePattern);
  
  let description = `Meeting requested by ${data.sender}`;
  
  if (timeMatch && dateMatch) {
    description += ` for ${dateMatch[0]} at ${timeMatch[0]}`;
  }
  
  return description;
}

function refineComposeText(userText, context) {
  // Simple text refinement logic
  let refined = userText;
  
  // Make it more professional
  refined = refined
    .replace(/hey/gi, 'Hello')
    .replace(/thanks/gi, 'Thank you')
    .replace(/can't/gi, 'cannot')
    .replace(/won't/gi, 'will not');
  
  // Add context-appropriate greeting if missing
  if (context && context.replyType === 'reply' && !refined.toLowerCase().includes('thank')) {
    refined = 'Thank you for your email. ' + refined;
  }
  
  // Ensure proper ending
  if (!refined.match(/[.!?]$/)) {
    refined += '.';
  }
  
  return refined;
}

// Handle calendar operations
async function handleAddToCalendar(eventData, sendResponse) {
  try {
    console.log('Adding event to local calendar:', eventData);
    
    // Store event in local storage
    const events = await getStorageData('local', 'ai_companion_calendar') || [];
    
    const newEvent = {
      id: 'event_' + Date.now(),
      title: eventData.title,
      description: eventData.description || '',
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      location: eventData.location || '',
      attendees: eventData.attendees || [],
      type: eventData.type || 'meeting',
      emailContext: eventData.emailContext || null,
      createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    
    // Save to storage
    chrome.storage.local.set({
      'ai_companion_calendar': events
    }, () => {
      console.log('Event saved to local calendar');
    });
    
    // Set up reminder (15 minutes before)
    const reminderTime = new Date(new Date(eventData.startDate).getTime() - (15 * 60 * 1000));
    
    if (reminderTime > new Date()) {
      chrome.alarms.create(`reminder_${newEvent.id}`, {
        when: reminderTime.getTime()
      });
      
      // Store reminder info
      const reminders = await getStorageData('local', 'ai_companion_reminders') || {};
      reminders[`reminder_${newEvent.id}`] = {
        eventId: newEvent.id,
        eventTitle: newEvent.title,
        eventStart: eventData.startDate,
        reminderTime: reminderTime.toISOString()
      };
      
      chrome.storage.local.set({
        'ai_companion_reminders': reminders
      });
    }
    
    sendResponse({ success: true, event: newEvent });
  } catch (error) {
    console.error('Error adding to calendar:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get calendar events
async function handleGetCalendarEvents(timeframe, sendResponse) {
  try {
    const events = await getStorageData('local', 'ai_companion_calendar') || [];
    
    let filteredEvents = events;
    
    if (timeframe === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      filteredEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= startOfDay && eventDate < endOfDay;
      });
    } else if (timeframe === 'upcoming') {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      filteredEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= now && eventDate <= weekFromNow;
      });
    }
    
    sendResponse({ success: true, events: filteredEvents });
  } catch (error) {
    console.error('Error getting calendar events:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Utility function to get storage data
function getStorageData(type, key = null) {
  const storage = type === 'sync' ? chrome.storage.sync : chrome.storage.local;
  
  return new Promise((resolve) => {
    if (key) {
      storage.get([key], (result) => {
        resolve(result[key]);
      });
    } else {
      storage.get(null, (result) => {
        resolve(result);
      });
    }
  });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'mail.google.com',
      'outlook.live.com',
      'outlook.office.com', 
      'outlook.office365.com'
    ];
    
    let hostname = '';
    try {
      hostname = new URL(tab.url).hostname;
    } catch (e) {
      return;
    }
    
    if (supportedSites.includes(hostname)) {
      console.log('Supported site loaded:', hostname);
      // Inject content script with delay
      setTimeout(() => {
        injectContentScript(tabId);
      }, 2000);
    }
  }
});

// Inject content script function
function injectContentScript(tabId) {
  if (!chrome.scripting) {
    console.log('Scripting API not available');
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    console.log('Content script injected for tab:', tabId);
  }).catch((error) => {
    console.log('Content script injection failed:', error.message);
  });
}

// Show notification function
function showNotification(message) {
  if (!chrome.notifications) {
    console.log('Notifications API not available');
    return;
  }
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'AI Email Companion',
    message: message
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.log('Notification error:', chrome.runtime.lastError.message);
    } else {
      console.log('Notification shown:', notificationId);
    }
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 1) { // Snooze button
    // Snooze for 5 minutes
    const snoozeTime = Date.now() + (5 * 60 * 1000);
    chrome.alarms.create(`snooze_${Date.now()}`, {
      when: snoozeTime
    });
  }
  
  chrome.notifications.clear(notificationId);
});

console.log('Background script loaded successfully');