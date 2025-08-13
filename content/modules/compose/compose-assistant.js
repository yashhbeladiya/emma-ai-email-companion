// compose-assistant.js - Enterprise-grade compose assistance module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.ComposeAssistant = class {
  constructor() {
    this.api = new window.AIEmailCompanion.BackendAPI();
    this.helpers = window.AIEmailCompanion.Helpers;
    this.components = window.AIEmailCompanion.Components;
    this.typingTimer = null;
    this.currentContext = null;
    this.currentText = '';
    this.extractionTimer = null;
    this.isProcessing = false;
  }

  setupAssistant(textarea, context = null) {
    this.currentContext = context;
    
    // Auto-open sidebar when composing starts
    textarea.addEventListener('focus', () => {
      console.log('Compose area focused');
      if (window.AIEmailCompanion.main) {
        window.AIEmailCompanion.main.isComposing = true;
        window.AIEmailCompanion.main.sidebar.open(true); // Open in compose mode (left side)
        this.showComposeInterface();
      }
    });

    // Listen for typing to extract content
    textarea.addEventListener('input', () => {
      this.handleComposeInput(textarea);
    });

    textarea.addEventListener('blur', () => {
      // Small delay to avoid closing immediately when clicking sidebar
      setTimeout(() => {
        if (!document.activeElement.closest('.ai-companion-sidebar')) {
          if (window.AIEmailCompanion.main) {
            window.AIEmailCompanion.main.isComposing = false;
          }
        }
      }, 200);
    });
    
    // Watch for compose box closure
    this.watchComposeBox(textarea);
  }

  watchComposeBox(textarea) {
    const composeContainer = textarea.closest('.nH.Hd') || // Gmail
                           textarea.closest('.aSt') || // Gmail alternative
                           textarea.closest('[role="dialog"]'); // Outlook
    
    if (!composeContainer) return;
    
    // Watch for send/close buttons
    const observer = new MutationObserver(() => {
      const sendButton = composeContainer.querySelector('[data-tooltip*="Send"]') ||
                        composeContainer.querySelector('[aria-label*="Send"]') ||
                        composeContainer.querySelector('button[title*="Send"]');
      
      const closeButton = composeContainer.querySelector('[data-tooltip="Save & close"]') ||
                         composeContainer.querySelector('[aria-label*="close"]') ||
                         composeContainer.querySelector('[data-tooltip="Discard draft"]');
      
      if (sendButton && !sendButton.hasAttribute('data-ai-watched')) {
        sendButton.setAttribute('data-ai-watched', 'true');
        sendButton.addEventListener('click', () => {
          console.log('Send button clicked, closing sidebar');
          this.handleComposeClose();
        });
      }
      
      if (closeButton && !closeButton.hasAttribute('data-ai-watched')) {
        closeButton.setAttribute('data-ai-watched', 'true');
        closeButton.addEventListener('click', () => {
          console.log('Close button clicked, closing sidebar');
          this.handleComposeClose();
        });
      }
    });
    
    observer.observe(composeContainer, {
      childList: true,
      subtree: true
    });
  }

  handleComposeClose() {
    if (window.AIEmailCompanion.main) {
      window.AIEmailCompanion.main.isComposing = false;
      window.AIEmailCompanion.main.sidebar.close();
    }
  }

  handleComposeInput(textarea) {
    const text = textarea.textContent || textarea.value || '';
    this.currentText = text;
    
    // Update status to show we're monitoring
    const statusEl = document.querySelector('.compose-status');
    if (statusEl && text.length > 10) {
      statusEl.classList.add('monitoring');
    }
    
    // Clear previous timer
    if (this.extractionTimer) {
      clearTimeout(this.extractionTimer);
    }

    // Set new timer - extract after 10 seconds of no typing
    this.extractionTimer = setTimeout(() => {
      if (text.length > 20 && !this.isProcessing) {
        console.log('Extracting compose content after 10 seconds...');
        this.extractAndSuggest(text);
      }
    }, 10000); // 10 seconds
  }

  async extractAndSuggest(text) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Show processing state
    const suggestionsContainer = document.getElementById('compose-suggestions');
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = `
        <div class="processing-suggestions">
          <div class="processing-icon"></div>
          <p>AI is analyzing your email...</p>
        </div>
      `;
    }
    
    try {
      console.log('Sending compose text to backend for suggestions...', text);
      
      const response = await this.api.callAPI('/api/email/compose', {
        body: text,
        context: this.currentContext
      });

      console.log('Received compose suggestions:', response);

      if (response.success && response.data) {
        this.showComposeSuggestions(response.data);
      }
    } catch (error) {
      console.error('Error getting compose suggestions:', error);
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
      }
    } finally {
      this.isProcessing = false;
    }
  }

  showComposeInterface() {
    const sidebar = window.AIEmailCompanion.main?.sidebar;
    if (!sidebar) return;
    
    const isReply = this.currentContext && this.currentContext.replyType === 'reply';
    
    const interfaceHtml = `
      <div class="compose-interface">
        <div class="compose-header">
          <h3 class="compose-title">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            AI Writing Assistant
          </h3>
          ${isReply ? `
            <div class="reply-context-badge">
              <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 2.5A1.5 1.5 0 013 1h10a1.5 1.5 0 011.5 1.5v6.94L8.697 5.53a.75.75 0 00-1.394 0L1.5 9.44V2.5zm1.5 8.44v.56A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-.56l-5-3.334-5 3.334z"/>
              </svg>
              <span>Reply Mode</span>
            </div>
          ` : ''}
        </div>
        
        <div class="compose-content">
          ${isReply && this.currentContext ? `
            <div class="reply-context-info">
              <div class="context-label">Replying to</div>
              <div class="context-details">
                <div class="context-subject">${this.helpers.cleanText(this.currentContext.originalSubject, 60)}</div>
                <div class="context-from">from ${this.currentContext.originalSender}</div>
              </div>
            </div>
          ` : ''}
          
          <div class="compose-monitoring">
            <div class="compose-status">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div class="status-content">
                <p class="status-title">AI is monitoring your writing</p>
                <p class="status-subtitle">Write naturally - suggestions will appear after 10 seconds of pause</p>
              </div>
            </div>
          </div>
          
          <div id="compose-suggestions" class="compose-suggestions">
            <!-- Suggestions will appear here -->
          </div>
        </div>
        
        <div class="compose-ai-writer">
          <div class="ai-writer-header">
            <h4 class="ai-writer-title">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Quick Email Generator
            </h4>
          </div>
          
          <div class="ai-writer-body">
            <textarea 
              id="compose-prompt" 
              class="compose-prompt-input" 
              placeholder="Describe what you want to write... (e.g., 'Thank them for the meeting and schedule a follow-up next week')"
              rows="3"
            ></textarea>
            
            <button id="generate-email-btn" class="generate-email-btn">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Generate Email</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    sidebar.updateContent(interfaceHtml);
    
    // Setup prompt handler
    this.setupPromptHandler();
  }

  setupPromptHandler() {
    const promptInput = document.getElementById('compose-prompt');
    const generateBtn = document.getElementById('generate-email-btn');
    
    if (promptInput && generateBtn) {
      generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          promptInput.classList.add('error');
          setTimeout(() => promptInput.classList.remove('error'), 500);
          return;
        }
        
        generateBtn.disabled = true;
        generateBtn.classList.add('loading');
        generateBtn.innerHTML = `
          <div class="spinner"></div>
          <span>Generating...</span>
        `;
        
        try {
          console.log('Generating email from prompt:', prompt);

          const response = await this.api.callAPI('/api/email/compose/prompt', {
            body: prompt,
            context: this.currentContext
          });

          console.log('Generated email response:', response);
          
          if (response.success && response.data) {
            this.insertGeneratedEmail(response.data);
            promptInput.value = '';
            this.components.showNotification('Email generated successfully!', 'success');
          }
        } catch (error) {
          console.error('Error generating email:', error);
          this.components.showNotification('Failed to generate email', 'error');
        } finally {
          generateBtn.disabled = false;
          generateBtn.classList.remove('loading');
          generateBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Generate Email</span>
          `;
        }
      });
      
      // Allow Enter to submit (Ctrl/Cmd + Enter)
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          generateBtn.click();
        }
      });
    }
  }

  showComposeSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('compose-suggestions');
    if (!suggestionsContainer) return;
    
    // Ensure we have valid suggestions
    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      suggestionsContainer.innerHTML = '';
      return;
    }
    
    // Create professional suggestion cards
    const suggestionsHtml = `
      <div class="suggestions-header">
        <h5 class="suggestions-title">AI Suggestions</h5>
        <span class="suggestions-badge">${suggestions.length} versions</span>
      </div>
      <div class="suggestions-grid">
        ${suggestions.map((suggestion, index) => `
          <div class="suggestion-card" data-index="${index}">
            <div class="suggestion-card-header">
              <div class="suggestion-tone-indicator tone-${(suggestion.tone || 'professional').toLowerCase()}">
                ${this.getToneIcon(suggestion.tone)}
                <span>${suggestion.tone || 'Professional'}</span>
              </div>
              <button class="use-suggestion-btn" data-index="${index}" title="Use this suggestion">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                </svg>
                <span>Use</span>
              </button>
            </div>
            <div class="suggestion-card-body">
              ${suggestion.subject ? `
                <div class="suggestion-subject">
                  <span class="field-label">Subject:</span>
                  <span class="field-value">${suggestion.subject}</span>
                </div>
              ` : ''}
              <div class="suggestion-preview">
                ${this.helpers.cleanText(suggestion.body, 150)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    suggestionsContainer.innerHTML = suggestionsHtml;
    
    // Add click handlers
    suggestionsContainer.querySelectorAll('.use-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.insertSuggestion(suggestions[index]);
        
        // Visual feedback
        btn.classList.add('success');
        btn.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <span>Applied</span>
        `;
        
        setTimeout(() => {
          btn.classList.remove('success');
          btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
            <span>Use</span>
          `;
        }, 2000);
      });
    });
    
    // Add card click to expand
    suggestionsContainer.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.use-suggestion-btn')) {
          card.classList.toggle('expanded');
        }
      });
    });
  }

  getToneIcon(tone) {
    const icons = {
      'Professional': '💼',
      'Friendly': '😊',
      'Formal': '🎩',
      'Casual': '👋',
      'Urgent': '⚡'
    };
    return icons[tone] || '✉️';
  }

  insertSuggestion(suggestion) {
    // Find subject and body fields
    const site = window.AIEmailCompanion.Helpers.getCurrentSite();
    
    if (site.isGmail) {
      // Gmail subject
      const subjectField = document.querySelector('input[name="subjectbox"]');
      if (subjectField && suggestion.subject) {
        subjectField.value = suggestion.subject;
        subjectField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Gmail body
      const bodyField = document.querySelector('[contenteditable="true"][aria-label*="Message Body"]') ||
                       document.querySelector('[contenteditable="true"][role="textbox"]');
      if (bodyField && suggestion.body) {
        bodyField.innerHTML = suggestion.body.replace(/\n/g, '<br>');
        bodyField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (site.isOutlook) {
      // Similar for Outlook
      // Implementation depends on Outlook's DOM structure
    }
    
    this.components.showNotification('Email suggestion applied!', 'success');
  }

  insertGeneratedEmail(emailData) {
    // Insert the generated email (assumes it has subject and body)
    this.insertSuggestion(emailData);
  }

  generateSubjectFromPrompt(prompt) {
    // Simple subject generation based on prompt
    const words = prompt.toLowerCase().split(' ');
    
    if (words.includes('meeting')) return 'Meeting Follow-up';
    if (words.includes('thank')) return 'Thank You';
    if (words.includes('proposal')) return 'Proposal for Your Review';
    if (words.includes('update')) return 'Project Update';
    
    return 'Following Up';
  }

  generateEmailFromPrompt(prompt, context) {
    // Generate email body based on prompt
    let body = '';
    
    if (context && context.replyType === 'reply') {
      body = `Dear ${context.originalSender},\n\n`;
    } else {
      body = 'Dear [Recipient],\n\n';
    }
    
    // Add main content based on prompt
    body += `${prompt}\n\n`;
    
    // Add closing
    body += 'Best regards,\n[Your Name]';
    
    return body;
  }

  updateContext(context) {
    this.currentContext = context;
    
    // Update UI if showing
    const replyContextEl = document.querySelector('.reply-context-info');
    if (replyContextEl && context && context.replyType === 'reply') {
      replyContextEl.style.display = 'block';
      const subjectEl = replyContextEl.querySelector('.context-subject');
      const fromEl = replyContextEl.querySelector('.context-from');
      
      if (subjectEl) subjectEl.textContent = this.helpers.cleanText(context.originalSubject, 60);
      if (fromEl) fromEl.textContent = `from ${context.originalSender}`;
    }
  }
};