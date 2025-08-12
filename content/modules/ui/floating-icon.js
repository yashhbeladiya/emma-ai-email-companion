// floating-icon.js - Floating icon UI component
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.FloatingIcon = class {
  constructor(toggleCallback) {
    this.toggleCallback = toggleCallback;
    this.icon = null;
    this.helpers = window.AIEmailCompanion.Helpers;
  }

  create() {
    // Remove existing icon if present
    this.remove();

    this.icon = document.createElement('div');
    this.icon.className = 'ai-companion-icon ai-email-companion';
    this.icon.setAttribute('title', 'AI Email Assistant');
    
    // Create SVG icon
    const svg = this.helpers.createSVG('0 0 24 24', 
      'M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM14 15.5C14 14.12 15.12 13 16.5 13S19 14.12 19 15.5 17.88 18 16.5 18 14 16.88 14 15.5ZM16.5 19C18.43 19 20 17.43 20 15.5S18.43 12 16.5 12 13 13.57 13 15.5 14.57 19 16.5 19Z',
      {
        width: '28px',
        height: '28px',
        fill: 'white',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
        transition: 'all 0.3s ease'
      }
    );
    
    this.icon.appendChild(svg);
    
    // Setup interactions
    this.setupEventListeners(svg);
    
    document.body.appendChild(this.icon);
    console.log('Floating icon created');
  }

  setupEventListeners(svg) {
    // Hover effects
    this.icon.addEventListener('mouseenter', () => {
      svg.style.transform = 'scale(1.1)';
    });

    this.icon.addEventListener('mouseleave', () => {
      svg.style.transform = 'scale(1)';
    });
    
    // Click handler
    this.icon.addEventListener('click', () => {
      if (this.toggleCallback) {
        this.toggleCallback();
      }
    });
  }

  remove() {
    const existingIcon = document.querySelector('.ai-companion-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
  }

  hide() {
    if (this.icon) {
      this.icon.style.opacity = '0';
      this.icon.style.transform = 'translateY(-50%) scale(0.8)';
      setTimeout(() => {
        this.icon.style.display = 'none';
      }, 300);
    }
  }

  show() {
    if (this.icon) {
      this.icon.style.display = 'flex';
      setTimeout(() => {
        this.icon.style.opacity = '1';
        this.icon.style.transform = 'translateY(-50%) scale(1)';
      }, 50);
    }
  }
};