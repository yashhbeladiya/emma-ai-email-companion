// email-extractor.js - Email data extraction module with improved sender detection
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailExtractor = class {
  constructor() {
    this.helpers = window.AIEmailCompanion.Helpers;
    this.site = this.helpers.getCurrentSite();
  }

  extractEmailData() {
    let emailData = null;

    console.log('Extracting email data...');
    console.log('Current site:', this.site);

    if (this.site.isGmail) {
      emailData = this.extractGmailData();
    } else if (this.site.isOutlook) {
      emailData = this.extractOutlookData();
    }

    console.log('Extracted Email Data:', emailData);
    return emailData;
  }

  extractGmailData() {
    // Get subject - look for the currently open email's subject
    const subjectElement = this.helpers.safeQuerySelector('[data-legacy-thread-id] h2') || 
                           this.helpers.safeQuerySelector('h2[data-thread-perm-id]') ||
                           this.helpers.safeQuerySelector('.hP') ||
                           this.helpers.safeQuerySelector('.ha h2');
    
    // Get the currently visible/expanded email message container
    const expandedMessage = this.helpers.safeQuerySelector('.h7:not(.aXjCH)') || // Expanded message
                           this.helpers.safeQuerySelector('.ii.gt') || // Message body container
                           this.helpers.safeQuerySelector('.a3s.aiL'); // Alternative message container
    
    let senderElement = null;
    let senderName = 'Unknown';
    let senderEmail = '';
    
    if (expandedMessage) {
      // Look for sender in the expanded message's header area
      const messageContainer = expandedMessage.closest('.gs') || expandedMessage.closest('.h7');
      
      if (messageContainer) {
        // Try multiple selectors for the sender in the message header
        senderElement = messageContainer.querySelector('.gD') || // Sender name in message header
                       messageContainer.querySelector('.go .g2') || // Alternative sender location
                       messageContainer.querySelector('.qu .g2') || // Another alternative
                       messageContainer.querySelector('[email]'); // Element with email attribute
        
        // Extract sender name from various possible elements
        if (senderElement) {
          senderName = senderElement.textContent.trim();
          senderEmail = senderElement.getAttribute('email') || '';
          
          // If we got an email address as the name, try to find the actual name
          if (senderName.includes('@') && !senderEmail) {
            senderEmail = senderName;
            // Look for the actual name in nearby elements
            const nameElement = messageContainer.querySelector('.gD') || 
                               messageContainer.querySelector('.go');
            if (nameElement && !nameElement.textContent.includes('@')) {
              senderName = nameElement.textContent.trim();
            }
          }
        }
        
        // Fallback: Look for sender in the "From" field
        if (!senderElement || senderName === 'Unknown') {
          const fromSpan = messageContainer.querySelector('span.go') || 
                          messageContainer.querySelector('.gE .go');
          if (fromSpan) {
            const fromText = fromSpan.textContent.trim();
            if (fromText && !fromText.includes('@')) {
              senderName = fromText;
            }
          }
        }
      }
    }
    
    // Get body from the expanded message
    const bodyElement = expandedMessage || 
                       this.helpers.safeQuerySelector('[data-message-id] [dir="ltr"]') ||
                       this.helpers.safeQuerySelector('.ii.gt div');

    if (!subjectElement || !bodyElement) {
      console.log('Gmail elements not found');
      return null;
    }

    // Clean up sender name - remove any email addresses from it
    if (senderName.includes('<') && senderName.includes('>')) {
      // Extract name from "Name <email@example.com>" format
      senderName = senderName.split('<')[0].trim();
    }

    // Final cleanup
    const finalSender = senderEmail || senderName;
    
    return {
      subject: subjectElement.textContent.trim(),
      sender: senderName !== 'Unknown' ? senderName : finalSender,
      senderEmail: senderEmail,
      body: bodyElement.textContent.trim(),
      timestamp: Date.now()
    };
  }

  extractOutlookData() {
    // Get subject
    const subjectElement = this.helpers.safeQuerySelector('[role="main"] h1') ||
                           this.helpers.safeQuerySelector('.rps_1f73') ||
                           this.helpers.safeQuerySelector('[aria-label*="Subject"]');
    
    // Get sender - look for the sender in the message header area
    let senderElement = null;
    let senderName = 'Unknown';
    
    // Try multiple selectors for Outlook
    senderElement = this.helpers.safeQuerySelector('[data-testid="message-header-sender"]') ||
                    this.helpers.safeQuerySelector('.S6lAB') || // Sender container
                    this.helpers.safeQuerySelector('.OZZZK') || // Alternative sender location
                    this.helpers.safeQuerySelector('.allowTextSelection button[title]'); // Sender button
    
    if (senderElement) {
      senderName = senderElement.textContent.trim();
      // Clean up if it's a button with title
      if (senderElement.hasAttribute('title')) {
        const title = senderElement.getAttribute('title');
        if (title && !title.includes('@')) {
          senderName = title;
        }
      }
    }
    
    // Get body
    const bodyElement = this.helpers.safeQuerySelector('[data-testid="message-body"]') ||
                        this.helpers.safeQuerySelector('.rps_1f74 .allowTextSelection') ||
                        this.helpers.safeQuerySelector('[role="main"] [dir="ltr"]');

    if (!subjectElement || !bodyElement) {
      console.log('Outlook elements not found');
      return null;
    }

    return {
      subject: subjectElement.textContent.trim(),
      sender: senderName,
      body: bodyElement.textContent.trim(),
      timestamp: Date.now()
    };
  }

  getCurrentEmailId() {
    if (this.site.isGmail) {
      return this.getGmailEmailId();
    } else if (this.site.isOutlook) {
      return this.getOutlookEmailId();
    }
    return null;
  }

  getGmailEmailId() {
    // Look for the expanded email message
    const emailElement = this.helpers.safeQuerySelector('.h7:not(.aXjCH)') || // Expanded message
                         this.helpers.safeQuerySelector('[data-message-id]') ||
                         this.helpers.safeQuerySelector('.a3s.aiL') ||
                         this.helpers.safeQuerySelector('.ii.gt');
    
    if (emailElement) {
      const messageId = emailElement.getAttribute('data-message-id') ||
                       emailElement.getAttribute('data-legacy-message-id') ||
                       this.generateEmailIdFromContent();
      return messageId;
    }
    
    return null;
  }

  getOutlookEmailId() {
    const emailElement = this.helpers.safeQuerySelector('[data-testid="message-body"]') ||
                         this.helpers.safeQuerySelector('[role="main"] article');
    
    if (emailElement) {
      const messageId = emailElement.getAttribute('data-testid') ||
                       emailElement.getAttribute('id') ||
                       this.generateEmailIdFromContent();
      return messageId;
    }
    
    return null;
  }

  generateEmailIdFromContent() {
    const subject = this.extractSubject();
    const sender = this.extractSender();
    
    if (subject && sender) {
      const content = subject + sender;
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return 'email_' + Math.abs(hash);
    }
    
    return 'email_' + Date.now();
  }

  extractSubject() {
    if (this.site.isGmail) {
      const subjectEl = this.helpers.safeQuerySelector('[data-legacy-thread-id] h2') || 
                       this.helpers.safeQuerySelector('h2[data-thread-perm-id]') ||
                       this.helpers.safeQuerySelector('.hP');
      return subjectEl ? subjectEl.textContent.trim() : null;
    } else if (this.site.isOutlook) {
      const subjectEl = this.helpers.safeQuerySelector('[role="main"] h1') ||
                       this.helpers.safeQuerySelector('.rps_1f73');
      return subjectEl ? subjectEl.textContent.trim() : null;
    }
    return null;
  }

  extractSender() {
    if (this.site.isGmail) {
      // Get the expanded message container
      const expandedMessage = this.helpers.safeQuerySelector('.h7:not(.aXjCH)') || 
                             this.helpers.safeQuerySelector('.ii.gt');
      
      if (expandedMessage) {
        const messageContainer = expandedMessage.closest('.gs') || expandedMessage.closest('.h7');
        if (messageContainer) {
          const senderEl = messageContainer.querySelector('.gD') || 
                          messageContainer.querySelector('.go .g2');
          if (senderEl) {
            const text = senderEl.textContent.trim();
            // Return name without email if possible
            if (text.includes('<')) {
              return text.split('<')[0].trim();
            }
            return text;
          }
        }
      }
    } else if (this.site.isOutlook) {
      const senderEl = this.helpers.safeQuerySelector('[data-testid="message-header-sender"]') ||
                      this.helpers.safeQuerySelector('.allowTextSelection');
      return senderEl ? senderEl.textContent.trim() : null;
    }
    return null;
  }

  extractReplyContext(currentEmailData) {
    if (currentEmailData) {
      return {
        originalSubject: currentEmailData.subject,
        originalSender: currentEmailData.sender,
        originalBody: currentEmailData.body.substring(0, 500),
        replyType: 'reply'
      };
    }
    return { replyType: 'compose' };
  }
};