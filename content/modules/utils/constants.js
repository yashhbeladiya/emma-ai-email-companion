// constants.js - Global constants for AI Email Companion
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.Constants = {
  // API Configuration
  API_BASE_URL: 'https://46ab-155-33-135-52.ngrok-free.app',
  
  // Storage Keys
  STORAGE_KEYS: {
    CALENDAR: 'ai_companion_calendar',
    REMINDERS: 'ai_companion_reminders',
    SETTINGS: 'ai_companion_settings',
    EMAILS_PROCESSED: 'emailsProcessed'
  },
  
  // Supported Sites
  SUPPORTED_SITES: {
    'mail.google.com': 'Gmail',
    'outlook.live.com': 'Outlook',
    'outlook.office.com': 'Outlook',
    'outlook.office365.com': 'Outlook 365'
  },
  
  // UI States
  SIDEBAR_STATES: {
    CLOSED: 'closed',
    OPENING: 'opening',
    OPEN: 'open',
    CLOSING: 'closing'
  },
  
  // Email Intents
  EMAIL_INTENTS: {
    MEETING_REQUEST: 'Meeting Request',
    QUESTION: 'Question',
    FEEDBACK: 'Feedback',
    TASK_ASSIGNMENT: 'Task Assignment',
    PROPOSAL: 'Proposal',
    ADVERTISEMENT: 'Advertisement',
    SUBMISSION: 'Submission',
    COMPLAINT: 'Complaint',
    GENERAL: 'General'
  },
  
  // Email Tones
  EMAIL_TONES: {
    FORMAL: 'Formal',
    CASUAL: 'Casual',
    FRIENDLY: 'Friendly',
    PROFESSIONAL: 'Professional',
    URGENT: 'Urgent',
    QUESTIONING: 'Questioning',
    ANGRY: 'Angry',
    EMPATHETIC: 'Empathetic',
    NORMAL: 'Normal'
  },
  
  // Intent Emojis
  INTENT_EMOJIS: {
    'Meeting Request': '📅',
    'Question': '❓',
    'Feedback': '💬',
    'Task Assignment': '📋',
    'Proposal': '📝',
    'Advertisement': '📢',
    'Submission': '📤',
    'Complaint': '😠',
    'General': '📧'
  },
  
  // Tone Emojis
  TONE_EMOJIS: {
    'Formal': '🎩',
    'Casual': '😊',
    'Friendly': '🤝',
    'Professional': '💼',
    'Urgent': '⚡',
    'Questioning': '🤔',
    'Angry': '😡',
    'Empathetic': '💙',
    'Normal': '😐'
  },
  
  // Timing Constants
  TIMINGS: {
    EMAIL_CHECK_INTERVAL: 1000,
    COMPOSE_TYPING_DELAY: 2000,
    SIDEBAR_ANIMATION: 600,
    EMAIL_PROCESS_DELAY: 500,
    OBSERVER_DEBOUNCE: 300
  },
  
  // Default Settings
  DEFAULT_SETTINGS: {
    autoSummarize: true,
    smartReplies: true,
    toneAssistance: true,
    notifications: true
  }
};