/**
 * Sidebar UI Component
 * 
 * Main interface panel that displays email analysis results, AI insights,
 * and interactive features. Provides a comprehensive view of Emma's capabilities
 * in a slide-out panel format.
 * 
 * Features:
 * - Responsive slide-out panel
 * - Email analysis display
 * - Quick reply interfaces
 * - Meeting information
 * - Action item tracking
 * - Compose assistance
 * - Settings integration
 * - Smooth animations
 * - Mobile-responsive design
 * - Keyboard navigation
 * 
 * Content Sections:
 * - Email summary and insights
 * - Intent and tone badges
 * - Quick reply suggestions
 * - Action items checklist
 * - Meeting details
 * - Attachment suggestions
 * - Compose assistance tools
 * 
 * @class Sidebar
 * @version 2.0.0
 * @author Emma AI Team
 */

// sidebar.js - Sidebar UI component
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.Sidebar = class {
  constructor() {
    this.sidebar = null;
    this.state = window.AIEmailCompanion.Constants.SIDEBAR_STATES.CLOSED;
    this.closeCallback = null;
    this.helpers = window.AIEmailCompanion.Helpers;
    this.components = window.AIEmailCompanion.Components;
  }

  create() {
    // Remove existing sidebar if present
    this.remove();

    this.sidebar = document.createElement('div');
    this.sidebar.className = 'ai-companion-sidebar ai-email-companion';
    
    // Create header
    const header = this.createHeader();
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'sidebar-content';
    
    const loadingState = this.components.createLoadingState();
    content.appendChild(loadingState);
    
    this.sidebar.appendChild(header);
    this.sidebar.appendChild(content);
    
    // Setup event listeners
    this.setupEventListeners();
    
    document.body.appendChild(this.sidebar);
    console.log('Sidebar created');
  }

  adjustForComposeBox() {
    // This method is no longer needed as we handle compose differently
    // Keeping for backward compatibility
  }

  moveToLeft() {
    this.sidebar.classList.add('left-positioned');
    this.sidebar.classList.remove('compose-adjusted');
  }

  resetPosition() {
    this.sidebar.classList.remove('left-positioned');
    this.sidebar.classList.remove('compose-adjusted');
    this.sidebar.classList.remove('compose-mode');
    this.sidebar.style.bottom = '';
    this.sidebar.style.height = '';
  }

  isInComposeMode() {
    return this.sidebar.classList.contains('compose-mode');
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const title = document.createElement('h3');
    title.className = 'sidebar-title';
    title.innerHTML = 'Emma: Email Assistant <span class="sparkle">✨</span>';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar-close';
    closeBtn.setAttribute('title', 'Close');
    
    // Create close icon
    const closeSvg = this.helpers.createSVG('0 0 24 24',
      'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      {
        width: '20px',
        height: '20px',
        fill: '#6b7280',
        transition: 'all 0.3s ease'
      }
    );
    
    closeBtn.appendChild(closeSvg);
    
    // Close button hover effects
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      closeBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
      closeSvg.style.fill = '#ef4444';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1) rotate(0deg)';
      closeSvg.style.fill = '#6b7280';
    });
    
    // Close button click
    closeBtn.addEventListener('click', () => this.close());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }

  setupEventListeners() {
    // Handle escape key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Handle clicks outside
    this.clickOutsideHandler = (e) => {
      if (this.isOpen() && 
          !this.sidebar.contains(e.target) && 
          !e.target.closest('.ai-companion-icon') &&
          !e.target.closest('[contenteditable="true"]')) {
        this.close();
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);
  }

  open(forCompose = false) {
    if (this.state === window.AIEmailCompanion.Constants.SIDEBAR_STATES.OPENING || 
        this.state === window.AIEmailCompanion.Constants.SIDEBAR_STATES.OPEN) {
      return;
    }
    
    this.state = window.AIEmailCompanion.Constants.SIDEBAR_STATES.OPENING;
    
    // Hide floating icon when sidebar opens
    if (window.AIEmailCompanion.main?.floatingIcon) {
      window.AIEmailCompanion.main.floatingIcon.hide();
    }
    
    // If opening for compose, always position on left
    if (forCompose) {
      this.sidebar.classList.add('compose-mode');
      this.moveToLeft();
    } else {
      // Normal right-side positioning for email analysis
      this.sidebar.classList.remove('compose-mode');
      this.resetPosition();
    }
    
    this.sidebar.classList.add('open');
    
    setTimeout(() => {
      this.state = window.AIEmailCompanion.Constants.SIDEBAR_STATES.OPEN;
    }, window.AIEmailCompanion.Constants.TIMINGS.SIDEBAR_ANIMATION);
    
    console.log(`Sidebar opened ${forCompose ? 'for compose' : 'for analysis'}`);
  }

  close() {
    if (this.state === window.AIEmailCompanion.Constants.SIDEBAR_STATES.CLOSING || 
        this.state === window.AIEmailCompanion.Constants.SIDEBAR_STATES.CLOSED) {
      return;
    }
    
    this.state = window.AIEmailCompanion.Constants.SIDEBAR_STATES.CLOSING;
    this.sidebar.classList.remove('open');
    
    setTimeout(() => {
      this.state = window.AIEmailCompanion.Constants.SIDEBAR_STATES.CLOSED;
      
      // Dispatch sidebar closed event for reset functionality
      document.dispatchEvent(new CustomEvent('sidebarClosed'));
      
      // Show floating icon when sidebar closes
      if (window.AIEmailCompanion.main?.floatingIcon) {
        window.AIEmailCompanion.main.floatingIcon.show();
      }
      
      if (this.closeCallback) {
        this.closeCallback();
      }
    }, 500);
    
    console.log('Sidebar closed');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen() {
    return this.state === window.AIEmailCompanion.Constants.SIDEBAR_STATES.OPEN;
  }

  getContentElement() {
    return this.sidebar.querySelector('.sidebar-content');
  }

  updateContent(content) {
    const contentElement = this.getContentElement();
    if (contentElement) {
      if (typeof content === 'string') {
        contentElement.innerHTML = content;
      } else {
        contentElement.innerHTML = '';
        contentElement.appendChild(content);
      }
    }
  }

  showLoading(text) {
    const loadingState = this.components.createLoadingState(text);
    this.updateContent(loadingState);
  }

  showError(retryCallback) {
    const errorState = this.components.createErrorState(retryCallback);
    this.updateContent(errorState);
  }

  updateFeatureVisibility(feature, isVisible) {
    /**
     * Update the visibility of specific features in the sidebar
     * @param {string} feature - Feature name (keyPoints, replies, compose, analysis, meeting)
     * @param {boolean} isVisible - Whether the feature should be visible
     */
    if (!this.sidebar) return;

    const featureMap = {
      'keyPoints': ['.summary-section', '.summarize-btn'],
      'replies': ['.replies-section', '.quick-replies'],
      'compose': ['.compose-section', '.compose-assistant'],
      'analysis': ['.analysis-section', '.email-insights'],
      'meeting': ['.meeting-section', '.meeting-details']
    };

    const selectors = featureMap[feature];
    if (!selectors) return;

    selectors.forEach(selector => {
      const elements = this.sidebar.querySelectorAll(selector);
      elements.forEach(element => {
        if (isVisible) {
          element.style.display = '';
          element.classList.remove('feature-disabled');
        } else {
          element.style.display = 'none';
          element.classList.add('feature-disabled');
        }
      });
    });

    // Update any feature-specific buttons or controls
    const featureButtons = this.sidebar.querySelectorAll(`[data-feature="${feature}"]`);
    featureButtons.forEach(button => {
      button.disabled = !isVisible;
      if (isVisible) {
        button.classList.remove('disabled');
      } else {
        button.classList.add('disabled');
      }
    });
  }

  remove() {
    const existingSidebar = document.querySelector('.ai-companion-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }
    
    // Clean up event listeners
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
    }
  }
};