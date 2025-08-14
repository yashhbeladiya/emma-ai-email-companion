# Emma - Your Email Companion

## Overview

Emma is an intelligent Chrome extension that transforms your email experience by providing AI-powered analysis, smart replies, tone detection, and automated calendar integration. Built to work seamlessly with Gmail and Outlook, Emma acts as your personal email assistant to boost productivity and enhance communication.

## Features

### 🤖 AI-Powered Email Analysis
- **Intent Detection**: Automatically identifies email purpose (Meeting Request, Question, Task, etc.)
- **Tone Analysis**: Analyzes email sentiment and emotional tone
- **Smart Summarization**: Generates concise summaries of lengthy emails
- **Action Item Extraction**: Identifies and highlights actionable tasks

### 💬 Smart Communication
- **Quick Reply Suggestions**: Context-aware reply templates
- **Tone-Matched Responses**: Suggests replies matching the sender's tone
- **Compose Assistant**: Real-time writing assistance and suggestions
- **Attachment Recommendations**: Suggests relevant attachments based on context

### 📅 Calendar Integration
- **Meeting Detection**: Automatically identifies meeting requests
- **Calendar Events**: One-click addition to local calendar
- **Smart Scheduling**: Suggests optimal meeting times

### 🎨 User Interface
- **Floating Icon**: Unobtrusive access to AI features
- **Sidebar Panel**: Comprehensive analysis display
- **Mobile Responsive**: Optimized for all screen sizes
- **Dark/Light Mode**: Adaptive theme support

## Supported Email Platforms

- ✅ Gmail (mail.google.com)
- ✅ Outlook Web (outlook.live.com)
- ✅ Outlook Office 365 (outlook.office.com, outlook.office365.com)

## Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "Emma - AI Email Companion"
3. Click "Add to Chrome"
4. Follow the installation prompts

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yashhbeladiya/emma-ai-email-companion.git
   cd emma-ai-email-companion
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top-right corner

4. Click "Load unpacked" and select the project directory

5. The extension will be installed and ready to use

## Configuration

### Backend API Setup
1. Open the extension popup by clicking the Emma icon
2. Navigate to Settings
3. Enter your backend API URL (default: provided ngrok URL)
4. Configure your preferences:
   - Auto-summarize emails
   - Smart reply suggestions
   - Tone assistance
   - Notifications

### Permissions Required
- **Active Tab**: Access to current email page
- **Storage**: Save settings and calendar data
- **Scripting**: Inject content scripts
- **Notifications**: Display system notifications
- **Context Menus**: Right-click menu options

## Architecture

### Directory Structure
```
ai-email-companion/
├── manifest.json              # Extension configuration
├── background.js              # Service worker for background tasks
├── popup/                     # Extension popup interface
│   ├── popup.html
│   └── popup.js
├── content/                   # Content scripts and modules
│   ├── content.js            # Main content script entry point
│   ├── modules/              # Modular components
│   │   ├── api/              # Backend communication
│   │   ├── calendar/         # Calendar functionality
│   │   ├── compose/          # Email composition assistance
│   │   ├── email/            # Email processing and analysis
│   │   ├── ui/               # User interface components
│   │   └── utils/            # Utility functions and constants
│   └── styles/               # CSS styling
└── icons/                    # Extension icons
```

### Core Modules

#### Email Processing
- **EmailExtractor**: Extracts email content and metadata
- **EmailAnalyzer**: Processes emails with AI analysis
- **EmailObserver**: Monitors email page changes

#### UI Components
- **FloatingIcon**: Provides quick access button
- **Sidebar**: Main analysis display panel
- **Components**: Reusable UI elements

#### API Integration
- **BackendAPI**: Handles communication with AI backend
- **MockResponses**: Development fallback responses

#### Calendar Management
- **LocalCalendar**: Manages calendar events and reminders

## API Integration

### Backend Requirements
The extension expects a REST API with the following endpoints:

```
POST /api/email/intent      # Email intent classification
POST /api/email/tone        # Tone and sentiment analysis
POST /api/email/summary     # Email summarization
POST /api/reply/quick       # Generate quick replies
POST /api/email/compose     # Compose assistance
POST /api/attachments/suggest # Attachment suggestions
POST /api/meeting/extract   # Meeting information extraction
```

### Request Format
```json
{
  "emailData": {
    "subject": "Meeting Request",
    "sender": "john@example.com",
    "body": "Email content...",
    "timestamp": "2025-08-13T10:00:00Z"
  },
  "context": {
    "previousEmails": [...],
    "userPreferences": {...}
  }
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "intent": "meeting_request",
    "tone": "professional",
    "summary": "Meeting request for project discussion",
    "replies": [...]
  }
}
```

## Development

### Prerequisites
- Node.js (v14 or higher)
- Chrome browser
- Git

### Setup Development Environment
1. Clone the repository
2. Install dependencies (if any):
   ```bash
   npm install
   ```
3. Make your changes
4. Test in Chrome developer mode
5. Submit pull request

### Code Style
- Use ES6+ features
- Follow JSDoc documentation standards
- Maintain modular architecture
- Write descriptive comments
- Use semantic CSS classes

### Testing
- Manual testing across supported email platforms
- Test with various email types and lengths
- Verify responsive design on different screen sizes
- Test extension lifecycle (install, update, uninstall)

## Privacy & Security

### Data Handling
- **No Personal Data Storage**: Email content is processed in real-time and not stored
- **Local Processing**: Basic operations performed locally when possible
- **Encrypted Communication**: All API calls use HTTPS
- **User Consent**: Clear permission requests for required access

### Permissions Justification
- **activeTab**: Required to read email content for analysis
- **storage**: Stores user preferences and calendar data locally
- **scripting**: Injects content scripts into email pages
- **notifications**: Displays helpful notifications
- **contextMenus**: Provides right-click menu options

## Troubleshooting

### Common Issues

#### Extension Not Working
1. Check if you're on a supported email platform
2. Refresh the email page
3. Ensure extension is enabled in Chrome
4. Check console for JavaScript errors

#### API Connection Errors
1. Verify backend URL in settings
2. Check network connectivity
3. Ensure backend service is running
4. Review browser console for error messages

#### Performance Issues
1. Disable other email extensions temporarily
2. Clear browser cache and reload
3. Check if email page has heavy content
4. Monitor browser memory usage

### Debug Mode
Enable debug mode by:
1. Opening browser console (F12)
2. Setting localStorage flag: `localStorage.setItem('emma-debug', 'true')`
3. Refreshing the page

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Contribution Guidelines
- Follow existing code style
- Add appropriate documentation
- Test thoroughly on multiple platforms
- Update README if needed
- Include relevant screenshots for UI changes

## Changelog

### Version 2.0.0 (Current)
- Enhanced AI analysis capabilities
- Improved UI/UX design
- Better calendar integration
- Performance optimizations
- Bug fixes and stability improvements

### Version 1.0.0
- Initial release
- Basic email analysis
- Simple reply suggestions
- Core UI components

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please:
- Open an issue on GitHub
- Email: beladiya.y@northeastern.edu
- Documentation: [Wiki](https://github.com/yashhbeladiya/emma-ai-email-companion/wiki)

## Acknowledgments

- Built with modern web technologies
- Inspired by productivity enhancement tools
- Thanks to all contributors and beta testers

---

**Emma - Making email smarter, one message at a time. 📧✨**
