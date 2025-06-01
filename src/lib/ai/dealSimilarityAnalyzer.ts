import { supabase } from '@/integrations/supabase/client';
import { getOpenAIConfig, makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

export interface DealSimilarityRequest {
  dealId: string;
  userId: string;
  maxSimilarDeals?: number;
  includeRecommendations?: boolean;
}

export interface SimilarDeal {
  id: string;
  title: string;
  company: string;
  stage: string;
  value: number;
  probability: number;
  outcome: string;
  similarity_score: number;
  similarity_reasons: string[];
  key_differences: string[];
}

export interface DealRecommendation {
  type: 'pricing' | 'strategy' | 'timing' | 'approach' | 'risk';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  expected_impact: string;
  confidence: number;
  based_on_deals: string[];
}

export interface DealSimilarityResponse {
  current_deal: {
    id: string;
    title: string;
    company: string;
    stage: string;
    value: number;
    probability: number;
  };
  similar_deals: SimilarDeal[];
  recommendations: DealRecommendation[];
  analysis_summary: {
    total_similar_deals: number;
    average_similarity: number;
    pattern_insights: string[];
    success_factors: string[];
    risk_factors: string[];
  };
}

// Type for the AI response structure
interface AIAnalysisResult {
  similar_deals?: any[];
  recommendations?: any[];
  analysis_summary?: {
    pattern_insights?: string[];
    success_factors?: string[];
    risk_factors?: string[];
  };
}

// Analyze deal similarity using LLM
export async function analyzeDealSimilarity(request: DealSimilarityRequest): Promise<DealSimilarityResponse> {
  try {
    // Get the current deal
    const { data: currentDeal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', request.dealId)
      .eq('user_id', request.userId)
      .single();

    if (dealError || !currentDeal) {
      throw new Error('Deal not found');
    }

    // Get all other deals for comparison
    const { data: allDeals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', request.userId)
      .neq('id', request.dealId)
      .order('created_at', { ascending: false });

    if (dealsError) {
      throw new Error('Failed to fetch deals for comparison');
    }

    if (!allDeals || allDeals.length === 0) {
      return {
        current_deal: {
          id: currentDeal.id,
          title: currentDeal.title,
          company: currentDeal.company || '',
          stage: currentDeal.stage || 'Discovery',
          value: currentDeal.value || 0,
          probability: currentDeal.probability || 0
        },
        similar_deals: [],
        recommendations: [{
          type: 'strategy',
          priority: 'medium',
          title: 'First Deal Analysis',
          description: 'This is your first deal or no similar deals found.',
          action: 'Focus on building a strong foundation with clear next steps and regular follow-ups.',
          expected_impact: 'Establish baseline for future deal comparisons',
          confidence: 80,
          based_on_deals: []
        }],
        analysis_summary: {
          total_similar_deals: 0,
          average_similarity: 0,
          pattern_insights: ['This is your first deal - focus on establishing good practices'],
          success_factors: ['Clear communication', 'Regular follow-ups', 'Value demonstration'],
          risk_factors: ['Lack of historical data for comparison']
        }
      };
    }

    // Use LLM to analyze similarity and generate recommendations
    const config = getOpenAIConfig();
    
    const prompt = `You are an expert sales analyst. Analyze the following deal and compare it with historical deals to find similarities and generate actionable recommendations.

CURRENT DEAL:
- Title: ${currentDeal.title}
- Company: ${currentDeal.company || 'Unknown'}
- Stage: ${currentDeal.stage || 'Discovery'}
- Value: $${currentDeal.value || 0}
- Probability: ${currentDeal.probability || 0}%
- Next Step: ${currentDeal.next_step || 'Not specified'}
- Contact: ${currentDeal.contact_name || 'Not specified'}

HISTORICAL DEALS FOR COMPARISON:
${allDeals.map((deal, index) => `
${index + 1}. ${deal.title} - ${deal.company || 'Unknown'} - ${deal.stage || 'Discovery'} - $${deal.value || 0} - ${deal.probability || 0}% - Outcome: ${deal.outcome || 'in_progress'}
   Next Step: ${deal.next_step || 'Not specified'}
   Contact: ${deal.contact_name || 'Not specified'}
`).join('')}

Please analyze and return a JSON response with the following structure:
{
  "similar_deals": [
    {
      "id": "deal_id",
      "title": "deal_title",
      "company": "company_name",
      "stage": "stage",
      "value": number,
      "probability": number,
      "outcome": "outcome",
      "similarity_score": number (0-100),
      "similarity_reasons": ["reason1", "reason2"],
      "key_differences": ["difference1", "difference2"]
    }
  ],
  "recommendations": [
    {
      "type": "pricing|strategy|timing|approach|risk",
      "priority": "high|medium|low",
      "title": "recommendation_title",
      "description": "detailed_description",
      "action": "specific_action_to_take",
      "expected_impact": "expected_outcome",
      "confidence": number (0-100),
      "based_on_deals": ["deal_title1", "deal_title2"]
    }
  ],
  "analysis_summary": {
    "total_similar_deals": number,
    "average_similarity": number,
    "pattern_insights": ["insight1", "insight2"],
    "success_factors": ["factor1", "factor2"],
    "risk_factors": ["risk1", "risk2"]
  }
}

Focus on:
1. Finding deals with similar company sizes, industries, or deal values
2. Identifying patterns in successful vs unsuccessful deals
3. Providing actionable recommendations based on what worked/didn't work
4. Highlighting potential risks based on historical data
5. Suggesting optimal timing and approach strategies

Return only the JSON response, no additional text.`;

    const response = await makeOpenAIRequest([
      {
        role: 'system',
        content: 'You are an expert sales analyst specializing in deal pattern recognition and sales strategy optimization.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    const analysisResult = parseOpenAIJsonResponse(response) as AIAnalysisResult;

    // Validate and enhance the response
    const similarDeals: SimilarDeal[] = (analysisResult.similar_deals || [])
      .slice(0, request.maxSimilarDeals || 5)
      .map((deal: any) => {
        const originalDeal = allDeals.find(d => d.id === deal.id || d.title === deal.title);
        return {
          id: originalDeal?.id || deal.id,
          title: deal.title,
          company: deal.company,
          stage: deal.stage,
          value: deal.value,
          probability: deal.probability,
          outcome: deal.outcome,
          similarity_score: Math.min(100, Math.max(0, deal.similarity_score || 0)),
          similarity_reasons: Array.isArray(deal.similarity_reasons) ? deal.similarity_reasons : [],
          key_differences: Array.isArray(deal.key_differences) ? deal.key_differences : []
        };
      });

    const recommendations: DealRecommendation[] = (analysisResult.recommendations || []).map((rec: any) => ({
      type: rec.type || 'strategy',
      priority: rec.priority || 'medium',
      title: rec.title || 'General Recommendation',
      description: rec.description || '',
      action: rec.action || '',
      expected_impact: rec.expected_impact || '',
      confidence: Math.min(100, Math.max(0, rec.confidence || 75)),
      based_on_deals: Array.isArray(rec.based_on_deals) ? rec.based_on_deals : []
    }));

    return {
      current_deal: {
        id: currentDeal.id,
        title: currentDeal.title,
        company: currentDeal.company || '',
        stage: currentDeal.stage || 'Discovery',
        value: currentDeal.value || 0,
        probability: currentDeal.probability || 0
      },
      similar_deals: similarDeals,
      recommendations: recommendations,
      analysis_summary: {
        total_similar_deals: similarDeals.length,
        average_similarity: similarDeals.length > 0 
          ? similarDeals.reduce((sum, deal) => sum + deal.similarity_score, 0) / similarDeals.length 
          : 0,
        pattern_insights: Array.isArray(analysisResult.analysis_summary?.pattern_insights) 
          ? analysisResult.analysis_summary.pattern_insights 
          : ['Analysis completed with available data'],
        success_factors: Array.isArray(analysisResult.analysis_summary?.success_factors) 
          ? analysisResult.analysis_summary.success_factors 
          : ['Regular follow-ups', 'Clear value proposition'],
        risk_factors: Array.isArray(analysisResult.analysis_summary?.risk_factors) 
          ? analysisResult.analysis_summary.risk_factors 
          : ['Extended sales cycles', 'Multiple decision makers']
      }
    };

  } catch (error) {
    console.error('Error analyzing deal similarity:', error);
    
    // Fallback response
    return {
      current_deal: {
        id: request.dealId,
        title: 'Current Deal',
        company: '',
        stage: 'Discovery',
        value: 0,
        probability: 0
      },
      similar_deals: [],
      recommendations: [{
        type: 'strategy',
        priority: 'medium',
        title: 'Analysis Unavailable',
        description: 'Unable to perform similarity analysis at this time.',
        action: 'Continue with standard sales process and regular follow-ups.',
        expected_impact: 'Maintain deal momentum',
        confidence: 60,
        based_on_deals: []
      }],
      analysis_summary: {
        total_similar_deals: 0,
        average_similarity: 0,
        pattern_insights: ['Analysis temporarily unavailable'],
        success_factors: ['Focus on customer needs', 'Maintain regular communication'],
        risk_factors: ['Limited historical data for comparison']
      }
    };
  }
}

// Quick similarity check for a deal (lighter version)
export async function getQuickSimilarDeals(dealId: string, userId: string, limit: number = 3): Promise<SimilarDeal[]> {
  try {
    const fullAnalysis = await analyzeDealSimilarity({
      dealId,
      userId,
      maxSimilarDeals: limit,
      includeRecommendations: false
    });

    return fullAnalysis.similar_deals;
  } catch (error) {
    console.error('Error getting quick similar deals:', error);
    return [];
  }
} 