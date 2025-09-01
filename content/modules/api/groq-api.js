// groq-api.js - Groq API Integration with Proper Email Formatting
window.AIEmailCompanion = window.AIEmailCompanion || {};

window.AIEmailCompanion.GroqAPI = class {
  constructor() {
    this.apiKey = 'YOUR_API_KEY_HERE';
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
    this.cache = new Map();
  }

  async analyzeEmail(emailData) {
    try {
      const cacheKey = this.generateCacheKey(emailData);
      if (this.cache.has(cacheKey)) {
        console.log('Using cached response');
        return this.cache.get(cacheKey);
      }

      if (this.isObviousNoReply(emailData)) {
        return this.getNoReplyResponse(emailData);
      }

      const prompt = this.createComprehensivePrompt(emailData);
      const response = await this.callGroqAPI(prompt);
      const parsedResponse = this.parseAIResponse(response);
      
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
    "points": ["Key point 1", "Key point 2", "Key point 3"]
  },
  "quickReplies": [
    {
      "text": "Dear [Name],\\n\\nThank you for your email. [Response content]\\n\\nBest regards,\\n[Your name]",
      "tone": "Professional",
      "intent": "Acknowledge"
    },
    {
      "text": "Hi [Name],\\n\\nThanks for reaching out! [Response content]\\n\\nCheers,\\n[Your name]",
      "tone": "Friendly", 
      "intent": "Accept"
    },
    {
      "text": "Dear [Name],\\n\\nI appreciate you contacting me. [Response content]\\n\\nSincerely,\\n[Your name]",
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
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "entities": {
    "people": ["Name1", "Name2"],
    "organizations": ["Org1", "Org2"],
    "dates": ["Date1", "Date2"],
    "locations": ["Location1"]
  }
}

IMPORTANT: For quickReplies, use \\n for line breaks to create proper paragraph spacing.`;

    return prompt;
  }

  async callGroqAPI(prompt) {
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert email analysis assistant. You always respond with valid JSON only, no markdown formatting, no code blocks, just pure JSON. When creating email text, use \\n for line breaks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
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
      let cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedResponse);
      return this.validateAndNormalizeResponse(parsed);
    } catch (error) {
      console.error('Error parsing AI response:', error, responseText);
      throw error;
    }
  }

  validateAndNormalizeResponse(response) {
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

    // Format quick replies properly
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
      const suggestions = this.parseComposeResponse(response);
      
      // Ensure all suggestions are properly formatted
      return suggestions.map(s => ({
        ...s,
        body: this.formatEmailBody(s.body)
      }));
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
    "body": "Dear [Name],\\n\\nFirst paragraph of the email body.\\n\\nSecond paragraph if needed.\\n\\nBest regards,\\n[Your name]"
  },
  {
    "tone": "Friendly",
    "subject": "Appropriate subject line", 
    "body": "Hi [Name],\\n\\nFirst paragraph with warmer tone.\\n\\nSecond paragraph if needed.\\n\\nThanks,\\n[Your name]"
  }
]

IMPORTANT: Use \\n\\n between paragraphs and \\n for single line breaks. Structure emails properly with greeting, body paragraphs, and closing.`;
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

IMPORTANT EMAIL FORMATTING RULES:
1. Start with greeting: "Dear [Name]," or "Hi [Name],"
2. Add TWO line breaks (\\n\\n) after greeting
3. Write first paragraph
4. Add TWO line breaks (\\n\\n) between paragraphs
5. Keep paragraphs concise (2-4 sentences)
6. Add TWO line breaks (\\n\\n) before closing
7. End with closing: "Best regards," or "Sincerely,"
8. Add ONE line break (\\n) after closing
9. End with "[Your name]"

EXAMPLE FORMAT:
"Dear John,\\n\\nThank you for reaching out about the project timeline.\\n\\nI've reviewed the requirements and believe we can meet the deadline. I'd like to schedule a meeting to discuss the deliverables.\\n\\nWould you be available for a call this week?\\n\\nBest regards,\\n[Your name]"`;

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
    if (!body) return '';
    
    // First, ensure we have proper line breaks
    let formatted = body;
    
    // Fix common formatting issues
    // 1. Ensure greeting has double line break after it
    formatted = formatted.replace(/(Dear|Hi|Hello|Hey)\s+([^,\n]+),?\s*/gi, (match, greeting, name) => {
      return `${greeting} ${name},\n\n`;
    });
    
    // 2. Ensure closing has double line break before it
    formatted = formatted.replace(/\n*(Best regards|Sincerely|Thank you|Thanks|Regards|Cheers|Best),?\s*/gi, (match, closing) => {
      return `\n\n${closing},\n`;
    });
    
    // 3. Ensure signature is on new line
    formatted = formatted.replace(/,\s*\[/g, ',\n[');
    
    // 4. Fix paragraph breaks - ensure double line breaks between substantial text blocks
    const lines = formatted.split('\n');
    const formattedLines = [];
    let lastWasEmpty = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line) {
        // Check if this line ends a paragraph (ends with period, exclamation, or question mark)
        const endsWithPunctuation = /[.!?]$/.test(line);
        const nextLine = lines[i + 1]?.trim();
        const nextLineStartsNewThought = nextLine && 
          !/^(and|but|however|also|additionally|furthermore|moreover)/i.test(nextLine);
        
        formattedLines.push(line);
        
        // Add paragraph break if this line ends with punctuation and next line starts new thought
        if (endsWithPunctuation && nextLineStartsNewThought && !lastWasEmpty) {
          formattedLines.push(''); // Add empty line for paragraph break
          lastWasEmpty = true;
        } else {
          lastWasEmpty = false;
        }
      } else {
        // Preserve intentional empty lines but avoid multiple consecutive ones
        if (!lastWasEmpty) {
          formattedLines.push('');
          lastWasEmpty = true;
        }
      }
    }
    
    formatted = formattedLines.join('\n');
    
    // 5. Clean up excessive line breaks (more than 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // 6. Ensure it doesn't start or end with line breaks
    formatted = formatted.trim();
    
    return formatted;
  }

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
        text: this.formatEmailBody(`Dear [Name],\n\nThank you for your question. I'll review this carefully and get back to you with a detailed response shortly.\n\nBest regards,\n[Your name]`),
        tone: 'Professional',
        intent: 'Acknowledge'
      });
    }
    
    if (isMeeting) {
      replies.push({
        text: this.formatEmailBody(`Dear [Name],\n\nThank you for reaching out about scheduling a meeting.\n\nI'll check my calendar and send you my availability soon.\n\nBest regards,\n[Your name]`),
        tone: 'Professional',
        intent: 'Accept'
      });
    }
    
    replies.push({
      text: this.formatEmailBody(`Dear [Name],\n\nThank you for your email. I've received your message and will respond as soon as possible.\n\nBest regards,\n[Your name]`),
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
        body: this.formatEmailBody('Dear [Recipient],\n\nI hope this email finds you well.\n\n[Your message here]\n\nBest regards,\n[Your name]')
      },
      {
        tone: 'Friendly',
        subject: 'Quick note',
        body: this.formatEmailBody('Hi [Name],\n\nHope you\'re doing great!\n\n[Your message here]\n\nThanks,\n[Your name]')
      }
    ];
  }

  clearCache() {
    this.cache.clear();
    console.log('Groq API cache cleared');
  }
};