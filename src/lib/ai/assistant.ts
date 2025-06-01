// AI Assistant Service

import { makeOpenAIRequest } from './config';

/**
 * Generate AI assistant response for general sales queries
 */
export async function generateAIAssistantResponse(prompt: string): Promise<string> {
  try {
    console.log("Generating AI assistant response for:", prompt);

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales assistant. Provide helpful, actionable advice for sales professionals. Be concise, practical, and focus on actionable insights. Format your responses clearly with bullet points or numbered lists when appropriate."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages, { maxTokens: 1000 });
    
    return responseText;

  } catch (error) {
    console.error('Error generating AI assistant response:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI response. Please check your connection and try again.');
  }
} 