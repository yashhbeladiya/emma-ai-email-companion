/**
 * Utility Helper Functions Module
 * 
 * Collection of utility functions used throughout the Emma AI Email Companion.
 * Provides common functionality for DOM manipulation, data processing,
 * email platform detection, and general utilities.
 * 
 * Functions:
 * - debounce() - Prevents excessive function calls
 * - generateId() - Creates unique identifiers
 * - sanitizeText() - Cleans and processes text content
 * - isOnSupportedSite() - Detects supported email platforms
 * - getEmailPlatform() - Identifies current email platform
 * - extractTextFromElement() - Extracts clean text from DOM
 * - formatDate() - Date formatting utilities
 * - truncateText() - Text truncation with ellipsis
 * - validateEmail() - Email address validation
 * 
 * @namespace Helpers
 * @version 2.0.0
 * @author Emma AI Team
 */

// helpers.js - Utility functions
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.Helpers = {
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Generate unique ID
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Safely query selector
  safeQuerySelector(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (e) {
      console.error('Invalid selector:', selector, e);
      return null;
    }
  },
  
  // Check if on supported site
  isOnSupportedSite() {
    const hostname = window.location.hostname;
    return Object.keys(window.AIEmailCompanion.Constants.SUPPORTED_SITES).includes(hostname);
  },
  
  // Get current site type
  getCurrentSite() {
    const hostname = window.location.hostname;
    return {
      isGmail: hostname.includes('mail.google.com'),
      isOutlook: hostname.includes('outlook'),
      siteName: window.AIEmailCompanion.Constants.SUPPORTED_SITES[hostname] || 'Unknown'
    };
  },
  
  // Create SVG element
  createSVG(viewBox, pathData, style = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    
    Object.entries(style).forEach(([key, value]) => {
      svg.style[key] = value;
    });
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    
    return svg;
  },
  
  // Animate element
  animateElement(element, animationClass, duration = 1000) {
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  },
  
  // Storage helpers
  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  },
  
  async setStorageData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },
  
  // Add CSS to page
  addStyles(cssText, id = null) {
    const style = document.createElement('style');
    if (id) style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
  },
  
  // Clean and truncate text
  cleanText(text, maxLength = 100) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  }
};