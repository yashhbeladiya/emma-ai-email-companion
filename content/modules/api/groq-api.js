// groq-api.js - Groq API Integration with LLaMA 3.3 70B
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.GroqAPI = class {
  constructor() {
    this.apiKey = 'YOUR_API_KEY_HERE';
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile'; // Best model for our use case
    this.cache = new Map(); // Cache responses to avoid repeated API calls
  }

  async analyzeEmail(emailData) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(emailData);
      if (this.cache.has(cacheKey)) {
        console.log('Using cached response');
        return this.cache.get(cacheKey);
      }

      // Check if it's a no-reply email first (simple check)
      if (this.isObviousNoReply(emailData)) {
        return this.getNoReplyResponse(emailData);
      }

      const prompt = this.createComprehensivePrompt(emailData);
      const response = await this.callGroqAPI(prompt);
      
      // Parse and validate the response
      const parsedResponse = this.parseAIResponse(response);
      
      // Cache the response
      this.cache.set(cacheKey, parsedResponse);
      
      return parsedResponse;
    } catch (error) {
      console.error('Groq API error:', error);
      return this.getFallbackResponse(emailData);
    }
  }

  createComprehensivePrompt(emailData) {
    const prompt = `Analyze this email and provide a comprehensive JSON response with all requested information.

EMAIL DATA:
From: ${emailData.sender || 'Unknown'}
Subject: ${emailData.subject || 'No subject'}
Body: ${emailData.body || 'No content'}

INSTRUCTIONS:
You are an AI email assistant. Analyze the email above and return ONLY a valid JSON object (no markdown, no explanation) with the following structure:

{
  "intent": "One of: Meeting Request, Question, Feedback, Task Assignment, Proposal, Information, Complaint, Thank You, Follow-up, Introduction, Request, Announcement",
  "tone": "One of: Professional, Friendly, Formal, Casual, Urgent, Neutral, Appreciative, Concerned, Enthusiastic",
  "sentiment": "One of: Positive, Negative, Neutral",
  "priority": "One of: High, Medium, Low",
  "isNoReply": false,
  "requiresResponse": true or false,
  "estimatedResponseTime": "Immediate, Today, This Week, No Rush",
  "summary": {
    "brief": "One sentence summary under 100 characters",
    "points": ["Key point 1", "Key point 2", "Key point 3"] // Maximum 3 points, each under 150 characters
  },
  "quickReplies": [
    {
      "text": "Complete reply text with proper formatting:\n\nDear [Name],\n\n[Response content with proper paragraphs]\n\nBest regards,\n[Your name]",
      "tone": "Professional",
      "intent": "Acknowledge"
    },
    {
      "text": "Different complete reply with proper structure:\n\nHi [Name],\n\n[Response content with line breaks between paragraphs]\n\nThank you,\n[Your name]",
      "tone": "Friendly", 
      "intent": "Accept"
    },
    {
      "text": "Another properly formatted reply option:\n\nDear [Name],\n\n[Well-structured response]\n\nSincerely,\n[Your name]",
      "tone": "Formal",
      "intent": "RequestInfo"
    }
  ],
  "actionItems": [
    {
      "text": "Specific action needed",
      "deadline": "When it's due if mentioned",
      "priority": "High/Medium/Low"
    }
  ],
  "meeting": {
    "detected": true or false,
    "details": {
      "purpose": "Meeting purpose if mentioned",
      "suggestedTimes": ["Time suggestion 1", "Time suggestion 2"],
      "duration": "Estimated duration",
      "type": "In-person, Video Call, Phone Call, or Undefined"
    }
  },
  "attachmentSuggestions": [
    {
      "type": "Document type needed",
      "reason": "Why this might be needed"
    }
  ],
  "contextClues": {
    "relationship": "New Contact, Colleague, Client, Manager, Friend, Unknown",
    "previousInteraction": true or false,
    "formality": "Very Formal, Formal, Semi-formal, Casual, Very Casual"
  },
  "suggestedFollowUp": {
    "action": "What to do next",
    "timing": "When to do it"
  },
  "keywords": ["keyword1", "keyword2", "keyword3"], // Important keywords from the email
  "entities": {
    "people": ["Name1", "Name2"],
    "organizations": ["Org1", "Org2"],
    "dates": ["Date1", "Date2"],
    "locations": ["Location1"]
  }
}

IMPORTANT RULES:
1. Quick replies should be complete, ready-to-send responses, not templates
2. Each quick reply should be 2-4 sentences and directly address the email content
3. Make quick replies natural and contextual, mentioning specific details from the email
4. If it's a personal/friendly email, make replies warm and conversational
5. If it's professional, keep replies crisp but cordial
6. Action items should only include things the recipient needs to do
7. Return ONLY valid JSON, no additional text or markdown
8. Adapt the formality of quick replies to match the sender's tone
9. If meeting is mentioned, extract ALL possible details about it`;

    return prompt;
  }

  async callGroqAPI(prompt) {
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert email analysis assistant. You always respond with valid JSON only, no markdown formatting, no code blocks, just pure JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent, focused responses
      max_tokens: 2000,
      top_p: 0.9,
      stream: false
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseAIResponse(responseText) {
    try {
      // Clean the response - remove any markdown formatting if present
      let cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate and ensure all required fields exist
      return this.validateAndNormalizeResponse(parsed);
    } catch (error) {
      console.error('Error parsing AI response:', error, responseText);
      throw error;
    }
  }

  validateAndNormalizeResponse(response) {
    // Ensure all required fields exist with defaults
    const normalized = {
      intent: response.intent || 'General',
      tone: response.tone || 'Professional',
      sentiment: response.sentiment || 'Neutral',
      priority: response.priority || 'Medium',
      isNoReply: response.isNoReply || false,
      requiresResponse: response.requiresResponse !== false,
      estimatedResponseTime: response.estimatedResponseTime || 'This Week',
      summary: {
        brief: response.summary?.brief || 'Email received',
        points: response.summary?.points || []
      },
      quickReplies: response.quickReplies || [],
      actionItems: response.actionItems || [],
      meeting: response.meeting || { detected: false, details: {} },
      attachmentSuggestions: response.attachmentSuggestions || [],
      contextClues: response.contextClues || {},
      suggestedFollowUp: response.suggestedFollowUp || {},
      keywords: response.keywords || [],
      entities: response.entities || {}
    };

    // Ensure quick replies have required fields and proper formatting
    normalized.quickReplies = normalized.quickReplies.map(reply => ({
      text: this.formatEmailBody(reply.text || 'Thank you for your email.'),
      tone: reply.tone || 'Professional',
      intent: reply.intent || 'Acknowledge'
    }));

    return normalized;
  }

  async generateComposeSuggestions(emailText, context) {
    try {
      const prompt = this.createComposePrompt(emailText, context);
      const response = await this.callGroqAPI(prompt);
      return this.parseComposeResponse(response);
    } catch (error) {
      console.error('Error generating compose suggestions:', error);
      return this.getFallbackComposeSuggestions();
    }
  }

  createComposePrompt(emailText, context) {
    const contextInfo = context?.replyType === 'reply' ? 
      `This is a REPLY to an email from ${context.originalSender} with subject "${context.originalSubject}".` :
      'This is a NEW email being composed.';

    return `Based on the following draft email text, provide two polished versions with different tones.

${contextInfo}

DRAFT TEXT:
${emailText}

Return ONLY a valid JSON array with exactly 2 suggestions:
[
  {
    "tone": "Professional",
    "subject": "Appropriate subject line",
    "body": "Complete polished email with proper greeting, body, and signature"
  },
  {
    "tone": "Friendly",
    "subject": "Appropriate subject line", 
    "body": "Complete polished email with warmer tone"
  }
]

Make each version complete and ready to send. Include appropriate greetings and closings.`;
  }

  parseComposeResponse(responseText) {
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Error parsing compose response:', error);
      return this.getFallbackComposeSuggestions();
    }
  }

  async generateEmailFromPrompt(prompt, context) {
    try {
      const systemPrompt = context?.replyType === 'reply' ?
        `Generate a reply email to ${context.originalSender} regarding "${context.originalSubject}".` :
        'Generate a new email based on the user\'s instructions.';

      const fullPrompt = `${systemPrompt}

User's request: ${prompt}

Return ONLY a valid JSON object:
{
  "subject": "Appropriate subject line",
  "body": "Complete email body with proper formatting"
}

CRITICAL FORMATTING REQUIREMENTS:
1. Start with appropriate greeting (Dear [Name], / Hi [Name], / Hello,)
2. Add TWO line breaks after greeting
3. Write content in well-structured paragraphs
4. Add DOUBLE line breaks between paragraphs (\\n\\n)
5. Keep paragraphs concise (2-4 sentences max)
6. Add TWO line breaks before closing
7. End with professional closing (Best regards, / Sincerely, / Thank you,)
8. Add line break after closing for signature

EXAMPLE STRUCTURE:
"Dear John,\\n\\nThank you for reaching out about the project timeline.\\n\\nI've reviewed the requirements and believe we can meet the deadline with the current resources. However, I'd like to schedule a brief meeting to discuss the specific deliverables and ensure we're aligned on expectations.\\n\\nWould you be available for a 30-minute call this week? I'm flexible with timing and can work around your schedule.\\n\\nBest regards,\\n[Your name]"

Make the email natural, professional, and ready to send with proper spacing and structure.`;

      const response = await this.callGroqAPI(fullPrompt);
      const parsed = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      
      // Ensure proper formatting
      if (parsed.body) {
        parsed.body = this.formatEmailBody(parsed.body);
      }
      
      return parsed;
    } catch (error) {
      console.error('Error generating email from prompt:', error);
      return {
        subject: 'Following up',
        body: this.formatEmailBody(`Dear [Recipient],\n\n${prompt}\n\nBest regards,\n[Your name]`)
      };
    }
  }

  formatEmailBody(body) {
    // Ensure proper formatting for email body
    let formatted = body;
    
    // Fix greeting formatting - ensure double line break after greeting
    formatted = formatted.replace(/(Dear|Hi|Hello)\s+([^,\n]+),?\s*(?!\n\n)/gi, '$1 $2,\n\n');
    
    // Ensure paragraphs are separated by double line breaks
    // Split on single line breaks and rejoin with double where appropriate
    const lines = formatted.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        newLines.push(line);
        // Add double break after sentences that end paragraphs
        if (line.match(/[.!?]$/) && i < lines.length - 1 && lines[i + 1].trim()) {
          // Check if next line starts a new thought
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.match(/^(And|But|However|Also|Additionally|Furthermore|Moreover)/i)) {
            newLines.push(''); // Add empty line for paragraph break
          }
        }
      } else if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push(''); // Preserve intentional empty lines
      }
    }
    
    formatted = newLines.join('\n');
    
    // Fix signature formatting - ensure double line break before closing
    formatted = formatted.replace(/(Best regards|Sincerely|Thank you|Thanks),?\s*(?!\n)/gi, '\n\n$1,\n');
    
    // Clean up excessive line breaks (max 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim and ensure it doesn't start/end with line breaks
    formatted = formatted.trim();
    
    return formatted;
  }

  // Helper methods
  generateCacheKey(emailData) {
    return `${emailData.sender}_${emailData.subject}_${emailData.body?.substring(0, 100)}`;
  }

  isObviousNoReply(emailData) {
    const sender = (emailData.sender || '').toLowerCase();
    const email = (emailData.senderEmail || '').toLowerCase();
    
    const noReplyPatterns = ['no-reply@', 'noreply@', 'do-not-reply@', 'automated@', 'notification@'];
    return noReplyPatterns.some(pattern => email.includes(pattern) || sender.includes(pattern));
  }

  getNoReplyResponse(emailData) {
    return {
      intent: 'Announcement',
      tone: 'Neutral',
      sentiment: 'Neutral',
      priority: 'Low',
      isNoReply: true,
      requiresResponse: false,
      estimatedResponseTime: 'No Response Needed',
      summary: {
        brief: 'Automated notification - no response needed',
        points: this.extractKeyPoints(emailData.body)
      },
      quickReplies: [],
      actionItems: [],
      meeting: { detected: false, details: {} },
      attachmentSuggestions: [],
      contextClues: { relationship: 'System', formality: 'Formal' },
      suggestedFollowUp: { action: 'Archive', timing: 'Now' },
      keywords: [],
      entities: {}
    };
  }

  extractKeyPoints(body) {
    if (!body) return [];
    const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim().substring(0, 150));
  }

  getFallbackResponse(emailData) {
    // Enhanced fallback that still provides useful analysis
    return {
      intent: this.detectIntent(emailData),
      tone: this.detectTone(emailData),
      sentiment: 'Neutral',
      priority: 'Medium',
      isNoReply: false,
      requiresResponse: true,
      estimatedResponseTime: 'This Week',
      summary: {
        brief: emailData.subject || 'Email received',
        points: this.extractKeyPoints(emailData.body)
      },
      quickReplies: this.generateFallbackReplies(emailData),
      actionItems: [],
      meeting: { detected: false, details: {} },
      attachmentSuggestions: [],
      contextClues: {},
      suggestedFollowUp: {},
      keywords: [],
      entities: {}
    };
  }

  detectIntent(emailData) {
    const text = ((emailData.subject || '') + ' ' + (emailData.body || '')).toLowerCase();
    if (text.includes('meeting') || text.includes('schedule')) return 'Meeting Request';
    if (text.includes('?')) return 'Question';
    if (text.includes('thank')) return 'Thank You';
    if (text.includes('urgent') || text.includes('asap')) return 'Request';
    return 'Information';
  }

  detectTone(emailData) {
    const text = ((emailData.subject || '') + ' ' + (emailData.body || '')).toLowerCase();
    if (text.includes('urgent') || text.includes('asap')) return 'Urgent';
    if (text.includes('thanks') || text.includes('appreciate')) return 'Appreciative';
    if (text.includes('hi') || text.includes('hey')) return 'Friendly';
    return 'Professional';
  }

  generateFallbackReplies(emailData) {
    const isQuestion = (emailData.body || '').includes('?');
    const isMeeting = (emailData.body || '').toLowerCase().includes('meeting');
    
    const replies = [];
    
    if (isQuestion) {
      replies.push({
        text: `Thank you for your question. I'll review this carefully and get back to you with a detailed response shortly.`,
        tone: 'Professional',
        intent: 'Acknowledge'
      });
    }
    
    if (isMeeting) {
      replies.push({
        text: `Thank you for reaching out about scheduling a meeting. I'll check my calendar and send you my availability soon.`,
        tone: 'Professional',
        intent: 'Accept'
      });
    }
    
    // Always include a general acknowledgment
    replies.push({
      text: `Thank you for your email. I've received your message and will respond as soon as possible.`,
      tone: 'Professional',
      intent: 'Acknowledge'
    });
    
    return replies.slice(0, 3);
  }

  getFallbackComposeSuggestions() {
    return [
      {
        tone: 'Professional',
        subject: 'Following up',
        body: 'Dear [Recipient],\n\nI hope this email finds you well.\n\n[Your message here]\n\nBest regards,\n[Your name]'
      },
      {
        tone: 'Friendly',
        subject: 'Quick note',
        body: 'Hi [Name],\n\nHope you\'re doing great!\n\n[Your message here]\n\nThanks,\n[Your name]'
      }
    ];
  }

  // Clear cache method (useful for memory management)
  clearCache() {
    this.cache.clear();
    console.log('Groq API cache cleared');
  }
};