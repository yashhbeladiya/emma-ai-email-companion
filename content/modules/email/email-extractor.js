// email-extractor.js - Email data extraction module
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
    const subjectElement = this.helpers.safeQuerySelector('[data-legacy-thread-id] h2') || 
                           this.helpers.safeQuerySelector('h2[data-thread-perm-id]') ||
                           this.helpers.safeQuerySelector('.hP');
    
    const senderElement = this.helpers.safeQuerySelector('[email]') ||
                          this.helpers.safeQuerySelector('.go .g2');
    
    const bodyElement = this.helpers.safeQuerySelector('[data-message-id] [dir="ltr"]') ||
                        this.helpers.safeQuerySelector('.ii.gt div') ||
                        this.helpers.safeQuerySelector('.a3s.aiL');

    if (!subjectElement || !bodyElement) {
      console.log('Gmail elements not found');
      return null;
    }

    return {
      subject: subjectElement.textContent.trim(),
      sender: senderElement ? (senderElement.getAttribute('email') || senderElement.textContent.trim()) : 'Unknown',
      body: bodyElement.textContent.trim(),
      timestamp: Date.now()
    };
  }

  extractOutlookData() {
    const subjectElement = this.helpers.safeQuerySelector('[role="main"] h1') ||
                           this.helpers.safeQuerySelector('.rps_1f73');
    
    const senderElement = this.helpers.safeQuerySelector('[data-testid="message-header-sender"]') ||
                          this.helpers.safeQuerySelector('.allowTextSelection');
    
    const bodyElement = this.helpers.safeQuerySelector('[data-testid="message-body"]') ||
                        this.helpers.safeQuerySelector('.rps_1f74 .allowTextSelection');

    if (!subjectElement || !bodyElement) {
      console.log('Outlook elements not found');
      return null;
    }

    return {
      subject: subjectElement.textContent.trim(),
      sender: senderElement ? senderElement.textContent.trim() : 'Unknown',
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
    const emailElement = this.helpers.safeQuerySelector('[data-message-id]') ||
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
      const senderEl = this.helpers.safeQuerySelector('[email]') ||
                      this.helpers.safeQuerySelector('.go .g2');
      return senderEl ? (senderEl.getAttribute('email') || senderEl.textContent.trim()) : null;
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