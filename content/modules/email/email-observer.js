/**
 * Email Observer Module
 * 
 * Monitors email pages for changes and triggers analysis when new emails are loaded.
 * Uses multiple detection strategies including URL monitoring, DOM observation,
 * and periodic checking to ensure reliable email detection.
 * 
 * Features:
 * - Real-time email detection across platforms
 * - URL-based navigation monitoring
 * - DOM mutation observation
 * - Interval-based fallback checking
 * - Debounced change handling
 * - Platform-specific email identification
 * - Memory leak prevention
 * - Performance optimization
 * 
 * Detection Strategies:
 * - URL hash/search parameter changes
 * - DOM content mutations
 * - Periodic content scanning
 * - Navigation event listening
 * 
 * @class EmailObserver
 * @version 2.0.0
 * @author Emma AI Team
 */

// email-observer.js - Email change detection module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailObserver = class {
  constructor(onEmailChangeCallback) {
    this.onEmailChangeCallback = onEmailChangeCallback;
    this.helpers = window.AIEmailCompanion.Helpers;
    this.site = this.helpers.getCurrentSite();
    this.currentEmailId = null;
    this.emailCheckInterval = null;
    this.processingEmail = false;
    this.lastProcessedUrl = null;
    this.observers = [];
  }

  start() {
    console.log('Starting email observer...');
    
    // Start interval-based checking
    this.startEmailMonitoring();
    
    // Setup URL change listener
    this.setupUrlChangeListener();
    
    // Setup mutation observers
    if (this.site.isGmail) {
      this.setupGmailObserver();
    } else if (this.site.isOutlook) {
      this.setupOutlookObserver();
    }
  }

  stop() {
    console.log('Stopping email observer...');
    
    if (this.emailCheckInterval) {
      clearInterval(this.emailCheckInterval);
      this.emailCheckInterval = null;
    }
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  startEmailMonitoring() {
    // Check for email changes periodically
    this.emailCheckInterval = setInterval(() => {
      this.checkForEmailChanges();
    }, window.AIEmailCompanion.Constants.TIMINGS.EMAIL_CHECK_INTERVAL);
  }

  setupUrlChangeListener() {
    let lastUrl = location.href;
    
    const urlObserver = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.handleUrlChange();
      }
    });
    
    urlObserver.observe(document, { subtree: true, childList: true });
    this.observers.push(urlObserver);
  }

  setupGmailObserver() {
    const debouncedCheck = this.helpers.debounce(() => {
      if (!this.processingEmail) {
        this.checkForEmailChanges();
      }
    }, window.AIEmailCompanion.Constants.TIMINGS.OBSERVER_DEBOUNCE);

    const observer = new MutationObserver(debouncedCheck);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-message-id', 'data-legacy-message-id']
    });
    
    this.observers.push(observer);
    console.log('Gmail observer set up');
  }

  setupOutlookObserver() {
    const debouncedCheck = this.helpers.debounce(() => {
      if (!this.processingEmail) {
        this.checkForEmailChanges();
      }
    }, window.AIEmailCompanion.Constants.TIMINGS.OBSERVER_DEBOUNCE);

    const observer = new MutationObserver(debouncedCheck);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
    console.log('Outlook observer set up');
  }

  checkForEmailChanges() {
    if (this.processingEmail) {
      return;
    }

    const extractor = new window.AIEmailCompanion.EmailExtractor();
    const currentEmailId = extractor.getCurrentEmailId();
    
    if (currentEmailId && currentEmailId !== this.currentEmailId) {
      console.log('New email detected:', currentEmailId);
      this.currentEmailId = currentEmailId;
      this.processEmailChange(currentEmailId);
    } else if (!currentEmailId && this.currentEmailId) {
      // Email was closed
      console.log('Email closed');
      this.handleEmailClosed();
    }
  }

  async processEmailChange(emailId) {
    if (this.processingEmail) {
      return;
    }

    this.processingEmail = true;
    
    try {
      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, window.AIEmailCompanion.Constants.TIMINGS.EMAIL_PROCESS_DELAY));
      
      if (this.onEmailChangeCallback) {
        await this.onEmailChangeCallback(emailId);
      }
    } catch (error) {
      console.error('Error processing email change:', error);
    } finally {
      this.processingEmail = false;
    }
  }

  handleUrlChange() {
    console.log('URL changed:', location.href);
    
    // Reset current email ID on URL change
    setTimeout(() => {
      this.currentEmailId = null;
      this.checkForEmailChanges();
    }, 500);
  }

  handleEmailClosed() {
    this.currentEmailId = null;
    
    if (this.onEmailChangeCallback) {
      this.onEmailChangeCallback(null);
    }
  }
};