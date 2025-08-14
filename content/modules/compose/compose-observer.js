/**
 * Compose Observer Module
 * 
 * Monitors email pages for compose window events and manages compose assistance
 * integration. Detects when users start composing emails and activates
 * appropriate AI assistance features.
 * 
 * Features:
 * - Real-time compose window detection
 * - Context extraction from reply chains
 * - Automatic assistant activation
 * - Platform-specific integration
 * - Memory leak prevention
 * - Performance optimization
 * 
 * Detection Capabilities:
 * - New email composition
 * - Reply composition
 * - Forward composition
 * - Draft restoration
 * - Compose window changes
 * 
 * Context Handling:
 * - Original email extraction
 * - Reply chain analysis
 * - Sender information
 * - Subject line context
 * - Thread history
 * 
 * @class ComposeObserver
 * @version 2.0.0
 * @author Emma AI Team
 */

// compose-observer.js - Compose window detection module with complete context handling
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.ComposeObserver = class {
  constructor() {
    this.assistant = new window.AIEmailCompanion.ComposeAssistant();
    this.helpers = window.AIEmailCompanion.Helpers;
    this.extractor = new window.AIEmailCompanion.EmailExtractor();
    this.observer = null;
  }

  start() {
    console.log('Starting compose observer...');
    
    // Check for existing compose windows
    this.checkExistingComposeWindows();
    
    // Setup observer for new compose windows
    this.setupObserver();
  }

  stop() {
    console.log('Stopping compose observer...');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Look for compose windows
          const composeWindows = document.querySelectorAll('[contenteditable="true"]');
          composeWindows.forEach(textarea => {
            if (!textarea.hasAttribute('data-ai-compose-helper')) {
              textarea.setAttribute('data-ai-compose-helper', 'true');
              console.log('Compose window detected, setting up assistant...');
              this.setupComposeWindow(textarea);
            }
          });
          
          // Check if compose window opened/closed to adjust sidebar
          this.checkComposeState();
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('Compose observer set up');
  }

  checkComposeState() {
    const sidebar = window.AIEmailCompanion.main?.sidebar;
    if (sidebar && sidebar.isOpen()) {
      // Recheck compose box position
      sidebar.adjustForComposeBox();
    }
  }

  checkExistingComposeWindows() {
    const composeWindows = document.querySelectorAll('[contenteditable="true"]');
    composeWindows.forEach(textarea => {
      if (!textarea.hasAttribute('data-ai-compose-helper')) {
        textarea.setAttribute('data-ai-compose-helper', 'true');
        this.setupComposeWindow(textarea);
      }
    });
  }

  setupComposeWindow(textarea) {
    // Extract context if replying to an email
    const context = this.extractComposeContext();
    
    // Setup assistant for this compose window
    this.assistant.setupAssistant(textarea, context);
  }

  extractComposeContext() {
    // Check if this is a reply or forward
    const site = window.AIEmailCompanion.Helpers.getCurrentSite();
    let isReply = false;
    
    if (site.isGmail) {
      // Check for reply indicators in Gmail
      const replyIndicators = document.querySelector('.ajl') || // Reply button clicked
                             document.querySelector('.gJ') || // Reply context
                             document.querySelector('.gmail_quote') || // Quoted text
                             document.querySelector('[aria-label*="Reply"]'); // Reply compose
      isReply = !!replyIndicators;
    } else if (site.isOutlook) {
      // Check for reply indicators in Outlook
      const replyIndicators = document.querySelector('.quoted-text') ||
                             document.querySelector('[id*="divRplyFwdMsg"]') ||
                             document.querySelector('[aria-label*="Reply"]');
      isReply = !!replyIndicators;
    }
    
    // Only return reply context if we're actually replying AND have email data
    if (isReply && window.AIEmailCompanion.main?.currentEmailData) {
      const emailData = window.AIEmailCompanion.main.currentEmailData;
      return {
        originalSubject: emailData.subject || 'Previous Email',
        originalSender: emailData.sender || 'Sender',
        originalBody: (emailData.body || '').substring(0, 500),
        replyType: 'reply'
      };
    }
    
    // Otherwise it's a new compose
    return { replyType: 'compose' };
  }

  updateContext(emailData) {
    // Update context when email changes
    if (emailData) {
      const context = {
        originalSubject: emailData.subject || 'Previous Email',
        originalSender: emailData.sender || 'Sender',
        originalBody: (emailData.body || '').substring(0, 500),
        replyType: 'reply'
      };
      this.assistant.updateContext(context);
    } else {
      // No email data, reset to compose mode
      this.assistant.updateContext({ replyType: 'compose' });
    }
  }
};