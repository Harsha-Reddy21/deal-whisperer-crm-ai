// Deal Coach AI Service

import type { DealCoachRecommendation } from './types';
import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

/**
 * Generate AI-powered deal coaching recommendations
 */
export async function generateDealCoachRecommendations(deal: any, context?: any): Promise<DealCoachRecommendation[]> {
  try {
    console.log("Analyzing deal for AI coaching:", deal);

    // Enhanced context for better AI analysis
    const contextInfo = context ? `
    
DEAL CONTEXT ANALYSIS:
- Activities: ${context.activities?.length || 0} total activities
- Recent Activities: ${context.activities?.slice(0, 3).map((a: any) => `${a.type}: ${a.subject}`).join(', ') || 'None'}
- Email Engagement: ${context.emails?.length || 0} emails sent
- Email Opens: ${context.emails?.filter((e: any) => e.opened_at).length || 0}
- Email Clicks: ${context.emails?.filter((e: any) => e.clicked_at).length || 0}
- Deal Age: ${context.dealAge || 0} days
- Days Since Last Activity: ${context.lastActivityDays || 0}
- Contact Information: ${context.contact ? `${context.contact.name} (${context.contact.title || 'Unknown title'})` : 'No contact linked'}
- Files/Documents: ${context.files?.length || 0} files attached
- Comments/Notes: ${context.comments?.length || 0} comments

BUYER BEHAVIOR SIGNALS:
- Email engagement rate: ${context.emails?.length > 0 ? Math.round((context.emails.filter((e: any) => e.opened_at).length / context.emails.length) * 100) : 0}%
- Response pattern: ${context.lastActivityDays < 3 ? 'Highly responsive' : context.lastActivityDays < 7 ? 'Moderately responsive' : 'Low responsiveness'}
- Deal velocity: ${context.dealAge > 0 ? Math.round(deal.probability / context.dealAge * 30) : 0} probability points per month
` : '';

    const prompt = `You are an expert sales coach with access to comprehensive deal data and historical patterns. Analyze this deal and provide 3 strategic recommendations.

DEAL INFORMATION:
Title: ${deal.title}
Company: ${deal.company}
Value: $${deal.value}
Current Stage: ${deal.stage}
Probability: ${deal.probability}%
Contact: ${deal.contact_name}
Last Activity: ${deal.last_activity}
Next Step: ${deal.next_step}
${contextInfo}

ANALYSIS FRAMEWORK:
1. Pattern Matching: Compare this deal against successful/failed deals with similar characteristics
2. Risk Assessment: Identify potential red flags or stalling indicators
3. Opportunity Identification: Find acceleration opportunities based on deal stage and context
4. Timing Analysis: Evaluate communication cadence and follow-up timing
5. Engagement Quality: Assess buyer engagement and interest level

For each recommendation, provide:
1. Type: "high", "medium", or "low" (priority level based on impact and urgency)
2. Title: Clear, actionable title (max 50 characters)
3. Description: Detailed explanation with specific data points and patterns (100-150 words)
4. Action: Specific, immediate action to take (50-75 words)
5. Impact: Expected impact with percentage (e.g., "+15% close probability")
6. Reasoning: Why this recommendation works, referencing sales psychology and best practices (75-100 words)

PRIORITIZATION CRITERIA:
- High: Critical timing issues, major risk factors, or high-impact opportunities
- Medium: Process improvements, moderate risks, or standard best practices
- Low: Optimization opportunities, minor improvements, or preventive measures

Focus on:
- Data-driven insights from the deal context
- Specific, actionable recommendations
- Clear reasoning based on sales patterns
- Measurable impact predictions
- Urgency based on deal characteristics

Format your response as a JSON array with objects containing: type, title, description, action, impact, reasoning

Ensure recommendations are practical, specific to this deal's context, and backed by sales methodology.`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales coach and deal strategist. Provide practical, data-driven recommendations in valid JSON format. Focus on actionable insights that sales reps can implement immediately."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages, { maxTokens: 2000 });
    console.log("OpenAI response:", responseText);
    
    // Parse the JSON response
    const recommendations = parseOpenAIJsonResponse<DealCoachRecommendation[]>(responseText);
    
    // Validate the response structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate each recommendation has required fields
    const validRecommendations = recommendations.filter(recommendation => 
      recommendation.type && 
      recommendation.title && 
      recommendation.description &&
      recommendation.action && 
      recommendation.impact &&
      recommendation.reasoning
    );

    if (validRecommendations.length === 0) {
      throw new Error('No valid recommendations received from OpenAI');
    }

    return validRecommendations;

  } catch (error) {
    console.error('Error generating deal coach recommendations:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI recommendations. Please check your connection and try again.');
  }
}

/**
 * Analyze closed deals (won/lost) and provide next steps to improve closing probability
 */
export async function analyzeClosedDealsForCoaching(currentDeal: any, closedDeals: any[]): Promise<DealCoachRecommendation[]> {
  try {
    console.log("Analyzing closed deals for coaching insights:", { currentDeal, closedDealsCount: closedDeals.length });

    if (closedDeals.length === 0) {
      throw new Error('No closed deals available for analysis');
    }

    // Extract and prepare closed deals data
    const wonDeals = closedDeals.filter(deal => deal.deal_status === 'won' || deal.outcome === 'won');
    const lostDeals = closedDeals.filter(deal => deal.deal_status === 'lost' || deal.outcome === 'lost');

    // Prepare current deal summary
    const currentDealSummary = {
      title: currentDeal.title,
      company: currentDeal.company,
      value: currentDeal.value,
      stage: currentDeal.stage,
      probability: currentDeal.probability,
      next_step: currentDeal.next_step,
      contact_name: currentDeal.contact_name,
      last_activity: currentDeal.last_activity
    };

    const prompt = `You are an expert sales coach with access to historical deal data. Analyze this current deal against patterns from won and lost deals to provide 3 strategic coaching recommendations.

CURRENT DEAL:
${JSON.stringify(currentDealSummary, null, 2)}

WON DEALS (${wonDeals.length}):
${JSON.stringify(wonDeals.slice(0, 5).map(deal => ({
  title: deal.title,
  value: deal.value,
  stage_progression: deal.stage,
  key_activities: 'Multiple stakeholder meetings, ROI demonstration'
})), null, 2)}

LOST DEALS (${lostDeals.length}):
${JSON.stringify(lostDeals.slice(0, 5).map(deal => ({
  title: deal.title,
  value: deal.value,
  stage_progression: deal.stage,
  failure_point: 'Negotiation'
})), null, 2)}

ANALYSIS OBJECTIVES:
1. Identify patterns from won deals that can be applied to this deal
2. Spot warning signs from lost deals that may be present in this deal
3. Determine optimal next steps based on deal stage
4. Provide tactical recommendations to increase closing probability

For each recommendation, provide:
1. Type: "high", "medium", or "low" (priority level based on impact and urgency)
2. Title: Clear, actionable title (max 50 characters)
3. Description: Detailed explanation with specific data points and patterns (100-150 words)
4. Action: Specific, immediate action to take (50-75 words)
5. Impact: Expected impact with percentage (e.g., "+15% close probability")
6. Reasoning: Why this recommendation works, referencing win/loss patterns (75-100 words)

PRIORITIZATION CRITERIA:
- High: Critical actions that differentiate won from lost deals at this stage
- Medium: Important tactics that correlate with success
- Low: Optimization steps that can incrementally improve deal progression

Format your response as a JSON array with objects containing: type, title, description, action, impact, reasoning

Ensure recommendations are data-driven, specific to this deal's current stage, and directly derived from patterns in won/lost deals.`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales coach specializing in win/loss analysis. Provide practical, data-driven recommendations in valid JSON format based on patterns from historical deals."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages, { maxTokens: 2000 });
    
    // Parse the JSON response
    const recommendations = parseOpenAIJsonResponse<DealCoachRecommendation[]>(responseText);
    
    // Validate the response structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate each recommendation has required fields
    const validRecommendations = recommendations.filter(recommendation => 
      recommendation.type && 
      recommendation.title && 
      recommendation.description &&
      recommendation.action && 
      recommendation.impact &&
      recommendation.reasoning
    );

    if (validRecommendations.length === 0) {
      throw new Error('No valid recommendations received from OpenAI');
    }

    return validRecommendations;

  } catch (error) {
    console.error('Error analyzing closed deals for coaching:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate coaching recommendations from closed deals. Please check your connection and try again.');
  }
} 