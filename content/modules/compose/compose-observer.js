// compose-observer.js - Compose window detection module
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
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('Compose observer set up');
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
    // Check if we have current email data (replying to an email)
    if (window.AIEmailCompanion.main?.currentEmailData) {
      return this.extractor.extractReplyContext(window.AIEmailCompanion.main.currentEmailData);
    }
    
    // Otherwise it's a new compose
    return { replyType: 'compose' };
  }

  updateContext(emailData) {
    // Update context when email changes
    if (emailData) {
      const context = this.extractor.extractReplyContext(emailData);
      this.assistant.updateContext(context);
    }
  }
};