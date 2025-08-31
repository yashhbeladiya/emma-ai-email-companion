/**
 * Enhanced Extension Popup Interface
 * 
 * Manages the extension popup UI with tabbed interface providing comprehensive
 * control over all extension features, settings, and status information.
 * 
 * Features:
 * - Tabbed interface (Features, Settings, Status)
 * - Feature toggle controls with real-time updates
 * - Advanced settings management
 * - API configuration and testing
 * - Privacy controls
 * - Extension status monitoring
 * - Site compatibility checking
 * 
 * @class PopupManager
 * @version 2.1.0
 * @author Emma AI Team
 */

class PopupManager {
  constructor() {
    this.settings = {};
    this.currentTab = 'features';
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupTabNavigation();
    this.setupEventListeners();
    this.updateUI();
    this.checkCurrentSite();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (settings) => {
        this.settings = {
          // Core Features
          keyPoints: true,
          quickReplies: true,
          composeAssistant: true,
          emailAnalysis: true,
          meetingDetection: true,
          
          ...settings
        };
        resolve();
      });
    });
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
      });
    });
  }

  setupEventListeners() {
    // Feature toggles (toggle switches)
    const toggles = ['keyPoints', 'quickReplies', 'composeAssistant', 'emailAnalysis', 'meetingDetection'];
    toggles.forEach(toggle => {
      const element = document.getElementById(toggle);
      if (element) {
        element.addEventListener('click', () => this.toggleSetting(toggle));
      }
    });

    // Action buttons
    this.setupActionButtons();
  }

  setupActionButtons() {
    // Open Sidebar
    const openSidebarBtn = document.getElementById('openSidebar');
    if (openSidebarBtn) {
      openSidebarBtn.addEventListener('click', () => {
        this.sendMessageToActiveTab({ action: 'toggleSidebar' });
        window.close();
      });
    }

    // Refresh Page
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

    // Reset Settings
    const resetSettingsBtn = document.getElementById('resetSettings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }

    // Save Settings
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        this.saveSettings();
        this.showNotification('Features saved successfully!');
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
    // Update feature toggles
    const toggles = ['keyPoints', 'quickReplies', 'composeAssistant', 'emailAnalysis', 'meetingDetection'];
    toggles.forEach(setting => {
      this.updateToggle(setting);
    });

    // Update statistics
    chrome.storage.local.get(['emailsProcessed', 'lastActivity'], (result) => {
      const emailsProcessedEl = document.getElementById('emailsProcessed');
      if (emailsProcessedEl) {
        emailsProcessedEl.textContent = result.emailsProcessed || 0;
      }

      const lastActivityEl = document.getElementById('lastActivity');
      if (lastActivityEl) {
        const lastActivity = result.lastActivity;
        if (lastActivity) {
          const date = new Date(lastActivity);
          lastActivityEl.textContent = date.toLocaleTimeString();
        } else {
          lastActivityEl.textContent = 'Never';
        }
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

  resetSettings() {
    if (confirm('Are you sure you want to reset all features to default?')) {
      const defaultSettings = {
        keyPoints: true,
        quickReplies: true,
        composeAssistant: true,
        emailAnalysis: true,
        meetingDetection: true
      };

      this.settings = defaultSettings;
      this.updateUI();
      this.saveSettings();
      this.showNotification('Features reset to default!');
    }
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
      if (openSidebarBtn) {
        openSidebarBtn.disabled = false;
        openSidebarBtn.textContent = 'Open Assistant';
      }
    } else {
      statusEl.textContent = 'Inactive';
      indicatorEl.className = 'status-indicator inactive';
      if (openSidebarBtn) {
        openSidebarBtn.disabled = true;
        openSidebarBtn.textContent = 'Not Available';
      }
    }
  }

  async checkContentScriptStatus(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log('Content script is loaded');
    } catch (error) {
      console.log('Content script not loaded, injecting...');
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
            if (message.action === 'toggleSidebar') {
              this.checkContentScriptStatus(tabs[0].id).then(() => {
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

  showNotification(message, type = 'success') {
    // Create a simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Add notification keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);