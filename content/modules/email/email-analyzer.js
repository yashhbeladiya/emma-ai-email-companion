/**
 * Email Analysis Module
 * 
 * Core analysis engine that processes emails using AI services and generates
 * comprehensive insights including intent, tone, summaries, and actionable items.
 * 
 * Features:
 * - AI-powered email analysis (intent, tone, sentiment)
 * - Smart summarization of email content
 * - Action item extraction and tracking
 * - Quick reply generation
 * - Meeting detection and calendar integration
 * - Attachment suggestions
 * - No-reply email detection
 * - Enterprise-grade error handling
 * - Responsive UI generation
 * 
 * Analysis Types:
 * - Intent Classification (meeting, question, task, etc.)
 * - Tone Analysis (formal, casual, urgent, etc.)
 * - Content Summarization
 * - Action Item Extraction
 * - Meeting Information Extraction
 * - Reply Suggestions Generation
 * 
 * @class EmailAnalyzer
 * @version 2.0.0
 * @author Emma AI Team
 */

// email-analyzer.js - Email analysis module with enterprise-grade error handling
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailAnalyzer = class {
  constructor() {
    this.api = new window.AIEmailCompanion.BackendAPI();
    this.components = window.AIEmailCompanion.Components;
    this.calendar = new window.AIEmailCompanion.LocalCalendar();
  }

  async analyzeEmail(emailData) {
    try {
      // Validate email data first
      if (!emailData || !emailData.subject || !emailData.body) {
        console.warn('Invalid email data received:', emailData);
        return this.getDefaultAnalysisResults();
      }

      console.log('Analyzing email:', emailData);
      
      // Check if it's a no-reply email first
      if (this.isNoReplyEmail(emailData)) {
        return {
          isNoReply: true,
          intentData: { data: { intent: 'Automated' } },
          toneData: { data: { tone: 'System' } },
          summaryData: { data: { points: this.generateSummaryPoints(emailData) } }
        };
      }
      
      // Get all analysis from backend in parallel
      const [intentData, toneData, summaryData, repliesData, meetingInfo, actionItems] = await Promise.all([
        this.api.callAPI('/api/email/intent', emailData),
        this.api.callAPI('/api/email/tone', emailData),
        this.api.callAPI('/api/email/summary', emailData),
        this.api.callAPI('/api/reply/quick', emailData),
        this.api.callAPI('/api/meeting/extract', emailData),
        this.api.callAPI('/api/action', emailData)
      ]);

      console.log('Email analysis results:', {
        intentData, toneData, summaryData, repliesData, meetingInfo, actionItems
      });

      return {
        intentData,
        toneData,
        summaryData,
        repliesData,
        meetingInfo,
        actionItems,
        isNoReply: false
      };
    } catch (error) {
      console.error('Error analyzing email:', error);
      return this.getDefaultAnalysisResults();
    }
  }

  getDefaultAnalysisResults() {
    return {
      intentData: { data: { intent: 'General' } },
      toneData: { data: { tone: 'Professional' } },
      summaryData: { data: { points: ['Unable to analyze email content'] } },
      repliesData: { data: { replies: [] } },
      attachmentSuggestions: { data: { suggestions: [] } },
      meetingInfo: { data: { hasMeeting: false } },
      actionItems: { data: { actions: [] } },
      isNoReply: false
    };
  }

  capitalizeWord(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  generateSummaryPoints(emailData) {
    if (!emailData || !emailData.body) return ['Email content not available'];
    
    const sentences = emailData.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return [emailData.subject || 'Email received'];
    
    return sentences.slice(0, 3).map(s => s.trim());
  }

  buildAnalysisUI(analysisResults, emailData) {
    // Ensure we have valid data
    if (!emailData) {
      emailData = { subject: 'Unknown', sender: 'Unknown', body: '' };
    }

    const { 
      intentData, 
      toneData, 
      summaryData, 
      repliesData,
      meetingInfo, 
      actionItems,
      isNoReply 
    } = analysisResults;
    
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'email-analysis';
    
    let html = '<div class="analysis-container">';
    
    // Generate title from email data
    const emailTitle = this.generateEmailTitle(emailData);
    
    html += `
      <div class="email-header-section">
        <h3 class="email-main-title">${emailTitle}</h3>
        <div class="email-metadata">
          <span class="metadata-item sender-info">
            <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"/>
            </svg>
            ${emailData.sender || 'Unknown Sender'}
          </span>
          <span class="metadata-item intent-badge ${this.getIntentClass(intentData?.data?.intent)}">
            ${window.AIEmailCompanion.Constants.INTENT_EMOJIS[intentData?.data?.intent] || '📧'} ${intentData?.data?.intent || 'Email'}
          </span>
          <span class="metadata-item tone-badge ${this.getToneClass(toneData?.data?.emotions.primary)}">
            ${this.capitalizeWord(toneData?.data?.emotions.primary) || 'Normal'}
          </span>
        </div>
      </div>
    `;
    
    // Check if it's a no-reply email
    if (isNoReply || this.isNoReplyEmail(emailData)) {
      html += `
        <div class="no-reply-notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
            <h4 class="notice-title">Automated Notification</h4>
          </div>
          <p class="notice-text">This is an automated email from a no-reply address. Quick replies are not available, but you can still review the content below.</p>
        </div>
      `;
      
      // Still show summary for no-reply emails
      html += this.components.createSummarySection(summaryData);
    } else {
      // Add summary
      html += this.components.createSummarySection(summaryData);
      
      // Add action items if present
      if (actionItems?.data?.action_items?.length > 0) {
        html += this.createActionItemsSection(actionItems);
      }
      
      // Add quick replies
      html += this.components.createRepliesSection(repliesData);
    }
    
    // Add meeting section if detected
    if (meetingInfo?.data?.hasMeeting) {
      html += this.components.createMeetingSection(meetingInfo);
    }
    
    // Add attachment suggestions
    if (actionItems?.data?.attachments.length > 0) {
      html += this.createAttachmentSection(actionItems);
    }
    
    html += '</div>';
    analysisDiv.innerHTML = html;
    
    return analysisDiv;
  }

  generateEmailTitle(emailData) {
    // Safe access to email data
    if (!emailData || !emailData.subject) {
      return 'Email Analysis';
    }

    console.log('Generating title for email:', emailData.subject);
    
    // Clean and truncate subject for title
    const subject = emailData.subject || 'Untitled Email';
    const cleanSubject = subject
      .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '') // Remove common prefixes
      .trim();
    
    // Truncate if too long
    return cleanSubject.length > 60 ? 
      cleanSubject.substring(0, 57) + '...' : 
      cleanSubject;
  }

  isNoReplyEmail(emailData) {
    if (!emailData) return false;
    
    const sender = (emailData.sender || '').toLowerCase();
    const senderEmail = (emailData.senderEmail || '').toLowerCase();
    const subject = (emailData.subject || '').toLowerCase();
    const body = (emailData.body || '').toLowerCase();
    
    // Strong indicators that this IS a no-reply email
    const noReplyPatterns = [
      'no-reply@', 'noreply@', 'do-not-reply@', 'donotreply@',
      'no_reply@', 'do_not_reply@', 'mailer-daemon@',
      'postmaster@', 'auto-confirm@', 'auto-notification@',
      'notifications@', 'alert@', 'alerts@', 'system@',
      'automated@', 'auto@', 'info@', 'news@', 'newsletter@'
    ];
    
    // Check if sender email matches no-reply patterns
    const isNoReplyEmail = noReplyPatterns.some(pattern => 
      senderEmail.includes(pattern) || sender.includes(pattern)
    );
    
    // Also check if sender name itself contains these keywords
    const noReplyNamePatterns = [
      'no-reply', 'noreply', 'do-not-reply', 'donotreply',
      'system notification', 'automated message', 'auto-generated'
    ];
    
    const isNoReplyName = noReplyNamePatterns.some(pattern => 
      sender.includes(pattern)
    );
    
    // Check for human indicators that suggest this IS a reply-able email
    const humanIndicators = [
      'hi ', 'hello ', 'dear ', 'hey ', 
      'thanks', 'thank you', 'cheers', 'regards',
      'it was great', 'nice to meet', 'enjoyed our',
      'would love to', 'let me know', 'looking forward',
      'coffee', 'lunch', 'meeting', 'chat'
    ];
    
    const hasHumanIndicators = humanIndicators.some(indicator => 
      body.includes(indicator) || subject.includes(indicator)
    );
    
    // If we have human indicators, it's likely NOT a no-reply email
    // even if the sender email looks automated
    if (hasHumanIndicators && !isNoReplyName) {
      return false;
    }
    
    // Check if it's clearly an automated notification
    const automatedPatterns = [
      'your order', 'order confirmation', 'payment receipt',
      'invoice #', 'transaction', 'subscription',
      'password reset', 'verify your email', 'account verification'
    ];
    
    const isAutomatedContent = automatedPatterns.some(pattern => 
      subject.includes(pattern) || body.substring(0, 200).includes(pattern)
    );
    
    // Final decision: It's a no-reply if:
    // 1. Email address is clearly no-reply AND no human indicators, OR
    // 2. Sender name indicates no-reply, OR  
    // 3. It's automated content with a system-like email
    return (isNoReplyEmail && !hasHumanIndicators) || 
           isNoReplyName || 
           (isAutomatedContent && (isNoReplyEmail || sender.includes('@')));
  }

  getIntentClass(intent) {
    const intentClasses = {
      'Meeting Request': 'intent-meeting',
      'Question': 'intent-question',
      'Task Assignment': 'intent-task',
      'Urgent': 'intent-urgent',
      'Automated': 'intent-automated'
    };
    return intentClasses[intent] || 'intent-general';
  }

  getToneClass(tone) {
    const toneClasses = {
      'Urgent': 'tone-urgent',
      'Friendly': 'tone-friendly',
      'Professional': 'tone-professional',
      'Formal': 'tone-formal',
      'System': 'tone-system'
    };
    return toneClasses[tone] || 'tone-normal';
  }

  createActionItemsSection(actionItems) {
    const actions = actionItems.data.action_items || [];
    console.log('Creating action items section with actions:', actions);
    
    return `
      <div class="action-items-section">
        <h5 class="section-title">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v6a4 4 0 01-4 4H6a4 4 0 01-4-4V7a4 4 0 014-4h1a1 1 0 000-2H6z"/>
          </svg>
          Action Items
        </h5>
        <div class="action-items-list">
          ${actions.map((action, index) => `
            <div class="action-item" data-index="${index}">
              <div class="action-checkbox">
                <input type="checkbox" id="action-${index}" />
                <label for="action-${index}"></label>
              </div>
              <div class="action-content">
                <span class="action-text">${action.task}</span>
                ${action.link ? `<a href="${action.link}" class="action-link" target="_blank">Open →</a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  createAttachmentSection(actionItems) {
    return `
      <div class="attachments-section">
        <h5 class="section-title">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"/>
          </svg>
          Suggested Attachments
        </h5>
        <div class="attachment-suggestions">
          ${actionItems.data.attachments.map(attachment => `
            <div class="attachment-item">
              <div class="attachment-icon">📎</div>
              <div class="attachment-details">
                <span class="attachment-name">${attachment.description}</span>
                <span class="attachment-reason">${attachment.reason}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEventListeners(analysisElement, emailData, analysisResults) {
    const { repliesData, meetingInfo, actionItems, isNoReply } = analysisResults;
    
    // Don't setup reply handlers for no-reply emails
    if (!isNoReply && !this.isNoReplyEmail(emailData)) {
      // Quick reply handlers
      analysisElement.querySelectorAll('.reply-option').forEach(option => {
        option.addEventListener('click', () => {
          const replyIndex = parseInt(option.dataset.replyIndex);
          const replies = repliesData?.data?.replies || [];
          if (replies[replyIndex]) {
            this.insertReply(replies[replyIndex].text);
          }
        });
      });
    }
    
    // Action item handlers
    analysisElement.querySelectorAll('.action-checkbox input').forEach((checkbox, index) => {
      checkbox.addEventListener('change', (e) => {
        const actionItem = analysisElement.querySelector(`.action-item[data-index="${index}"]`);
        if (e.target.checked) {
          actionItem.classList.add('completed');
        } else {
          actionItem.classList.remove('completed');
        }
      });
    });
    
    // Add to calendar handler
    const calendarBtn = analysisElement.querySelector('.add-to-calendar-btn');
    if (calendarBtn && meetingInfo?.data?.hasMeeting) {
      calendarBtn.addEventListener('click', async () => {
        try {
          const meetingData = JSON.parse(calendarBtn.dataset.meeting);
          const event = await this.calendar.createEventFromEmail(emailData, meetingData);
          this.components.showNotification('Meeting added to calendar!', 'success');
          calendarBtn.disabled = true;
          calendarBtn.textContent = 'Added to Calendar';
        } catch (error) {
          console.error('Error adding to calendar:', error);
          this.components.showNotification('Failed to add to calendar', 'error');
        }
      });
    }
  }

  insertReply(replyText) {
    const site = window.AIEmailCompanion.Helpers.getCurrentSite();
    let composeArea = null;
    
    if (site.isGmail) {
      composeArea = document.querySelector('[contenteditable="true"][aria-label*="Message Body"]') ||
                   document.querySelector('[contenteditable="true"]');
    } else if (site.isOutlook) {
      composeArea = document.querySelector('[contenteditable="true"][role="textbox"]') ||
                   document.querySelector('[contenteditable="true"]');
    }

    if (composeArea) {
      composeArea.focus();
      composeArea.innerHTML = replyText;
      
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      composeArea.dispatchEvent(event);
      
      console.log('Reply inserted:', replyText.substring(0, 50) + '...');
    } else {
      this.openReplyWindow();
      setTimeout(() => {
        this.insertReply(replyText);
      }, 1000);
    }
  }

  openReplyWindow() {
    const site = window.AIEmailCompanion.Helpers.getCurrentSite();
    
    if (site.isGmail) {
      const replyBtn = document.querySelector('[data-tooltip="Reply"]') ||
                      document.querySelector('[aria-label*="Reply"]');
      if (replyBtn) replyBtn.click();
    } else if (site.isOutlook) {
      const replyBtn = document.querySelector('[aria-label*="Reply"]') ||
                      document.querySelector('button[title*="Reply"]');
      if (replyBtn) replyBtn.click();
    }
  }
};