// Win/Loss Analyzer AI Service

import type { WinLossAnalysis } from './types';
import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

/**
 * Generate win/loss analysis from deals data
 */
export async function generateWinLossAnalysis(deals: any[]): Promise<WinLossAnalysis> {
  try {
    console.log("Analyzing win/loss patterns for deals:", deals);

    const dealsSummary = deals.map(deal => ({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      outcome: deal.outcome || (deal.stage === 'Closing' ? 'won' : (deal.probability < 20 ? 'lost' : 'in_progress'))
    }));

    const prompt = `You are an expert sales analyst. Analyze the following deals data to identify win/loss patterns:

Deals Data:
${JSON.stringify(dealsSummary, null, 2)}

Based on this data, provide a comprehensive win/loss analysis including:
1. outcome: Overall trend ("won" or "lost" based on majority)
2. primary_factors: Array of main factors contributing to wins/losses
3. contributing_factors: Array of secondary factors
4. lessons_learned: Array of key insights
5. recommendations: Array of actionable recommendations
6. confidence_score: Confidence in analysis (0-100)

Format your response as a JSON object with these exact fields.

Focus on identifying patterns, trends, and actionable insights that can improve future deal outcomes.`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales analyst. Provide comprehensive win/loss analysis in valid JSON format."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages);
    
    // Parse the JSON response
    const analysis = parseOpenAIJsonResponse<WinLossAnalysis>(responseText);
    
    return analysis;

  } catch (error) {
    console.error('Error generating win/loss analysis:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate win/loss analysis. Please check your connection and try again.');
  }
} 