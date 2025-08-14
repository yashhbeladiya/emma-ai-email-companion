/**
 * Extension Popup Interface
 * 
 * Manages the extension popup UI that appears when users click the Emma icon
 * in the Chrome toolbar. Provides access to settings, status information,
 * and extension controls.
 * 
 * Features:
 * - Extension settings management
 * - Current site detection and status
 * - Feature toggle controls
 * - Backend connection status
 * - Help and documentation links
 * - Version information
 * - Quick actions and shortcuts
 * 
 * Settings Management:
 * - Auto-summarize toggle
 * - Smart replies configuration
 * - Tone assistance preferences
 * - Notification settings
 * - Backend URL configuration
 * - Privacy preferences
 * 
 * Status Display:
 * - Current site compatibility
 * - Extension activation status
 * - API connection health
 * - Recent activity summary
 * 
 * @class PopupManager
 * @version 2.0.0
 * @author Emma AI Team
 */

// popup.js - Enhanced popup with connection to content script
class PopupManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.checkCurrentSite();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (settings) => {
        this.settings = {
          autoSummarize: true,
          smartReplies: true,
          toneAssistance: true,
          notifications: true,
          ...settings
        };
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Toggle switches
    const toggles = ['autoSummarize', 'smartReplies', 'toneAssistance', 'notifications'];
    toggles.forEach(toggle => {
      const element = document.getElementById(toggle);
      if (element) {
        element.addEventListener('click', () => this.toggleSetting(toggle));
      }
    });

    // Action buttons
    const openSidebarBtn = document.getElementById('openSidebar');
    if (openSidebarBtn) {
      openSidebarBtn.addEventListener('click', () => {
        this.sendMessageToActiveTab({ action: 'toggleSidebar' });
        window.close();
      });
    }

    const refreshBtn = document.getElementById('refreshPage');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id);
            window.close();
          }
        });
      });
    }
  }

  toggleSetting(setting) {
    this.settings[setting] = !this.settings[setting];
    this.updateToggle(setting);
    this.saveSettings();
  }

  updateToggle(setting) {
    const element = document.getElementById(setting);
    if (element) {
      if (this.settings[setting]) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    }
  }

  updateUI() {
    // Update all toggles
    Object.keys(this.settings).forEach(setting => {
      const element = document.getElementById(setting);
      if (element) {
        this.updateToggle(setting);
      }
    });

    // Update emails processed count
    chrome.storage.local.get(['emailsProcessed'], (result) => {
      const emailsProcessedEl = document.getElementById('emailsProcessed');
      if (emailsProcessedEl) {
        emailsProcessedEl.textContent = result.emailsProcessed || 0;
      }
    });
  }

  saveSettings() {
    chrome.storage.sync.set(this.settings, () => {
      console.log('Settings saved:', this.settings);
    });
    
    // Send settings update to content script
    this.sendMessageToActiveTab({ 
      action: 'updateSettings', 
      settings: this.settings 
    });
  }

  async checkCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        this.updateSiteStatus('Unknown', false);
        return;
      }

      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      const supportedSites = {
        'mail.google.com': 'Gmail',
        'outlook.live.com': 'Outlook',
        'outlook.office.com': 'Outlook',
        'outlook.office365.com': 'Outlook 365'
      };

      const siteName = supportedSites[hostname] || 'Unsupported';
      const isSupported = siteName !== 'Unsupported';
      
      this.updateSiteStatus(siteName, isSupported);
      
      // Check if content script is loaded
      if (isSupported) {
        this.checkContentScriptStatus(tab.id);
      }
    } catch (error) {
      console.error('Error checking current site:', error);
      this.updateSiteStatus('Unknown', false);
    }
  }

  updateSiteStatus(siteName, isSupported) {
    document.getElementById('currentSite').textContent = siteName;
    
    const statusEl = document.getElementById('extensionStatus');
    const indicatorEl = document.getElementById('statusIndicator');
    const openSidebarBtn = document.getElementById('openSidebar');

    if (isSupported) {
      statusEl.textContent = 'Active';
      indicatorEl.className = 'status-indicator active';
      openSidebarBtn.disabled = false;
      openSidebarBtn.textContent = 'Open Assistant';
    } else {
      statusEl.textContent = 'Inactive';
      indicatorEl.className = 'status-indicator inactive';
      openSidebarBtn.disabled = true;
      openSidebarBtn.textContent = 'Not Available';
    }
  }

  async checkContentScriptStatus(tabId) {
    try {
      // Try to ping the content script
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log('Content script is loaded');
    } catch (error) {
      console.log('Content script not loaded, injecting...');
      // Try to inject content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [
            'content/modules/utils/constants.js',
            'content/modules/utils/helpers.js',
            'content/modules/calendar/local-calendar.js',
            'content/modules/api/backend-api.js',
            'content/modules/ui/components.js',
            'content/modules/ui/floating-icon.js',
            'content/modules/ui/sidebar.js',
            'content/modules/email/email-extractor.js',
            'content/modules/email/email-analyzer.js',
            'content/modules/email/email-observer.js',
            'content/modules/compose/compose-assistant.js',
            'content/modules/compose/compose-observer.js',
            'content/content.js'
          ]
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: [
            'content/styles/main.css',
            'content/styles/sidebar.css',
            'content/styles/components.css'
          ]
        });
        
        console.log('Content script injected successfully');
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
      }
    }
  }

  sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message)
          .then(() => {
            console.log('Message sent successfully:', message.action);
          })
          .catch((error) => {
            console.error('Failed to send message:', error);
            // If it's a toggle sidebar action, try injecting script first
            if (message.action === 'toggleSidebar') {
              this.checkContentScriptStatus(tabs[0].id).then(() => {
                // Retry sending message after injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
                    console.error('Still failed after injection');
                  });
                }, 500);
              });
            }
          });
      }
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});