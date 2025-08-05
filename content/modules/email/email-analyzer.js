// email-analyzer.js - Email analysis module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.EmailAnalyzer = class {
  constructor() {
    this.api = new window.AIEmailCompanion.BackendAPI();
    this.components = window.AIEmailCompanion.Components;
    this.calendar = new window.AIEmailCompanion.LocalCalendar();
  }

  async analyzeEmail(emailData) {
    try {
      console.log('Analyzing email:', emailData);
      
      // Get all analysis from backend in parallel
      const [intentData, toneData, summaryData, repliesData, attachmentSuggestions, meetingInfo] = await Promise.all([
        this.api.callAPI('/api/email/intent', emailData),
        this.api.callAPI('/api/email/tone', emailData),
        this.api.callAPI('/api/email/summary', emailData),
        this.api.callAPI('/api/reply/quick', emailData),
        this.api.callAPI('/api/attachments/suggest', { emailData }),
        this.api.callAPI('/api/meeting/extract', emailData)
      ]);

      console.log('Email analysis results:', {
        intentData, toneData, summaryData, repliesData, attachmentSuggestions, meetingInfo
      });

      return {
        intentData,
        toneData,
        summaryData,
        repliesData,
        attachmentSuggestions,
        meetingInfo
      };
    } catch (error) {
      console.error('Error analyzing email:', error);
      throw error;
    }
  }

  buildAnalysisUI(analysisResults) {
    const { intentData, toneData, summaryData, repliesData, attachmentSuggestions, meetingInfo } = analysisResults;
    
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'email-analysis';
    
    let html = '<div class="analysis-container">';
    
    // Add header with intent and tone
    html += this.components.createAnalysisHeader(intentData, toneData);
    
    // Add short title
    if (intentData?.data?.shortTitle) {
      html += `
        <div class="email-title-section">
          <h4 class="email-short-title">${intentData.data.shortTitle}</h4>
        </div>
      `;
    }
    
    // Add summary
    html += this.components.createSummarySection(summaryData);
    
    // Add quick replies
    html += this.components.createRepliesSection(repliesData);
    
    // Add meeting section if detected
    html += this.components.createMeetingSection(meetingInfo);
    
    // Add attachment suggestions
    if (attachmentSuggestions?.data?.suggestions?.length > 0) {
      html += `
        <div class="attachments-section">
          <h5 class="section-title">📎 Suggested Attachments</h5>
          <div class="attachment-suggestions">
            ${attachmentSuggestions.data.suggestions.map(suggestion => `
              <div class="attachment-suggestion">
                <span class="suggestion-icon">📄</span>
                <div class="suggestion-details">
                  <span class="suggestion-text">${suggestion.description}</span>
                  <span class="suggestion-reason">${suggestion.reason}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    analysisDiv.innerHTML = html;
    
    return analysisDiv;
  }

  setupEventListeners(analysisElement, emailData, analysisResults) {
    const { repliesData, meetingInfo } = analysisResults;
    
    // Quick reply handlers
    analysisElement.querySelectorAll('.reply-option').forEach(option => {
      option.addEventListener('click', () => {
        const replyIndex = parseInt(option.dataset.replyIndex);
        const replies = repliesData?.data?.replies || [];
        if (replies[replyIndex]) {
          this.insertReply(replies[replyIndex].text);
        }
      });
      
      // Hover effects
      option.addEventListener('mouseenter', () => {
        option.style.borderColor = '#667eea';
        option.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
        option.style.transform = 'translateY(-2px)';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.borderColor = '#e5e7eb';
        option.style.boxShadow = 'none';
        option.style.transform = 'translateY(0)';
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