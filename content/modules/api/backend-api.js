// backend-api.js - API communication module with complete mock data
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
      '/api/reply/alternative': (data) => ({
        text: this.generateAlternativeReply(data.alternativeType, data.emailData)
      }),
      '/api/action': (data) => ({
        actions: this.extractActionItems(data)
      }),
      '/api/calendar/events': () => ({
        events: [
          { title: 'Team Meeting', date: new Date(), duration: 60 },
          { title: 'Project Review', date: new Date(Date.now() + 24*60*60*1000), duration: 30 }
        ]
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
    const text = ((data?.subject || '') + ' ' + (data?.body || '')).toLowerCase();
    const intents = window.AIEmailCompanion.Constants.EMAIL_INTENTS;
    
    if (text.includes('meeting') || text.includes('schedule')) return intents.MEETING_REQUEST;
    if (text.includes('question') || text.includes('?')) return intents.QUESTION;
    if (text.includes('feedback')) return intents.FEEDBACK;
    if (text.includes('task')) return intents.TASK_ASSIGNMENT;
    
    return intents.GENERAL;
  }

  determineTone(data) {
    const text = ((data?.subject || '') + ' ' + (data?.body || '')).toLowerCase();
    const tones = window.AIEmailCompanion.Constants.EMAIL_TONES;
    
    if (text.includes('urgent') || text.includes('asap')) return tones.URGENT;
    if (text.includes('dear') || text.includes('sincerely')) return tones.FORMAL;
    if (text.includes('thanks') || text.includes('appreciate')) return tones.FRIENDLY;
    
    return tones.PROFESSIONAL;
  }

  generateSummary(data) {
    if (!data?.body) return 'Email content summary not available';
    const sentences = data.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  generateSummaryPoints(data) {
    if (!data?.body) return ['Email content not available for analysis'];
    const sentences = data.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return [`Email from ${data.sender || 'Unknown'} regarding ${data.subject || 'Unknown subject'}`];
    return sentences.slice(0, 3).map(s => s.trim());
  }

  checkForMeeting(data) {
    if (!data) return false;
    const text = ((data.subject || '') + ' ' + (data.body || '')).toLowerCase();
    return ['meeting', 'call', 'conference', 'discussion'].some(keyword => text.includes(keyword));
  }

  extractActionItems(data) {
    if (!data?.body) return [];
    const text = ((data.subject || '') + ' ' + (data.body || '')).toLowerCase();
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
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }

  generateSubjectFromPrompt(prompt) {
    if (!prompt) return 'Email';
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('meeting') && lowerPrompt.includes('follow')) return 'Follow-up: Our Meeting Discussion';
    if (lowerPrompt.includes('thank')) return 'Thank You for Your Time';
    if (lowerPrompt.includes('proposal')) return 'Proposal for Your Review';
    if (lowerPrompt.includes('update')) return 'Project Update - Latest Progress';
    if (lowerPrompt.includes('schedule')) return 'Schedule Request';
    if (lowerPrompt.includes('question')) return 'Quick Question';
    if (lowerPrompt.includes('report')) return 'Report Submission';
    
    return 'Following Up on Our Discussion';
  }

  generateEmailFromPrompt(prompt, context) {
    let body = '';
    const lowerPrompt = (prompt || '').toLowerCase();
    
    // Opening based on context
    if (context && context.replyType === 'reply' && context.originalSender) {
      const firstName = context.originalSender.split(' ')[0];
      body = `Dear ${firstName},\n\n`;
    } else {
      body = 'Dear [Recipient],\n\n';
    }
    
    // Generate appropriate content based on prompt
    if (lowerPrompt.includes('thank') && lowerPrompt.includes('meeting')) {
      body += 'Thank you for taking the time to meet with me today. I found our discussion very valuable and appreciate your insights.\n\n';
      body += 'As discussed, I will follow up with the action items we identified and keep you updated on the progress.\n\n';
    } else if (lowerPrompt.includes('schedule') && lowerPrompt.includes('follow-up')) {
      body += 'I hope this email finds you well. Following our recent conversation, I would like to schedule a follow-up meeting to discuss the next steps.\n\n';
      body += 'Would you be available next week? I am flexible with timing and can adjust to your schedule.\n\n';
    } else if (lowerPrompt.includes('proposal')) {
      body += 'I am pleased to share the proposal we discussed. After careful consideration of your requirements, I have outlined a comprehensive solution that addresses your needs.\n\n';
      body += 'Please find the key highlights below, and I would be happy to discuss any questions you may have.\n\n';
    } else if (lowerPrompt.includes('update')) {
      body += 'I wanted to provide you with a quick update on the project status.\n\n';
      body += 'We have made significant progress this week and are on track to meet our upcoming milestones. The team has been working diligently to ensure quality deliverables.\n\n';
    } else {
      // Use the prompt as-is if provided
      if (prompt) {
        body += `${prompt}\n\n`;
      }
      body += 'Please let me know if you need any additional information or if you would like to discuss this further.\n\n';
    }
    
    // Professional closing
    body += 'I look forward to hearing from you.\n\n';
    body += 'Best regards,\n[Your Name]';
    
    return body;
  }

  generateAlternativeReply(type, emailData) {
    const alternatives = {
      'decline': `Thank you for reaching out. After careful consideration, I won't be able to accommodate this request at this time due to prior commitments. 
      
I appreciate your understanding and hope we can explore other opportunities in the future.

Best regards,
[Your Name]`,
      
      'reschedule': `Thank you for your email. Unfortunately, the proposed time doesn't work with my schedule. 

Would it be possible to reschedule? I'm available at the following times:
- [Day] at [Time]
- [Day] at [Time]
- [Day] at [Time]

Please let me know what works best for you.

Best regards,
[Your Name]`,
      
      'counter': `Thank you for your proposal. I appreciate the thought you've put into this.

I'd like to suggest a few modifications that might work better for both parties:
- [Your counter-proposal point 1]
- [Your counter-proposal point 2]

Would you be open to discussing these alternatives? I believe we can find a mutually beneficial solution.

Best regards,
[Your Name]`
    };
    
    return alternatives[type] || "Thank you for your email. I'll review this and get back to you with a detailed response soon.";
  }
};