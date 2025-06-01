// Objection Handler AI Service

import type { ObjectionSuggestion } from './types';
import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

/**
 * Generate AI-powered objection handling suggestions
 */
export async function generateObjectionSuggestions(objection: string): Promise<ObjectionSuggestion[]> {
  try {
    console.log("Processing objection:", objection);

    const prompt = `You are an expert sales coach specializing in objection handling. A customer has raised the following objection:

"${objection}"

Please provide 3 different response strategies. For each strategy, provide:
1. A clear approach name (e.g., "Empathy + Value Reframe", "Question + Social Proof", etc.)
2. The exact response text (as if speaking directly to the customer)
3. An effectiveness score (70-95)
4. A brief explanation of why this approach works

Format your response as a JSON array with objects containing: approach, text, effectiveness, reasoning

Make the responses sound natural, empathetic, and professional. Focus on understanding the customer's concern while guiding them toward a positive outcome.`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales coach. Provide practical, empathetic objection handling strategies in valid JSON format."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages);
    console.log("OpenAI response:", responseText);
    
    // Parse the JSON response
    const suggestions = parseOpenAIJsonResponse<ObjectionSuggestion[]>(responseText);
    
    // Validate the response structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate each suggestion has required fields
    const validSuggestions = suggestions.filter(suggestion => 
      suggestion.approach && 
      suggestion.text && 
      typeof suggestion.effectiveness === 'number' && 
      suggestion.reasoning
    );

    if (validSuggestions.length === 0) {
      throw new Error('No valid suggestions received from OpenAI');
    }

    return validSuggestions;

  } catch (error) {
    console.error('Error generating objection suggestions:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI suggestions. Please check your connection and try again.');
  }
} 