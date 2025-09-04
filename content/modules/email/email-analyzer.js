// email-analyzer.js - Email analysis module with proper error handling
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailAnalyzer = class {
  constructor() {
    console.log('EmailAnalyzer constructor called');
    
    if (!window.AIEmailCompanion.GroqAPI) {
      console.error('GroqAPI not found! Available classes:', Object.keys(window.AIEmailCompanion));
      this.groqAPI = window.AIEmailCompanion.BackendAPI ? new window.AIEmailCompanion.BackendAPI() : null;
      console.log('Using BackendAPI as fallback');
    } else {
      this.groqAPI = new window.AIEmailCompanion.GroqAPI();
      console.log('GroqAPI instance created successfully');
    }
    
    this.components = window.AIEmailCompanion.Components;
    // Check if CalendarIntegration exists before creating
    if (window.AIEmailCompanion.CalendarIntegration) {
      this.calendar = new window.AIEmailCompanion.CalendarIntegration();
    } else {
      console.warn('CalendarIntegration not found, creating fallback');
      this.calendar = {
        createEventFromEmail: (emailData, meetingInfo) => {
          window.open('https://calendar.google.com/calendar', '_blank');
          return { success: true };
        }
      };
    }
    this.currentEmailContext = null;
    this.settings = {};
    this.extensionValid = true;
    this.loadSettings();
    this.setupSidebarResetListener();
  }

  async loadSettings() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, using default settings');
        this.extensionValid = false;
        this.settings = this.getDefaultSettings();
        return;
      }

      this.settings = await new Promise((resolve, reject) => {
        try {
          chrome.storage.sync.get(null, (settings) => {
            // Check for chrome.runtime.lastError
            if (chrome.runtime.lastError) {
              console.warn('Storage error:', chrome.runtime.lastError);
              resolve(this.getDefaultSettings());
            } else {
              resolve({
                ...this.getDefaultSettings(),
                ...settings
              });
            }
          });
        } catch (error) {
          console.warn('Error accessing storage:', error);
          resolve(this.getDefaultSettings());
        }
      });
      
      console.log('Settings loaded in EmailAnalyzer:', this.settings);
    } catch (error) {
      console.warn('Error loading settings, using defaults:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      keyPoints: true,
      quickReplies: true,
      composeAssistant: true,
      emailAnalysis: true,
      meetingDetection: true
    };
  }

  checkExtensionContext() {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      this.extensionValid = false;
      // Show notification to user
      if (this.components) {
        this.showReloadNotification();
      }
      return false;
    }
    return true;
  }

  showReloadNotification() {
    // Create a notification that persists
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      z-index: 2147483649;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Emma Extension Updated</div>
      <div style="margin-bottom: 12px;">Please refresh this page to continue using Emma.</div>
      <button onclick="location.reload()" style="
        background: white;
        color: #ef4444;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        font-size: 13px;
      ">Refresh Page</button>
    `;
    
    document.body.appendChild(notification);
  }

  async analyzeEmail(emailData) {
    try {
      if (!this.checkExtensionContext()) {
        return this.getDefaultAnalysisResults();
      }

      if (!emailData || !emailData.subject || !emailData.body) {
        console.warn('Invalid email data received:', emailData);
        return this.getDefaultAnalysisResults();
      }

      console.log('Analyzing email with Groq API:', emailData);
      const aiAnalysis = await this.groqAPI.analyzeEmail(emailData);
      console.log('Groq API analysis results:', aiAnalysis);
      return this.transformAIResponse(aiAnalysis, emailData);
      
    } catch (error) {
      console.error('Error analyzing email:', error);
      return this.getDefaultAnalysisResults();
    }
  }

  buildAnalysisUI(analysisResults, emailData) {
    // Reload settings before building UI if extension is still valid
    if (this.extensionValid && this.checkExtensionContext()) {
      this.loadSettings().then(() => {
        console.log('Settings reloaded for UI build:', this.settings);
      }).catch(() => {
        console.log('Using cached settings');
      });
    }
    
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
    
    const emailTitle = this.generateEmailTitle(emailData);
    const priorityBadge = aiInsights?.priority === 'High' ? 
      '<span class="priority-badge high">⚡ High Priority</span>' : '';
    const responseTime = aiInsights?.estimatedResponseTime ?
      `<span class="response-time-badge">${aiInsights.estimatedResponseTime}</span>` : '';
    
    // Always show email header
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
    `;
    
    // Only show intent and tone badges if email analysis is enabled
    if (this.settings.emailAnalysis !== false) {
      html += `
        <span class="metadata-item intent-badge ${this.getIntentClass(intentData?.data?.intent)}">
          ${window.AIEmailCompanion.Constants.INTENT_EMOJIS[intentData?.data?.intent] || '📧'} ${intentData?.data?.intent || 'Email'}
        </span>
        <span class="metadata-item tone-badge ${this.getToneClass(toneData?.data?.tone)}">
          ${toneData?.data?.tone || 'Normal'}
        </span>
      `;
    }
    
    html += `
          ${responseTime}
        </div>
      </div>
    `;
    
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
          <p class="notice-text">This is an automated email from a no-reply address. Quick replies are not available.</p>
        </div>
      `;
      
      // Show summary only if keyPoints is enabled
      if (this.settings.keyPoints !== false) {
        html += this.components.createSummarySection(summaryData);
      }
    } else {
      // Add AI insights section if email analysis is enabled
      if (this.settings.emailAnalysis !== false && aiInsights?.contextClues?.relationship) {
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
      
      // Add summary only if keyPoints is enabled
      if (this.settings.keyPoints !== false) {
        html += this.components.createSummarySection(summaryData);
      }
      
      // Add action items if present
      if (actionItems?.data?.actions?.length > 0) {
        html += this.createEnhancedActionItemsSection(actionItems);
      }
      
      // Add suggested follow-up if present
      if (aiInsights?.suggestedFollowUp?.action) {
        html += this.createFollowUpSection(aiInsights.suggestedFollowUp);
      }
      
      // Add quick replies only if quickReplies is enabled
      if (this.settings.quickReplies !== false) {
        html += this.components.createRepliesSection(repliesData);
      }
    }
    
    // Add meeting section only if meetingDetection is enabled
    if (this.settings.meetingDetection !== false && meetingInfo?.data?.hasMeeting) {
      html += this.createEnhancedMeetingSection(meetingInfo);
    }
    
    // Add attachment suggestions
    if (attachmentSuggestions?.data?.suggestions?.length > 0) {
      html += this.createAttachmentSection(attachmentSuggestions);
    }
    
    // Add keywords/entities if available and email analysis is enabled
    if (this.settings.emailAnalysis !== false && (aiInsights?.keywords?.length > 0 || aiInsights?.entities)) {
      html += this.createKeywordsSection(aiInsights);
    }
    
    html += '</div>';
    analysisDiv.innerHTML = html;
    
    return analysisDiv;
  }

  setupEventListeners(analysisElement, emailData, analysisResults) {
    const { repliesData, meetingInfo, actionItems, isNoReply } = analysisResults;
    
    // Only setup reply handlers if quickReplies is enabled and not a no-reply email
    if (this.settings.quickReplies !== false && !isNoReply) {
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
    
    // Add to calendar handler only if meetingDetection is enabled
    if (this.settings.meetingDetection !== false) {
      const calendarBtn = analysisElement.querySelector('.add-to-calendar-btn');
      if (calendarBtn && meetingInfo?.data?.hasMeeting) {
        calendarBtn.addEventListener('click', async () => {
          try {
            const meetingData = JSON.parse(calendarBtn.dataset.meeting);
            const event = await this.calendar.createEventFromEmail(emailData, meetingData);
            this.components.showNotification('Opening calendar with meeting details...', 'success');
            calendarBtn.disabled = true;
            calendarBtn.textContent = 'Opening Calendar...';
            
            // Re-enable after a few seconds
            setTimeout(() => {
              calendarBtn.disabled = false;
              calendarBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Add to Calendar</span>
              `;
            }, 3000);
          } catch (error) {
            console.error('Error adding to calendar:', error);
            this.components.showNotification('Failed to open calendar', 'error');
          }
        });
      }
    }
  }

  setupSidebarResetListener() {
    document.addEventListener('sidebarClosed', () => {
      console.log('Sidebar closed, resetting email context');
      this.resetEmailContext();
    });

    // Listen for settings updates
    document.addEventListener('settingsUpdated', async (event) => {
      this.settings = { ...this.settings, ...event.detail };
      console.log('EmailAnalyzer settings updated:', this.settings);
      
      // Only refresh UI if extension context is valid
      if (this.checkExtensionContext() && window.AIEmailCompanion.main?.sidebar?.isOpen() && window.AIEmailCompanion.main.currentEmailData) {
        // Re-analyze and rebuild UI with new settings
        const emailData = window.AIEmailCompanion.main.currentEmailData;
        const analysisResults = await this.analyzeEmail(emailData);
        const analysisUI = this.buildAnalysisUI(analysisResults, emailData);
        window.AIEmailCompanion.main.sidebar.updateContent(analysisUI);
        this.setupEventListeners(analysisUI, emailData, analysisResults);
      }
    });
  }

  // Keep all other methods the same...
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

  resetEmailContext() {
    this.currentEmailContext = null;
    this.currentEmailUrl = null;
    
    const sidebar = document.querySelector('.ai-email-sidebar');
    if (sidebar) {
      const analysisContainer = sidebar.querySelector('.analysis-container');
      if (analysisContainer) {
        analysisContainer.innerHTML = '<div class="empty-state">Select an email to analyze</div>';
      }
    }

    document.dispatchEvent(new CustomEvent('emailContextReset'));
  }
};