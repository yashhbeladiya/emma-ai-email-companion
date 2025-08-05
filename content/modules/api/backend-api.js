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
      '/api/compose/refine': (data) => ({
        success: true,
        refinedText: this.refineText(data.userText)
      })
    };
  }

  async callAPI(endpoint, data) {
    const url = this.baseUrl + endpoint;
    
    try {
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
      console.error('API call failed:', error);
      // Return mock data for development
      const mockGenerator = this.mockResponses[endpoint];
      if (mockGenerator) {
        return { success: true, data: mockGenerator(data), isMock: true };
      }
      throw error;
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

  refineText(text) {
    return text
      .replace(/hey/gi, 'Hello')
      .replace(/thanks/gi, 'Thank you')
      .replace(/can't/gi, 'cannot')
      .replace(/won't/gi, 'will not');
  }
};