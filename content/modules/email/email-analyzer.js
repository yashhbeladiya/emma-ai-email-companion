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
// email-analyzer.js - Email analysis module using Groq API
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailAnalyzer = class {
  constructor() {
    console.log('EmailAnalyzer constructor called');
    console.log('Attempting to create GroqAPI instance...');
    
    // Check if GroqAPI exists
    if (!window.AIEmailCompanion.GroqAPI) {
      console.error('GroqAPI not found! Available classes:', Object.keys(window.AIEmailCompanion));
      // Fallback to BackendAPI if GroqAPI is not available
      this.groqAPI = window.AIEmailCompanion.BackendAPI ? new window.AIEmailCompanion.BackendAPI() : null;
      console.log('Using BackendAPI as fallback');
    } else {
      this.groqAPI = new window.AIEmailCompanion.GroqAPI();
      console.log('GroqAPI instance created successfully');
    }
    
    this.components = window.AIEmailCompanion.Components;
    this.calendar = new window.AIEmailCompanion.CalendarIntegration();
    
    // Track current email context for reset functionality
    this.currentEmailContext = null;
    
    // Initialize settings
    this.settings = {};
    this.loadSettings();
    
    // Setup sidebar close listener for reset functionality
    this.setupSidebarResetListener();
  }

  async analyzeEmail(emailData) {
    try {
      // Validate email data first
      if (!emailData || !emailData.subject || !emailData.body) {
        console.warn('Invalid email data received:', emailData);
        return this.getDefaultAnalysisResults();
      }

      console.log('Analyzing email with Groq API:', emailData);
      
      // Get comprehensive analysis from Groq
      const aiAnalysis = await this.groqAPI.analyzeEmail(emailData);
      
      console.log('Groq API analysis results:', aiAnalysis);
      
      // Transform AI response to our format
      return this.transformAIResponse(aiAnalysis, emailData);
      
    } catch (error) {
      console.error('Error analyzing email:', error);
      return this.getDefaultAnalysisResults();
    }
  }

  transformAIResponse(aiAnalysis, emailData) {
    return {
      intentData: {
        success: true,
        data: {
          intent: aiAnalysis.intent,
          confidence: 0.95
        }
      },
      toneData: {
        success: true,
        data: {
          tone: aiAnalysis.tone,
          sentiment: aiAnalysis.sentiment,
          formality: aiAnalysis.contextClues?.formality
        }
      },
      summaryData: {
        success: true,
        data: {
          summary: aiAnalysis.summary.brief,
          points: aiAnalysis.summary.points
        }
      },
      repliesData: {
        success: true,
        data: {
          replies: aiAnalysis.quickReplies.map(reply => ({
            text: reply.text,
            tone: reply.tone,
            intent: reply.intent
          }))
        }
      },
      attachmentSuggestions: {
        success: true,
        data: {
          suggestions: aiAnalysis.attachmentSuggestions.map(att => ({
            description: att.type,
            reason: att.reason
          }))
        }
      },
      meetingInfo: {
        success: true,
        data: {
          hasMeeting: aiAnalysis.meeting.detected,
          ...aiAnalysis.meeting.details,
          description: aiAnalysis.meeting.details?.purpose || 'Meeting detected'
        }
      },
      actionItems: {
        success: true,
        data: {
          actions: aiAnalysis.actionItems.map(item => ({
            text: item.text,
            deadline: item.deadline,
            priority: item.priority,
            link: null
          }))
        }
      },
      // Additional AI insights
      aiInsights: {
        priority: aiAnalysis.priority,
        requiresResponse: aiAnalysis.requiresResponse,
        estimatedResponseTime: aiAnalysis.estimatedResponseTime,
        contextClues: aiAnalysis.contextClues,
        suggestedFollowUp: aiAnalysis.suggestedFollowUp,
        keywords: aiAnalysis.keywords,
        entities: aiAnalysis.entities
      },
      isNoReply: aiAnalysis.isNoReply
    };
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
      aiInsights: {},
      isNoReply: false
    };
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
      attachmentSuggestions, 
      meetingInfo, 
      actionItems,
      aiInsights,
      isNoReply 
    } = analysisResults;
    
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'email-analysis';
    
    let html = '<div class="analysis-container">';
    
    // Generate title from email data
    const emailTitle = this.generateEmailTitle(emailData);
    
    // Priority indicator if high priority
    const priorityBadge = aiInsights?.priority === 'High' ? 
      '<span class="priority-badge high">⚡ High Priority</span>' : '';
    
    const responseTime = aiInsights?.estimatedResponseTime ?
      `<span class="response-time-badge">${aiInsights.estimatedResponseTime}</span>` : '';
    
    html += `
      <div class="email-header-section">
        <div class="email-title-row">
          <h3 class="email-main-title">${emailTitle}</h3>
          ${priorityBadge}
        </div>
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
          <span class="metadata-item tone-badge ${this.getToneClass(toneData?.data?.tone)}">
            ${toneData?.data?.tone || 'Normal'}
          </span>
          ${responseTime}
        </div>
      </div>
    `;
    
    // Check if it's a no-reply email
    if (isNoReply) {
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
      // Add AI insights section if available
      if (aiInsights?.contextClues?.relationship) {
        html += `
          <div class="ai-insights-section">
            <div class="insight-badges">
              ${aiInsights.contextClues.relationship !== 'Unknown' ? 
                `<span class="insight-badge relationship">${this.getRelationshipIcon(aiInsights.contextClues.relationship)} ${aiInsights.contextClues.relationship}</span>` : ''}
              ${aiInsights.requiresResponse ? 
                `<span class="insight-badge response-required">↩️ Response Expected</span>` : ''}
            </div>
          </div>
        `;
      }
      
      // Add summary
      html += this.components.createSummarySection(summaryData);
      
      // Add action items if present
      if (actionItems?.data?.actions?.length > 0) {
        html += this.createEnhancedActionItemsSection(actionItems);
      }
      
            // Add suggested follow-up if present
      if (aiInsights?.suggestedFollowUp?.action) {
        html += this.createFollowUpSection(aiInsights.suggestedFollowUp);
      }
      
      // Add quick replies
      html += this.components.createRepliesSection(repliesData);
    }
    
    // Add meeting section if detected
    if (meetingInfo?.data?.hasMeeting) {
      html += this.createEnhancedMeetingSection(meetingInfo);
    }
    
    // Add attachment suggestions
    if (attachmentSuggestions?.data?.suggestions?.length > 0) {
      html += this.createAttachmentSection(attachmentSuggestions);
    }
    
    // Add keywords/entities if available
    if (aiInsights?.keywords?.length > 0 || aiInsights?.entities) {
      html += this.createKeywordsSection(aiInsights);
    }
    
    html += '</div>';
    analysisDiv.innerHTML = html;
    
    return analysisDiv;
  }

  generateEmailTitle(emailData) {
    if (!emailData || !emailData.subject) {
      return 'Email Analysis';
    }
    
    const subject = emailData.subject || 'Untitled Email';
    const cleanSubject = subject
      .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '')
      .trim();
    
    return cleanSubject.length > 60 ? 
      cleanSubject.substring(0, 57) + '...' : 
      cleanSubject;
  }

  getRelationshipIcon(relationship) {
    const icons = {
      'Colleague': '👥',
      'Client': '💼',
      'Manager': '👔',
      'Friend': '😊',
      'New Contact': '🆕',
      'Unknown': '❓'
    };
    return icons[relationship] || '👤';
  }

  getIntentClass(intent) {
    const intentClasses = {
      'Meeting Request': 'intent-meeting',
      'Question': 'intent-question',
      'Task Assignment': 'intent-task',
      'Request': 'intent-request',
      'Urgent': 'intent-urgent',
      'Thank You': 'intent-thanks',
      'Follow-up': 'intent-followup'
    };
    return intentClasses[intent] || 'intent-general';
  }

  getToneClass(tone) {
    const toneClasses = {
      'Urgent': 'tone-urgent',
      'Friendly': 'tone-friendly',
      'Professional': 'tone-professional',
      'Formal': 'tone-formal',
      'Casual': 'tone-casual',
      'Appreciative': 'tone-appreciative'
    };
    return toneClasses[tone] || 'tone-normal';
  }

  createEnhancedActionItemsSection(actionItems) {
    const actions = actionItems.data.actions;
    
    return `
      <div class="action-items-section enhanced">
        <h5 class="section-title">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v6a4 4 0 01-4 4H6a4 4 0 01-4-4V7a4 4 0 014-4h1a1 1 0 000-2H6z"/>
          </svg>
          Action Items
        </h5>
        <div class="action-items-list">
          ${actions.map((action, index) => `
            <div class="action-item ${action.priority ? `priority-${action.priority.toLowerCase()}` : ''}" data-index="${index}">
              <div class="action-item-main">
                <div class="action-checkbox">
                  <input type="checkbox" id="action-${index}" />
                  <label for="action-${index}"></label>
                </div>
                <span class="action-text">${action.text}</span>
              </div>
              <div class="action-meta">
                ${action.deadline ? `<span class="action-deadline">📅 ${action.deadline}</span>` : ''}
                ${action.priority ? `<span class="action-priority priority-${action.priority.toLowerCase()}">${action.priority}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  createFollowUpSection(followUp) {
    return `
      <div class="followup-section">
        <h5 class="section-title">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
          </svg>
          Suggested Follow-up
        </h5>
        <div class="followup-content">
          <p class="followup-action">${followUp.action}</p>
          <span class="followup-timing">⏰ ${followUp.timing}</span>
        </div>
      </div>
    `;
  }

  createEnhancedMeetingSection(meetingInfo) {
    const details = meetingInfo.data;
    
    return `
      <div class="meeting-section enhanced">
        <h5 class="section-title">📅 Meeting Detected</h5>
        <div class="meeting-info">
          ${details.purpose ? `<p class="meeting-purpose">${details.purpose}</p>` : ''}
          ${details.suggestedTimes?.length > 0 ? `
            <div class="suggested-times">
              <span class="times-label">Suggested times:</span>
              ${details.suggestedTimes.map(time => `<span class="time-chip">${time}</span>`).join('')}
            </div>
          ` : ''}
          ${details.type && details.type !== 'undefined' && details.type !== 'Undefined' && details.type.trim() !== '' ? `<p class="meeting-type">Type: ${details.type}</p>` : ''}
          ${details.duration && details.duration !== 'undefined' && details.duration !== 'Undefined' && details.duration.trim() !== '' ? `<p class="meeting-duration">Duration: ${details.duration}</p>` : ''}
          <button class="add-to-calendar-btn" data-meeting='${JSON.stringify(details)}'>
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Add to Calendar</span>
          </button>
        </div>
      </div>
    `;
  }

  createKeywordsSection(aiInsights) {
    const hasKeywords = aiInsights.keywords?.length > 0;
    const hasEntities = aiInsights.entities && Object.keys(aiInsights.entities).length > 0;
    
    if (!hasKeywords && !hasEntities) return '';
    
    return `
      <div class="keywords-section">
        ${hasKeywords ? `
          <div class="keywords-list">
            <span class="keywords-label">Keywords:</span>
            ${aiInsights.keywords.map(keyword => `<span class="keyword-chip">${keyword}</span>`).join('')}
          </div>
        ` : ''}
        ${hasEntities && aiInsights.entities.people?.length > 0 ? `
          <div class="entities-list">
            <span class="entities-label">People:</span>
            ${aiInsights.entities.people.map(person => `<span class="entity-chip person">👤 ${person}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  createAttachmentSection(attachmentSuggestions) {
    return `
      <div class="attachments-section">
        <h5 class="section-title">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"/>
          </svg>
          Suggested Attachments
        </h5>
        <div class="attachment-suggestions">
          ${attachmentSuggestions.data.suggestions.map(suggestion => `
            <div class="attachment-item">
              <div class="attachment-icon">📎</div>
              <div class="attachment-details">
                <span class="attachment-name">${suggestion.description}</span>
                <span class="attachment-reason">${suggestion.reason}</span>
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
    if (!isNoReply) {
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
    
    // Action item handlers with completion tracking
    analysisElement.querySelectorAll('.action-checkbox input').forEach((checkbox, index) => {
      checkbox.addEventListener('change', (e) => {
        const actionItem = analysisElement.querySelector(`.action-item[data-index="${index}"]`);
        if (e.target.checked) {
          actionItem.classList.add('completed');
          // Could save completion state to storage
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
      composeArea.innerHTML = replyText.replace(/\n/g, '<br>');
      
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      composeArea.dispatchEvent(event);
      
      console.log('Reply inserted:', replyText.substring(0, 50) + '...');
      this.components.showNotification('Quick reply inserted!', 'success');
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

  async loadSettings() {
    try {
      this.settings = await new Promise((resolve) => {
        chrome.storage.sync.get(null, (settings) => {
          resolve({
            autoSummarize: true,
            smartReplies: true,
            toneAssistance: true,
            notifications: true,
            previewMode: true,
            ...settings
          });
        });
      });
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults
      this.settings = {
        autoSummarize: true,
        smartReplies: true,
        toneAssistance: true,
        notifications: true,
        previewMode: true
      };
    }
  }

  setupSidebarResetListener() {
    // Listen for sidebar close events to reset email context
    document.addEventListener('sidebarClosed', () => {
      console.log('Sidebar closed, resetting email context');
      this.resetEmailContext();
    });

    // Also listen for navigation changes (when user switches emails)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if we're in a new email context
          const currentUrl = window.location.href;
          if (this.currentEmailUrl && this.currentEmailUrl !== currentUrl) {
            console.log('Email navigation detected, resetting context');
            this.resetEmailContext();
          }
          this.currentEmailUrl = currentUrl;
        }
      });
    });

    // Observe changes in the email container
    const emailContainer = document.querySelector('body');
    if (emailContainer) {
      observer.observe(emailContainer, { childList: true, subtree: true });
    }

    // Listen for settings updates
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = { ...this.settings, ...event.detail };
      console.log('EmailAnalyzer settings updated:', this.settings);
    });
  }

  resetEmailContext() {
    this.currentEmailContext = null;
    this.currentEmailUrl = null;
    
    // Clear any existing analysis in the sidebar
    const sidebar = document.querySelector('.ai-email-sidebar');
    if (sidebar) {
      const analysisContainer = sidebar.querySelector('.analysis-container');
      if (analysisContainer) {
        analysisContainer.innerHTML = '<div class="empty-state">Select an email to analyze</div>';
      }
    }

    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('emailContextReset'));
  }

  triggerReply() {
    const site = this.detectEmailSite();
    if (site.isGmail) {
      const replyBtn = document.querySelector('[data-tooltip="Reply"]') ||
                      document.querySelector('div[role="button"][aria-label*="Reply"]');
      if (replyBtn) replyBtn.click();
    } else if (site.isOutlook) {
      const replyBtn = document.querySelector('[aria-label*="Reply"]') ||
                      document.querySelector('button[title*="Reply"]');
      if (replyBtn) replyBtn.click();
    }
  }
};