// backend-api.js - API communication module
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.BackendAPI = class {
  constructor() {
    this.baseUrl = window.AIEmailCompanion.Constants.API_BASE_URL;
    this.mockResponses = {
      '/api/email/intent': (data) => ({
        intent: this.determineIntent(data),
        shortTitle: `${data.sender}: ${data.subject.substring(0, 50)}...`
      }),
      '/api/email/tone': (data) => ({
        tone: this.determineTone(data),
        confidence: 0.85
      }),
      '/api/email/summary': (data) => ({
        summary: this.generateSummary(data),
        points: this.generateSummaryPoints(data)
      }),
      '/api/reply/quick': (data) => ({
        replies: [
          { text: "Thank you for your email. I'll review this and get back to you shortly.", tone: "Professional" },
          { text: "Thanks for reaching out! I appreciate the detailed information.", tone: "Friendly" },
          { text: "I acknowledge receipt of your email and will respond within 24 hours.", tone: "Formal" }
        ],
        alternatives: [
          { type: 'decline', text: 'Decline politely', label: 'Say No' },
          { type: 'reschedule', text: 'Request different time', label: 'Reschedule' }
        ]
      }),
      '/api/attachments/suggest': (data) => ({
        suggestions: [
          { description: 'Previous meeting notes', reason: 'Referenced in conversation' },
          { description: 'Project timeline document', reason: 'Relevant to meeting agenda' }
        ]
      }),
      '/api/meeting/extract': (data) => ({
        hasMeeting: this.checkForMeeting(data),
        description: 'Meeting scheduled for Friday 2-3 PM',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        title: 'Project Discussion Meeting'
      }),
      '/api/email/compose': (data) => {
        // Returns array of suggestions with tone, subject, and body
        const suggestions = [
          {
            tone: 'Professional',
            subject: data.context?.originalSubject ? 
              `Re: ${data.context.originalSubject}` : 
              'Following up on our discussion',
            body: `Dear ${data.context?.originalSender || '[Recipient Name]'},\n\nI hope this email finds you well. ${data.body}\n\nI look forward to hearing from you.\n\nBest regards,\n[Your Name]`
          },
          {
            tone: 'Friendly',
            subject: data.context?.originalSubject ? 
              `Re: ${data.context.originalSubject}` : 
              'Quick follow-up',
            body: `Hi ${data.context?.originalSender?.split(' ')[0] || 'there'},\n\nThanks for reaching out! ${data.body}\n\nLet me know if you have any questions!\n\nCheers,\n[Your Name]`
          }
        ];
        return suggestions;
      },
      '/api/email/compose/prompt': (data) => ({
        subject: this.generateSubjectFromPrompt(data.prompt),
        body: this.generateEmailFromPrompt(data.prompt, data.context)
      }),
      '/api/action': (data) => ({
        actions: this.extractActionItems(data)
      })
    };
  }

  async callAPI(endpoint, data) {
    const url = this.baseUrl + endpoint;
    
    try {
      // Try to make the actual API call
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.log('API call failed, using mock data:', error.message);
      // Always return mock data on error
      const mockGenerator = this.mockResponses[endpoint];
      if (mockGenerator) {
        console.log('Returning mock data for:', endpoint);
        return { success: true, data: mockGenerator(data), isMock: true };
      }
      
      // If no mock data available, return a default response
      console.log('No mock data available for:', endpoint);
      return { success: false, error: 'No mock data available' };
    }
  }

  // Mock data generation methods
  determineIntent(data) {
    const text = (data.subject + ' ' + data.body).toLowerCase();
    const intents = window.AIEmailCompanion.Constants.EMAIL_INTENTS;
    
    if (text.includes('meeting') || text.includes('schedule')) return intents.MEETING_REQUEST;
    if (text.includes('question') || text.includes('?')) return intents.QUESTION;
    if (text.includes('feedback')) return intents.FEEDBACK;
    if (text.includes('task')) return intents.TASK_ASSIGNMENT;
    
    return intents.GENERAL;
  }

  determineTone(data) {
    const text = (data.subject + ' ' + data.body).toLowerCase();
    const tones = window.AIEmailCompanion.Constants.EMAIL_TONES;
    
    if (text.includes('urgent') || text.includes('asap')) return tones.URGENT;
    if (text.includes('dear') || text.includes('sincerely')) return tones.FORMAL;
    if (text.includes('thanks') || text.includes('appreciate')) return tones.FRIENDLY;
    
    return tones.PROFESSIONAL;
  }

  generateSummary(data) {
    const sentences = data.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  generateSummaryPoints(data) {
    const sentences = data.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  checkForMeeting(data) {
    const text = (data.subject + ' ' + data.body).toLowerCase();
    return ['meeting', 'call', 'conference', 'discussion'].some(keyword => text.includes(keyword));
  }

  extractActionItems(data) {
    const text = (data.subject + ' ' + data.body).toLowerCase();
    const actions = [];
    
    // Common action patterns
    if (text.includes('complete') && text.includes('survey')) {
      actions.push({
        text: 'Complete the survey',
        link: this.extractFirstUrl(data.body)
      });
    }
    
    if (text.includes('submit') && (text.includes('homework') || text.includes('assignment'))) {
      actions.push({
        text: 'Submit your homework',
        link: null
      });
    }
    
    if (text.includes('review') && (text.includes('document') || text.includes('proposal'))) {
      actions.push({
        text: 'Review the document',
        link: this.extractFirstUrl(data.body)
      });
    }
    
    if (text.includes('fill') && text.includes('form')) {
      actions.push({
        text: 'Fill out the form',
        link: this.extractFirstUrl(data.body)
      });
    }
    
    if (text.includes('rsvp') || text.includes('confirm') && text.includes('attendance')) {
      actions.push({
        text: 'RSVP to the event',
        link: this.extractFirstUrl(data.body)
      });
    }
    
    return actions;
  }
  
  extractFirstUrl(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }
  
  generateSubjectFromPrompt(prompt) {
    const words = prompt.toLowerCase().split(' ');
    if (words.includes('meeting')) return 'Meeting Follow-up';
    if (words.includes('thank')) return 'Thank You';
    if (words.includes('proposal')) return 'Proposal for Your Review';
    if (words.includes('update')) return 'Project Update';
    return 'Following Up';
  }
  
  generateEmailFromPrompt(prompt, context) {
    let body = '';
    if (context && context.replyType === 'reply') {
      body = `Dear ${context.originalSender},\n\n`;
    } else {
      body = 'Dear [Recipient],\n\n';
    }
    body += `${prompt}\n\n`;
    body += 'Best regards,\n[Your Name]';
    return body;
  }
};