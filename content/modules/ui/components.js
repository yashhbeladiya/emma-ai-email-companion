// components.js - Reusable UI components
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.Components = {
  createLoadingState(text = 'Ready to assist with your emails') {
    const loadingState = document.createElement('div');
    loadingState.className = 'loading-state';
    
    const spinnerContainer = document.createElement('div');
    spinnerContainer.style.cssText = 'position: relative;';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    const innerPulse = document.createElement('div');
    innerPulse.className = 'inner-pulse';
    
    spinner.appendChild(innerPulse);
    spinnerContainer.appendChild(spinner);
    
    const loadingText = document.createElement('p');
    loadingText.className = 'loading-text';
    loadingText.textContent = text;
    
    loadingState.appendChild(spinnerContainer);
    loadingState.appendChild(loadingText);
    
    return loadingState;
  },

  createErrorState(retryCallback) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
      <p>Unable to analyze email. Please try again.</p>
      <button class="retry-btn btn btn-primary">Retry Analysis</button>
    `;
    
    if (retryCallback) {
      const retryBtn = errorDiv.querySelector('.retry-btn');
      retryBtn.addEventListener('click', retryCallback);
    }
    
    return errorDiv;
  },

  createAnalysisHeader(intentData, toneData) {
    const constants = window.AIEmailCompanion.Constants;
    const intent = (intentData?.data?.intent) || constants.EMAIL_INTENTS.GENERAL;
    const tone = (toneData?.data?.tone) || constants.EMAIL_TONES.NORMAL;
    
    return `
      <div class="analysis-header">
        <div class="intent-tone-badges">
          <div class="badge badge-intent">
            <span class="badge-emoji">${constants.INTENT_EMOJIS[intent]}</span>
            <span class="badge-text">${intent}</span>
          </div>
          <div class="badge badge-tone">
            <span class="badge-emoji">${constants.TONE_EMOJIS[tone]}</span>
            <span class="badge-text">${tone}</span>
          </div>
        </div>
      </div>
    `;
  },

  createSummarySection(summaryData) {
    const summary = summaryData?.data?.summary
    const points = [summary] || ['No summary available'];
    console.log('Summary points:', points);

    return `
      <div class="summary-section">
        <h5 class="section-title">📋 Key Points</h5>
        <div class="summary-points">
          ${points.map(point => `
            <div class="summary-point">
              <span class="point-bullet">•</span>
              <span class="point-text">${point}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  createRepliesSection(repliesData) {
    const replies = repliesData?.data?.replies || [];
    
    if (replies.length === 0) return '';
    
    return `
      <div class="replies-section">
        <h5 class="section-title">💬 Quick Replies</h5>
        <div class="reply-options">
          ${replies.map((reply, index) => `
            <div class="reply-option" data-reply-index="${index}">
              <p class="reply-text">${reply.text}</p>
              <span class="reply-tone">${reply.tone}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  createMeetingSection(meetingInfo, emailData) {
    if (!meetingInfo?.data?.hasMeeting) return '';
    
    return `
      <div class="meeting-section">
        <h5 class="section-title">📅 Meeting Detected</h5>
        <div class="meeting-info">
          <p class="meeting-details">${meetingInfo.data.description}</p>
          <button class="add-to-calendar-btn btn btn-success" data-meeting='${JSON.stringify(meetingInfo.data)}'>
            <span>Add to Calendar</span>
          </button>
        </div>
      </div>
    `;
  },

  createComposeStatus(context) {
    return `
      <div class="compose-assistant-section">
        <h4 class="section-title">✍️ Compose Assistant</h4>
        <div class="compose-status">
          <p class="status-text">Start typing to get AI suggestions...</p>
          <div class="typing-indicator">
            <span class="indicator-dot"></span>
            <span class="indicator-dot"></span>
            <span class="indicator-dot"></span>
          </div>
        </div>
        ${context ? `
          <div class="context-info">
            <p class="context-title">Replying to:</p>
            <p class="context-subject">${context.originalSubject}</p>
            <p class="context-sender">From: ${context.originalSender}</p>
          </div>
        ` : ''}
      </div>
    `;
  },

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `ai-notification ai-notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};