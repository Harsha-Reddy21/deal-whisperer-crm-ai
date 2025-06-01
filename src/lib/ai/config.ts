// OpenAI Configuration and Utilities

import type { OpenAIConfig, OpenAIMessage, OpenAIResponse } from './types';

/**
 * Get OpenAI configuration from environment variables
 */
export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please check your .env file.');
  }

  return {
    apiKey,
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 1500
  };
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!apiKey && apiKey.length > 0;
}

/**
 * Make a request to OpenAI API
 */
export async function makeOpenAIRequest(
  messages: OpenAIMessage[],
  config?: Partial<OpenAIConfig>
): Promise<string> {
  const openAIConfig = getOpenAIConfig();
  const requestConfig = { ...openAIConfig, ...config };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${requestConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: requestConfig.model,
      messages,
      temperature: requestConfig.temperature,
      max_tokens: requestConfig.maxTokens
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data: OpenAIResponse = await response.json();
  const responseText = data.choices[0]?.message?.content;
  
  if (!responseText) {
    throw new Error('No response from OpenAI');
  }

  return responseText;
}

/**
 * Parse JSON response from OpenAI, handling markdown code blocks
 */
export function parseOpenAIJsonResponse<T>(responseText: string): T {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', responseText);
    throw new Error('Invalid response format from OpenAI');
  }
} 