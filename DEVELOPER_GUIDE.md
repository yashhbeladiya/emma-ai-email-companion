# Developer Guide - Emma AI Email Companion

## Development Setup

### Prerequisites
- Chrome browser (v90+)
- Code editor (VS Code recommended)
- Git for version control
- Basic knowledge of JavaScript ES6+, HTML5, CSS3

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yashhbeladiya/emma-ai-email-companion.git
   cd emma-ai-email-companion
   ```

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the project directory
   - The extension will appear in your extensions list

3. **Development Workflow**
   - Make code changes
   - Click the reload button on the extension card
   - Test on supported email sites

## Project Architecture

### File Organization
```
ai-email-companion/
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── popup/                     # Extension popup
├── content/                   # Content scripts
│   ├── content.js            # Main entry point
│   ├── modules/              # Feature modules
│   └── styles/               # CSS styles
└── icons/                    # Extension icons
```

### Module Structure

#### Core Modules
- **EmailExtractor**: Extracts email data from DOM
- **EmailAnalyzer**: AI analysis and processing
- **EmailObserver**: Monitors page changes
- **ComposeAssistant**: Writing assistance
- **BackendAPI**: API communication
- **LocalCalendar**: Calendar management

#### UI Modules
- **FloatingIcon**: Quick access button
- **Sidebar**: Main interface panel
- **Components**: Reusable UI elements

#### Utility Modules
- **Constants**: Configuration values
- **Helpers**: Utility functions

### Data Flow

1. **Email Detection**
   ```
   EmailObserver → EmailExtractor → EmailAnalyzer → UI Update
   ```

2. **Compose Assistance**
   ```
   ComposeObserver → ComposeAssistant → BackendAPI → UI Suggestions
   ```

3. **User Interaction**
   ```
   UI Event → Module Handler → BackendAPI → Response Processing
   ```

## API Integration

### Backend Requirements
The extension expects a REST API with these endpoints:

```javascript
// Email analysis endpoints
POST /api/email/intent       // Intent classification
POST /api/email/tone         // Tone analysis
POST /api/email/summary      // Content summarization
POST /api/reply/quick        // Quick reply generation

// Compose assistance endpoints
POST /api/email/compose      // Compose suggestions
POST /api/email/compose/prompt // AI-generated content

// Feature endpoints
POST /api/attachments/suggest // Attachment suggestions
POST /api/meeting/extract    // Meeting detection
POST /api/action             // Action item extraction
```

### Mock Data Development
The extension includes comprehensive mock responses for development:

```javascript
// Located in: content/modules/api/backend-api.js
this.mockResponses = {
  '/api/email/intent': (data) => ({ /* mock response */ }),
  // ... other endpoints
};
```

## Development Guidelines

### Code Style

1. **JavaScript**
   - Use ES6+ features (classes, arrow functions, async/await)
   - Follow camelCase naming convention
   - Add JSDoc comments for functions and classes
   - Use meaningful variable and function names

2. **CSS**
   - Use CSS custom properties for theming
   - Follow BEM methodology for class naming
   - Organize styles by component
   - Ensure responsive design

3. **HTML**
   - Use semantic HTML elements
   - Include accessibility attributes
   - Follow proper document structure

### Adding New Features

1. **Create Feature Module**
   ```javascript
   window.AIEmailCompanion.NewFeature = class {
     constructor() {
       // Initialize feature
     }
     
     init() {
       // Setup feature functionality
     }
   };
   ```

2. **Add to Content Script**
   ```javascript
   // In content/content.js
   initializeModules() {
     this.newFeature = new window.AIEmailCompanion.NewFeature();
     this.newFeature.init();
   }
   ```

3. **Update Manifest**
   ```json
   // Add new script files if needed
   "content_scripts": [{
     "js": [
       // ... existing scripts
       "content/modules/features/new-feature.js"
     ]
   }]
   ```

### Testing

1. **Manual Testing Checklist**
   - [ ] Load extension in developer mode
   - [ ] Test on Gmail and Outlook
   - [ ] Verify email detection works
   - [ ] Check compose assistance
   - [ ] Test sidebar functionality
   - [ ] Verify settings persistence

2. **Platform Testing**
   - Gmail (mail.google.com)
   - Outlook Web (outlook.live.com)
   - Outlook 365 (outlook.office.com)

3. **Responsive Testing**
   - Desktop (1920x1080, 1366x768)
   - Tablet (768px width)
   - Mobile (320px width)

### Debugging

1. **Chrome DevTools**
   - Open Developer Tools (F12)
   - Check Console for errors
   - Use Sources tab for debugging
   - Monitor Network for API calls

2. **Extension Debugging**
   - Extension popup: Right-click popup → Inspect
   - Background script: chrome://extensions → Details → Inspect views
   - Content script: Regular page DevTools

3. **Debug Mode**
   ```javascript
   // Enable debug logging
   localStorage.setItem('emma-debug', 'true');
   ```

## Common Issues & Solutions

### Extension Not Loading
- Check manifest.json syntax
- Verify file paths are correct
- Check for JavaScript errors in console
- Ensure permissions are properly declared

### Content Script Not Running
- Verify site is in manifest host_permissions
- Check if page has finished loading
- Verify content script injection
- Check for conflicts with other extensions

### API Connection Issues
- Verify backend URL in settings
- Check CORS configuration
- Monitor network requests
- Test with mock data

### UI Not Displaying
- Check CSS conflicts with email sites
- Verify z-index values
- Check responsive breakpoints
- Test on different screen sizes

## Performance Optimization

### Best Practices
1. **Debounce frequent operations**
2. **Use requestAnimationFrame for animations**
3. **Minimize DOM queries**
4. **Cache frequently used elements**
5. **Clean up event listeners**
6. **Use passive event listeners where possible**

### Memory Management
- Remove unused observers
- Clear timeouts and intervals
- Avoid global variable leaks
- Use WeakMap for object references

## Security Considerations

### Content Security Policy
- Only use allowed script sources
- Avoid inline scripts and styles
- Use nonce or hash for dynamic content

### Data Protection
- Never store sensitive user data
- Process emails locally when possible
- Use HTTPS for API communication
- Implement proper error handling

## Deployment

### Chrome Web Store Preparation
1. **Create release build**
2. **Test thoroughly on all platforms**
3. **Update version in manifest.json**
4. **Create extension package**
5. **Prepare store listing materials**

### Version Management
- Follow semantic versioning (major.minor.patch)
- Update manifest.json version
- Maintain changelog
- Tag releases in Git

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Update documentation
6. Submit pull request

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered

---

For questions or support, please open an issue on GitHub or contact the development team.
