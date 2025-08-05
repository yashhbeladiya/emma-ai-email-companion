// compose-assistant.js - Compose assistance module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.ComposeAssistant = class {
  constructor() {
    this.api = new window.AIEmailCompanion.BackendAPI();
    this.helpers = window.AIEmailCompanion.Helpers;
    this.components = window.AIEmailCompanion.Components;
    this.typingTimer = null;
    this.currentContext = null;
  }

  setupAssistant(textarea, context = null) {
    this.currentContext = context;
    
    // Auto-open sidebar when composing starts
    textarea.addEventListener('focus', () => {
      console.log('Compose area focused');
      if (window.AIEmailCompanion.main) {
        window.AIEmailCompanion.main.isComposing = true;
        window.AIEmailCompanion.main.sidebar.open();
        this.showComposeStatus();
      }
    });

    // Listen for typing and provide real-time suggestions
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
  }

  handleComposeInput(textarea) {
    const text = textarea.textContent || textarea.value || '';
    
    // Clear previous timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // Set new timer - suggest after user stops typing
    this.typingTimer = setTimeout(() => {
      if (text.length > 10) { // Only suggest for meaningful text
        console.log('Getting compose suggestion for:', text.substring(0, 50) + '...');
        this.suggestRefinedCompose(text, textarea);
      }
    }, window.AIEmailCompanion.Constants.TIMINGS.COMPOSE_TYPING_DELAY);
  }

  async suggestRefinedCompose(userText, textarea) {
    try {
      console.log('Getting refined compose suggestion...');
      
      const response = await this.api.callAPI('/api/compose/refine', {
        userText: userText,
        context: this.currentContext
      });

      if (response.success && response.data.refinedText) {
        this.showRefinedSuggestion(response.data.refinedText, textarea);
      }
    } catch (error) {
      console.error('Error getting refined compose:', error);
    }
  }

  showComposeStatus() {
    const sidebar = window.AIEmailCompanion.main?.sidebar;
    if (!sidebar) return;
    
    const statusHtml = this.components.createComposeStatus(this.currentContext);
    sidebar.updateContent(statusHtml);
  }

  showRefinedSuggestion(refinedText, textarea) {
    const sidebar = window.AIEmailCompanion.main?.sidebar;
    if (!sidebar) return;
    
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'refined-suggestion';
    suggestionDiv.innerHTML = `
      <h5 class="section-title">✨ Refined Version</h5>
      <div class="refined-text">${refinedText}</div>
      <div class="suggestion-actions">
        <button class="insert-refined-btn btn btn-primary">
          <span>Use This Version</span>
        </button>
        <button class="dismiss-suggestion-btn btn btn-secondary">
          <span>Dismiss</span>
        </button>
      </div>
    `;
    
    // Insert button handler
    suggestionDiv.querySelector('.insert-refined-btn').addEventListener('click', () => {
      textarea.focus();
      textarea.innerHTML = refinedText;
      
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      
      this.components.showNotification('Refined text inserted!', 'success');
      this.showComposeStatus();
    });
    
    // Dismiss button handler
    suggestionDiv.querySelector('.dismiss-suggestion-btn').addEventListener('click', () => {
      this.showComposeStatus();
    });
    
    const content = sidebar.getContentElement();
    if (content) {
      const existingSuggestion = content.querySelector('.refined-suggestion');
      if (existingSuggestion) {
        existingSuggestion.remove();
      }
      content.appendChild(suggestionDiv);
    }
  }

  updateContext(context) {
    this.currentContext = context;
  }
};