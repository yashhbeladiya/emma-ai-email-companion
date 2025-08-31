/**
 * Compose Assistant Module
 * 
 * Provides intelligent writing assistance during email composition.
 * Offers real-time suggestions, tone analysis, and contextual improvements
 * to enhance email communication quality and effectiveness.
 * 
 * Features:
 * - Real-time composition analysis
 * - Tone and style suggestions
 * - Context-aware reply assistance
 * - Smart text completion
 * - Template generation
 * - Grammar and clarity improvements
 * - Professional formatting
 * - Multi-platform integration
 * 
 * Assistance Types:
 * - Reply Context Analysis
 * - Tone Matching
 * - Professional Templates
 * - Smart Suggestions
 * - Auto-completion
 * - Style Improvements
 * 
 * Integration:
 * - Gmail compose interface
 * - Outlook compose interface
 * - Real-time typing detection
 * - Background processing
 * 
 * @class ComposeAssistant
 * @version 2.0.0
 * @author Emma AI Team
 */

// compose-assistant.js - Enterprise-grade compose assistance module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.ComposeAssistant = class {
  constructor() {
    this.groqAPI = new window.AIEmailCompanion.GroqAPI();
    this.helpers = window.AIEmailCompanion.Helpers;
    this.components = window.AIEmailCompanion.Components;
    this.typingTimer = null;
    this.currentContext = null;
    this.currentText = '';
    this.extractionTimer = null;
    this.isProcessing = false;
  }

  setupAssistant(textarea, context = null) {
    // Clear any previous context first
    this.currentContext = null;
    
    // Only set context if it's explicitly a reply with valid data
    const isValidReply = context && context.replyType === 'reply' && 
                        context.originalSubject && context.originalSender &&
                        context.originalSubject !== 'No subject' && context.originalSender !== 'Sender';
    
    if (isValidReply) {
      this.currentContext = context;
    }
    
    console.log('Setting up compose assistant:', isValidReply ? 'Reply mode' : 'New compose mode');
    console.log('Context:', this.currentContext);
    
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
    // Clear all compose data when closing
    this.currentContext = null;
    this.currentText = '';
    this.isProcessing = false;
    
    // Clear any timers
    if (this.extractionTimer) {
      clearTimeout(this.extractionTimer);
      this.extractionTimer = null;
    }
    
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    // Reset the sidebar header back to normal
    const headerTitle = document.querySelector('.sidebar-title');
    if (headerTitle) {
      headerTitle.innerHTML = 'Emma: Email Assistant <span class="sparkle">✨</span>';
    }
    
    // Clear the sidebar content
    if (window.AIEmailCompanion.main) {
      window.AIEmailCompanion.main.isComposing = false;
      window.AIEmailCompanion.main.sidebar.close();
      
      // Reset sidebar to default state
      const sidebar = window.AIEmailCompanion.main.sidebar;
      if (sidebar) {
        const content = sidebar.getContentElement();
        if (content) {
          content.innerHTML = '';
        }
      }
    }
    
    console.log('Compose closed and data cleared');
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
      console.log('Getting compose suggestions from Groq API...');
      
      const suggestions = await this.groqAPI.generateComposeSuggestions(text, this.currentContext);
      
      if (suggestions && suggestions.length > 0) {
        this.showComposeSuggestions(suggestions);
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
    
    // Update header to show compose mode
    const headerTitle = document.querySelector('.sidebar-title');
    if (headerTitle) {
      headerTitle.innerHTML = 'Emma - Compose Assistant <span class="sparkle">✨</span>';
    }
    
    const isReply = this.currentContext && this.currentContext.replyType === 'reply';
    
    const interfaceHtml = `
      <div class="compose-interface">
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
            
            <!-- Generated Content Preview Section -->
            <div id="generated-preview" class="generated-preview" style="display: none;">
              <div class="preview-header">
                <h5 class="preview-title">Generated Content</h5>
                <div class="preview-actions">
                  <button id="regenerate-btn" class="preview-btn regenerate-btn">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Regenerate
                  </button>
                  <button id="use-generated-btn" class="preview-btn use-btn">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Use This Content
                  </button>
                </div>
              </div>
              <div class="preview-content">
                <div class="preview-subject">
                  <label>Subject:</label>
                  <div id="preview-subject-text" class="preview-text"></div>
                </div>
                <div class="preview-body">
                  <label>Body:</label>
                  <div id="preview-body-text" class="preview-text"></div>
                </div>
              </div>
            </div>
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
    const previewSection = document.getElementById('generated-preview');
    const previewSubject = document.getElementById('preview-subject-text');
    const previewBody = document.getElementById('preview-body-text');
    const useBtn = document.getElementById('use-generated-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');
    
    let currentGeneratedData = null;
    
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
          const emailData = await this.groqAPI.generateEmailFromPrompt(prompt, this.currentContext);
          
          if (emailData) {
            currentGeneratedData = emailData;
            
            // Check if preview mode is enabled
            const settings = await this.getSettings();
            const previewModeEnabled = settings.previewMode !== false; // Default to true if not set
            
            if (previewModeEnabled && previewSection) {
              // Show in preview section
              previewSubject.textContent = emailData.subject || 'No subject';
              previewBody.innerHTML = (emailData.body || 'No content').replace(/\n/g, '<br>');
              previewSection.style.display = 'block';
              
              this.components.showNotification('Content generated! Review and use it below.', 'success');
            } else {
              // Directly insert the content (old behavior)
              this.insertGeneratedEmail(emailData);
              promptInput.value = '';
              currentGeneratedData = null;
              this.components.showNotification('Email generated successfully!', 'success');
            }
          }
        } catch (error) {
          console.error('Error generating email:', error);
          this.components.showNotification('Failed to generate content', 'error');
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
      
      // Use generated content handler
      if (useBtn) {
        useBtn.addEventListener('click', () => {
          if (currentGeneratedData) {
            this.insertGeneratedEmail(currentGeneratedData);
            previewSection.style.display = 'none';
            promptInput.value = '';
            currentGeneratedData = null;
            this.components.showNotification('Content inserted into email!', 'success');
          }
        });
      }
      
      // Regenerate handler
      if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
          generateBtn.click();
        });
      }
      
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
    // Only set context if it's valid reply data
    if (context && context.replyType === 'reply' && 
        context.originalSubject && context.originalSender &&
        context.originalSubject !== 'No subject' && context.originalSender !== 'Sender') {
      this.currentContext = context;
    } else {
      this.currentContext = null;
    }
    
    // Update UI if showing
    const replyContextEl = document.querySelector('.reply-context-info');
    if (replyContextEl) {
      if (this.currentContext && this.currentContext.replyType === 'reply') {
        replyContextEl.style.display = 'block';
        const subjectEl = replyContextEl.querySelector('.context-subject');
        const fromEl = replyContextEl.querySelector('.context-from');
        
        if (subjectEl) subjectEl.textContent = this.helpers.cleanText(this.currentContext.originalSubject, 60);
        if (fromEl) fromEl.textContent = `from ${this.currentContext.originalSender}`;
      } else {
        replyContextEl.style.display = 'none';
      }
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
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
  }
};