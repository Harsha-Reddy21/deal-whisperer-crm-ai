// Email Generator AI Service

import { makeOpenAIRequest } from './config';

export interface EmailGenerationRequest {
  subject: string;
  recipientName?: string;
  recipientCompany?: string;
  context?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  senderName?: string;
  senderPosition?: string;
  senderCompany?: string;
  senderEmail?: string;
  senderPhone?: string;
}

export interface EmailGenerationResponse {
  content: string;
  suggestions?: string[];
}

/**
 * Generate email content based on subject line and context using AI
 */
export async function generateEmailContent(
  request: EmailGenerationRequest
): Promise<EmailGenerationResponse> {
  try {
    console.log("Generating email content for subject:", request.subject);

    const { 
      subject, 
      recipientName, 
      recipientCompany, 
      context, 
      tone = 'professional',
      senderName,
      senderPosition,
      senderCompany,
      senderEmail,
      senderPhone
    } = request;

    const prompt = `You are an expert email writer helping to compose a professional business email.

EMAIL DETAILS:
- Subject: "${subject}"
- Recipient Name: ${recipientName || 'the recipient'}
- Recipient Company: ${recipientCompany || 'their company'}
- Context: ${context || 'General business communication'}
- Tone: ${tone}

SENDER DETAILS:
- Sender Name: ${senderName || '[Your Name]'}
- Sender Position: ${senderPosition || '[Your Position]'}
- Sender Company: ${senderCompany || '[Your Company]'}
- Sender Email: ${senderEmail || '[Your Email]'}
- Sender Phone: ${senderPhone || '[Your Phone]'}

INSTRUCTIONS:
1. Write a complete, professional email body that matches the subject line
2. Use the ACTUAL recipient name "${recipientName || 'Dear Sir/Madam'}" in the greeting (not a placeholder)
3. Keep the tone ${tone} but professional
4. Make it relevant to the subject and context provided
5. Include a clear call-to-action if appropriate
6. Keep it concise but comprehensive (2-4 paragraphs)
7. Use the ACTUAL sender details in the signature (not placeholders)

FORMATTING REQUIREMENTS:
- Start with proper greeting using actual recipient name
- Use proper email formatting with line breaks between paragraphs
- End with professional signature using actual sender details
- Make it ready to send with minimal editing
- DO NOT use placeholders like [Recipient Name] or [Your Name] - use the actual names provided

SIGNATURE FORMAT:
Best regards,
${senderName || '[Your Name]'}
${senderPosition || '[Your Position]'}
${senderCompany || '[Your Company]'}
${senderEmail || '[Your Email]'}
${senderPhone ? senderPhone : '[Your Phone]'}

Generate ONLY the email body content (no subject line, as that's already provided).`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert business email writer. Generate professional, engaging email content that uses ACTUAL names and details provided, not placeholders. Always personalize the greeting and signature with real information when available."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages, { maxTokens: 1000 });
    console.log("OpenAI email generation response:", responseText);
    
    // Clean up the response - remove any extra formatting or subject line repetition
    let cleanContent = responseText.trim();
    
    // Remove any subject line that might have been included
    cleanContent = cleanContent.replace(/^Subject:.*$/gm, '').trim();
    
    // Remove any email headers that might have been included
    cleanContent = cleanContent.replace(/^(To:|From:|Date:).*$/gm, '').trim();
    
    // Ensure proper formatting with double line breaks between paragraphs
    if (!cleanContent.includes('\n\n')) {
      // Add paragraph breaks if not present
      cleanContent = cleanContent.replace(/\. ([A-Z])/g, '.\n\n$1');
    }

    // If recipient name was provided but AI still used placeholder, replace it
    if (recipientName && cleanContent.includes('[Recipient Name]')) {
      cleanContent = cleanContent.replace(/\[Recipient Name\]/g, recipientName);
    }
    
    // If sender details were provided but AI still used placeholders, replace them
    if (senderName && cleanContent.includes('[Your Name]')) {
      cleanContent = cleanContent.replace(/\[Your Name\]/g, senderName);
    }
    if (senderPosition && cleanContent.includes('[Your Position]')) {
      cleanContent = cleanContent.replace(/\[Your Position\]/g, senderPosition);
    }
    if (senderCompany && cleanContent.includes('[Your Company]')) {
      cleanContent = cleanContent.replace(/\[Your Company\]/g, senderCompany);
    }
    if (senderEmail && cleanContent.includes('[Your Email]')) {
      cleanContent = cleanContent.replace(/\[Your Email\]/g, senderEmail);
    }
    if (senderPhone && cleanContent.includes('[Your Phone]')) {
      cleanContent = cleanContent.replace(/\[Your Phone\]/g, senderPhone);
    }

    return {
      content: cleanContent,
      suggestions: [
        "Review the personalized greeting and signature for accuracy",
        "Add specific details about your company or product if relevant",
        "Include a clear next step or call-to-action",
        "Adjust the tone based on your relationship with the recipient"
      ]
    };

  } catch (error) {
    console.error('Error generating email content:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate email content. Please check your connection and try again.');
  }
} 