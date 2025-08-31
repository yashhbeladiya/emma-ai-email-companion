/**
 * Main Content Script - AI Email Companion Entry Point
 * 
 * This is the primary content script that initializes the Emma AI Email Companion
 * on supported email platforms. It coordinates all modules and manages the
 * overall extension lifecycle within the email page context.
 * 
 * Features:
 * - Detects and initializes on supported email sites
 * - Coordinates email detection and analysis
 * - Manages UI components (floating icon, sidebar)
 * - Handles compose assistance
 * - Orchestrates module communication
 * 
 * @version 2.0.0
 * @author Emma AI Team
 */

// content.js - Main entry point for AI Email Companion
(function() {
  'use strict';
  
  // Prevent multiple initialization
  if (window.aiEmailCompanionInitialized) {
    console.log('AI Email Companion already initialized');
    return;
  }
  window.aiEmailCompanionInitialized = true;

  class AIEmailCompanion {
    constructor() {
      // Check if on supported site
      if (!window.AIEmailCompanion.Helpers.isOnSupportedSite()) {
        console.log('Not on a supported email site');
        return;
      }

      // Initialize properties
      this.currentEmailData = null;
      this.currentEmailId = null;
      this.isComposing = false;
      this.processingEmail = false;
      
      // Initialize modules
      this.initializeModules();
      
      // Store reference globally for module access
      window.AIEmailCompanion.main = this;
      
      // Initialize UI and start monitoring
      this.init();
    }

    initializeModules() {
      // UI modules
      this.floatingIcon = new window.AIEmailCompanion.FloatingIcon(() => this.sidebar.toggle());
      this.sidebar = new window.AIEmailCompanion.Sidebar();
      
      // Email modules
      this.emailExtractor = new window.AIEmailCompanion.EmailExtractor();
      this.emailAnalyzer = new window.AIEmailCompanion.EmailAnalyzer();
      this.emailObserver = new window.AIEmailCompanion.EmailObserver((emailId) => this.handleEmailChange(emailId));
      
      // Compose modules
      this.composeObserver = new window.AIEmailCompanion.ComposeObserver();
      
      // Calendar module
      this.localCalendar = new window.AIEmailCompanion.LocalCalendar();
      
      console.log('Modules initialized');
    }

    init() {
      console.log('Initializing AI Email Companion...');
      
      // Load settings first
      this.loadInitialSettings();
      
      // Create UI elements
      this.floatingIcon.create();
      this.sidebar.create();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start observers with delay to ensure page is loaded
      setTimeout(() => {
        this.emailObserver.start();
        this.composeObserver.start();
      }, 2000);
      
      // Update emails processed count
      this.updateEmailsProcessedCount();
    }

    async loadInitialSettings() {
      try {
        // Use Promise wrapper for chrome.storage.sync.get
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(null, (items) => {
            resolve(items);
          });
        });
        
        const defaultSettings = window.AIEmailCompanion.Constants.DEFAULT_SETTINGS;
        const settings = { ...defaultSettings, ...result };
        
        // Apply initial settings
        this.updateSettings(settings);
        
        console.log('Initial settings loaded:', settings);
      } catch (error) {
        console.error('Failed to load initial settings:', error);
        // Use default settings
        this.updateSettings(window.AIEmailCompanion.Constants.DEFAULT_SETTINGS);
      }
    }

    setupEventListeners() {
      // Listen for messages from extension
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'ping':
            sendResponse({ status: 'alive', features: Object.keys(window.AIEmailCompanion.settings || {}) });
            break;
          case 'toggleSidebar':
            this.sidebar.toggle();
            sendResponse({ success: true });
            break;
          case 'updateSettings':
            this.updateSettings(request.settings);
            sendResponse({ success: true });
            break;
          case 'analyzeSelection':
            this.analyzeSelectedText(request.text);
            sendResponse({ success: true });
            break;
          case 'getSettings':
            // Return current global settings to popup
            sendResponse({ settings: window.globalSettings || window.AIEmailCompanion.settings || {} });
            break;
        }
        return true; // Keep the message channel open for async responses
      });

      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          console.log('Storage changed, updating settings...');
          this.loadInitialSettings();
        }
      });
      
      // Set sidebar close callback
      this.sidebar.closeCallback = () => {
        this.isComposing = false;
      };
    }

    async handleEmailChange(emailId) {
      if (!emailId) {
        // Email was closed
        if (!this.isComposing && this.sidebar.isOpen()) {
          this.currentEmailId = null;
          this.currentEmailData = null;
          this.sidebar.close();
        }
        return;
      }

      // New email detected
      this.currentEmailId = emailId;
      
      try {
        // Extract email data
        const emailData = this.emailExtractor.extractEmailData();
        if (!emailData) {
          console.log('No email data found');
          return;
        }

        // Check if this is the same email
        if (this.currentEmailData && 
            this.currentEmailData.subject === emailData.subject &&
            this.currentEmailData.sender === emailData.sender &&
            this.currentEmailData.body === emailData.body) {
          console.log('Same email already processed');
          return;
        }

        this.currentEmailData = emailData;
        
        // Update compose context
        this.composeObserver.updateContext(emailData);
        
        // Open sidebar and analyze
        if (!this.sidebar.isOpen()) {
          this.sidebar.open();
        }
        
        await this.analyzeAndShowEmail(emailData);
        
        // Increment processed count
        await this.incrementEmailsProcessed();
        
      } catch (error) {
        console.error('Error handling email change:', error);
      }
    }

    async analyzeAndShowEmail(emailData) {
      console.log('Analyzing email:', emailData);
      
      // Show loading state
      this.sidebar.showLoading('Analyzing email with AI...');

      try {
        // Analyze email
        const analysisResults = await this.emailAnalyzer.analyzeEmail(emailData);
        
        // Build and show UI
        const analysisUI = this.emailAnalyzer.buildAnalysisUI(analysisResults, emailData);
        this.sidebar.updateContent(analysisUI);
        
        // Setup event listeners
        this.emailAnalyzer.setupEventListeners(analysisUI, emailData, analysisResults);
        
      } catch (error) {
        console.error('Error analyzing email:', error);
        this.sidebar.showError(() => this.analyzeAndShowEmail(emailData));
      }
    }

    analyzeSelectedText(text) {
      if (!text) return;
      
      // Open sidebar if not open
      if (!this.sidebar.isOpen()) {
        this.sidebar.open();
      }
      
      // Create simple analysis for selected text
      const analysisDiv = document.createElement('div');
      analysisDiv.className = 'selected-text-analysis';
      analysisDiv.innerHTML = `
        <div class="analysis-container">
          <h4 class="section-title">📝 Selected Text Analysis</h4>
          <div class="selected-text-content">
            <p class="selected-text">${window.AIEmailCompanion.Helpers.cleanText(text, 200)}</p>
          </div>
          <div class="analysis-actions">
            <button class="btn btn-primary analyze-btn">Analyze Tone & Intent</button>
            <button class="btn btn-secondary summarize-btn">Summarize</button>
          </div>
        </div>
      `;
      
      this.sidebar.updateContent(analysisDiv);
    }

    updateSettings(settings) {
      console.log('Settings updated:', settings);
      
      // Store settings globally for use by other modules
      window.AIEmailCompanion.settings = settings;
      window.globalSettings = settings; // For popup access
      
      // Apply settings changes
      if (settings.keyPoints === false) {
        console.log('Key points disabled');
        // Disable key points extraction
        this.sidebar.updateFeatureVisibility('keyPoints', false);
      } else {
        this.sidebar.updateFeatureVisibility('keyPoints', true);
      }
      
      if (settings.quickReplies === false) {
        console.log('Quick replies disabled');
        // Hide reply suggestions
        this.sidebar.updateFeatureVisibility('replies', false);
      } else {
        this.sidebar.updateFeatureVisibility('replies', true);
      }
      
      if (settings.composeAssistant === false) {
        console.log('Compose assistant disabled');
        // Disable compose assistance features
        this.sidebar.updateFeatureVisibility('compose', false);
      } else {
        this.sidebar.updateFeatureVisibility('compose', true);
      }

      if (settings.emailAnalysis === false) {
        console.log('Email analysis disabled');
        // Disable email analysis features
        this.sidebar.updateFeatureVisibility('analysis', false);
      } else {
        this.sidebar.updateFeatureVisibility('analysis', true);
      }

      if (settings.meetingDetection === false) {
        console.log('Meeting detection disabled');
        // Disable meeting features
        this.sidebar.updateFeatureVisibility('meeting', false);
      } else {
        this.sidebar.updateFeatureVisibility('meeting', true);
      }

      // Store last activity
      window.AIEmailCompanion.Helpers.setStorageData('lastActivity', Date.now());
      
      // Refresh sidebar content if it's open
      if (this.sidebar && this.sidebar.isOpen() && this.currentEmailData) {
        console.log('Refreshing sidebar content with new settings...');
        setTimeout(() => {
          this.handleEmailChange(this.currentEmailId);
        }, 100);
      }
      
      // Notify other components about settings change
      document.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
    }

    async updateEmailsProcessedCount() {
      const count = await window.AIEmailCompanion.Helpers.getStorageData('emailsProcessed') || 0;
      console.log('Emails processed:', count);
    }

    async incrementEmailsProcessed() {
      const count = await window.AIEmailCompanion.Helpers.getStorageData('emailsProcessed') || 0;
      await window.AIEmailCompanion.Helpers.setStorageData('emailsProcessed', count + 1);
    }
  }

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AIEmailCompanion();
    });
  } else {
    new AIEmailCompanion();
  }
})();