import { makeOpenAIRequest, isOpenAIConfigured } from './config';
import type { OpenAIMessage } from './types';

export interface EmailSummaryRequest {
  emails: Array<{
    id: string;
    subject: string;
    from_email: string;
    from_name?: string;
    body_text: string;
    received_at: string;
    status: string;
    priority?: string;
  }>;
  summaryType: 'unread' | 'daily' | 'weekly' | 'custom' | 'single';
  userPreferences?: {
    focusAreas?: string[]; // e.g., ['urgent', 'partnerships', 'contracts']
    tone?: 'brief' | 'detailed' | 'executive';
    includeActions?: boolean;
  };
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface EmailSummaryResponse {
  title: string;
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  priorityEmails: Array<{
    id: string;
    subject: string;
    from: string;
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
  }>;
  statistics: {
    totalEmails: number;
    unreadCount: number;
    urgentCount: number;
    averageResponseTime?: string;
  };
  categories: Array<{
    name: string;
    count: number;
    emails: string[]; // email IDs
  }>;
}

export async function summarizeEmails(request: EmailSummaryRequest): Promise<EmailSummaryResponse> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI client not configured');
  }

  if (request.emails.length === 0) {
    return {
      title: 'No Emails to Summarize',
      summary: 'No emails found for the specified criteria.',
      keyInsights: [],
      actionItems: [],
      priorityEmails: [],
      statistics: {
        totalEmails: 0,
        unreadCount: 0,
        urgentCount: 0
      },
      categories: []
    };
  }

  const { emails, summaryType, userPreferences = {} } = request;
  const { tone = 'detailed', includeActions = true, focusAreas = [] } = userPreferences;

  // Prepare email data for AI analysis
  const emailsText = emails.map((email, index) => {
    return `
Email ${index + 1}:
Subject: ${email.subject}
From: ${email.from_name || email.from_email}
Date: ${new Date(email.received_at).toLocaleDateString()}
Status: ${email.status}
Priority: ${email.priority || 'normal'}
Content: ${email.body_text.substring(0, 500)}${email.body_text.length > 500 ? '...' : ''}
---`;
  }).join('\n');

  const focusAreasText = focusAreas.length > 0 
    ? `\nSpecial focus areas: ${focusAreas.join(', ')}`
    : '';

  const prompt = `
You are an AI email assistant helping to summarize and analyze emails for a busy professional. 

EMAILS TO ANALYZE:
${emailsText}

SUMMARY TYPE: ${summaryType}
TONE: ${tone}
INCLUDE ACTIONS: ${includeActions}${focusAreasText}

Please provide a comprehensive analysis in the following JSON format:

{
  "title": "A descriptive title for this email summary",
  "summary": "A ${tone} overview of the emails, highlighting key themes and important information",
  "keyInsights": ["3-5 key insights or patterns from the emails"],
  "actionItems": ["Specific action items that need attention (if includeActions is true)"],
  "priorityEmails": [
    {
      "id": "email_id",
      "subject": "email subject",
      "from": "sender name/email",
      "reason": "why this email is priority",
      "urgency": "low|medium|high|urgent"
    }
  ],
  "statistics": {
    "totalEmails": ${emails.length},
    "unreadCount": ${emails.filter(e => e.status === 'unread').length},
    "urgentCount": ${emails.filter(e => e.priority === 'urgent' || e.priority === 'high').length}
  },
  "categories": [
    {
      "name": "category name (e.g., 'Partnership Opportunities', 'Contract Reviews', 'Follow-ups')",
      "count": "number of emails in this category",
      "emails": ["array of email IDs in this category"]
    }
  ]
}

Guidelines:
- Focus on business-relevant information and actionable insights
- Identify urgent or time-sensitive emails
- Group emails by themes or categories
- Highlight opportunities, risks, and required responses
- Be concise but comprehensive
- If focusing on specific areas, prioritize those in the analysis
- For single email summaries, provide more detailed analysis
- For multiple emails, focus on patterns and priorities

Return only valid JSON without any additional text or formatting.
`;

  try {
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content: "You are an expert email analyst and executive assistant. Provide clear, actionable email summaries in valid JSON format."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await makeOpenAIRequest(messages, {
      model: "gpt-4",
      temperature: 0.3,
      maxTokens: 2000
    });

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const summaryData = JSON.parse(response);
    
    // Validate and ensure all required fields are present
    return {
      title: summaryData.title || `${summaryType} Email Summary`,
      summary: summaryData.summary || 'Summary not available',
      keyInsights: summaryData.keyInsights || [],
      actionItems: includeActions ? (summaryData.actionItems || []) : [],
      priorityEmails: summaryData.priorityEmails || [],
      statistics: {
        totalEmails: emails.length,
        unreadCount: emails.filter(e => e.status === 'unread').length,
        urgentCount: emails.filter(e => e.priority === 'urgent' || e.priority === 'high').length,
        ...summaryData.statistics
      },
      categories: summaryData.categories || []
    };

  } catch (error) {
    console.error('Error summarizing emails:', error);
    
    // Fallback summary if AI fails
    const unreadCount = emails.filter(e => e.status === 'unread').length;
    const urgentCount = emails.filter(e => e.priority === 'urgent' || e.priority === 'high').length;
    
    return {
      title: `${summaryType} Email Summary`,
      summary: `You have ${emails.length} emails to review. ${unreadCount} are unread and ${urgentCount} are marked as urgent or high priority. Please review your emails for important updates and required actions.`,
      keyInsights: [
        `${unreadCount} unread emails require attention`,
        urgentCount > 0 ? `${urgentCount} emails marked as urgent/high priority` : 'No urgent emails',
        'Manual review recommended for detailed analysis'
      ],
      actionItems: includeActions ? [
        'Review unread emails',
        urgentCount > 0 ? 'Address urgent emails first' : 'Process emails by priority',
        'Respond to time-sensitive requests'
      ] : [],
      priorityEmails: emails
        .filter(e => e.status === 'unread' || e.priority === 'urgent' || e.priority === 'high')
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          subject: e.subject,
          from: e.from_name || e.from_email,
          reason: e.status === 'unread' ? 'Unread email' : 'High priority',
          urgency: (e.priority as any) || 'medium'
        })),
      statistics: {
        totalEmails: emails.length,
        unreadCount,
        urgentCount
      },
      categories: [
        {
          name: 'Unread',
          count: unreadCount,
          emails: emails.filter(e => e.status === 'unread').map(e => e.id)
        },
        {
          name: 'High Priority',
          count: urgentCount,
          emails: emails.filter(e => e.priority === 'urgent' || e.priority === 'high').map(e => e.id)
        }
      ]
    };
  }
}

export async function summarizeSingleEmail(email: EmailSummaryRequest['emails'][0]): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI client not configured');
  }

  const prompt = `
Please provide a concise summary of this email:

Subject: ${email.subject}
From: ${email.from_name || email.from_email}
Date: ${new Date(email.received_at).toLocaleDateString()}
Content: ${email.body_text}

Provide a 2-3 sentence summary that captures:
1. The main purpose/request
2. Key information or details
3. Any required actions or responses

Keep it professional and actionable.
`;

  try {
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content: "You are an expert at summarizing business emails concisely and accurately."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await makeOpenAIRequest(messages, {
      model: "gpt-4",
      temperature: 0.3,
      maxTokens: 200
    });

    return response || 'Summary not available';
  } catch (error) {
    console.error('Error summarizing single email:', error);
    return `Email from ${email.from_name || email.from_email} regarding "${email.subject}". Please review the full content for details.`;
  }
} 