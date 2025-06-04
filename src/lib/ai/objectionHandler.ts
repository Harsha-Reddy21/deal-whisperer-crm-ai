// Objection Handler AI Service

import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';
import { ObjectionSuggestion } from './types';

export interface ObjectionHandlerRequest {
  dealId: string;
  userId: string;
  objection: string; // The customer objection text
  dealInfo?: {
    title: string;
    description: string;
    stage: string;
    value: number;
    probability?: number; // Made optional since we removed probability feature
    activities?: Array<{
      type: string;
      subject: string;
      description: string;
      date: string;
    }>;
  };
}

export interface ObjectionHandlerResponse {
  suggestions: ObjectionSuggestion[];
  reasoning: string;
  deal_context: string;
}

/**
 * Generate AI-powered responses to customer objections for a specific deal
 * Takes into account the deal context and previous activities
 */
export async function generateObjectionSuggestions(
  request: ObjectionHandlerRequest
): Promise<ObjectionHandlerResponse> {
  try {
    // Define the system prompt
    const systemPrompt = `You are an expert sales advisor helping a salesperson respond to customer objections for a specific deal.
Analyze the provided deal context and customer objection, then provide strategic responses.
If no deal activities or description are provided, note that there's not enough context to provide customized suggestions.
Your suggestions should be personalized based on the deal's specific context when available.

IMPORTANT: Format your response as a valid JSON object with these fields:
- suggestions: Array of objection handling strategies, each with 'approach', 'text', 'effectiveness', and 'reasoning'
- reasoning: Your overall reasoning for the suggestions
- deal_context: How the suggestions relate to the deal context`;

    // Create the user message
    const userMessage = `Please analyze this customer objection for a deal and provide strategic responses:

DEAL INFORMATION:
${request.dealInfo ? `
Title: ${request.dealInfo.title || 'N/A'}
Description: ${request.dealInfo.description || 'N/A'}
Stage: ${request.dealInfo.stage || 'N/A'}
Value: $${request.dealInfo.value?.toLocaleString() || 'N/A'}${request.dealInfo.probability ? `
Probability: ${request.dealInfo.probability}%` : ''}
` : 'No deal information available'}

${request.dealInfo?.activities && request.dealInfo.activities.length > 0 
  ? `DEAL ACTIVITIES:
${request.dealInfo.activities.map(a => 
  `- ${a.date}: ${a.type} - ${a.subject}
   ${a.description ? `   Details: ${a.description}` : ''}`
).join('\n')}` 
  : 'No deal activities available'}
  
CUSTOMER OBJECTION:
"${request.objection}"

Provide me with:
1. At least 3 strategic responses to this objection
2. Your reasoning behind the suggestions
3. How the responses relate to the specific deal context

If there's not enough context from the deal activities or description, please indicate this in your response.`;
    console.log('User message:', userMessage);
    console.log('System prompt:', systemPrompt);
    // Make the API request
    const response = await makeOpenAIRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], {
      temperature: 0.7,
      maxTokens: 2000
    });

    // Parse the response
    const result = parseOpenAIJsonResponse<ObjectionHandlerResponse>(response);

    return {
      suggestions: result.suggestions || [],
      reasoning: result.reasoning || 'No reasoning provided',
      deal_context: result.deal_context || 'No deal context available'
    };
  } catch (error) {
    console.error('Error generating objection suggestions:', error);
    throw new Error('Failed to generate responses to customer objection');
  }
} 