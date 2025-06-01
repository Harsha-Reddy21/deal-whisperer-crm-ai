export interface ObjectionSuggestion {
  approach: string;
  text: string;
  effectiveness: number;
  reasoning: string;
}

export interface DealCoachRecommendation {
  type: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  reasoning: string;
}

export interface CustomerPersona {
  name: string;
  role: string;
  company_size: string;
  industry: string;
  pain_points: string[];
  communication_style: string;
  decision_making_style: string;
  preferred_channels: string[];
  buying_motivations: string[];
  objections_likely: string[];
  recommended_approach: string;
}

export interface WinLossAnalysis {
  outcome: 'won' | 'lost';
  primary_factors: string[];
  contributing_factors: string[];
  lessons_learned: string[];
  recommendations: string[];
  confidence_score: number;
}

export async function generateObjectionSuggestions(objection: string): Promise<ObjectionSuggestion[]> {
  try {
    console.log("Processing objection:", objection);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    const prompt = `You are an expert sales coach specializing in objection handling. A customer has raised the following objection:

"${objection}"

Please provide 3 different response strategies. For each strategy, provide:
1. A clear approach name (e.g., "Empathy + Value Reframe", "Question + Social Proof", etc.)
2. The exact response text (as if speaking directly to the customer)
3. An effectiveness score (70-95)
4. A brief explanation of why this approach works

Format your response as a JSON array with objects containing: approach, text, effectiveness, reasoning

Make the responses sound natural, empathetic, and professional. Focus on understanding the customer's concern while guiding them toward a positive outcome.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sales coach. Provide practical, empathetic objection handling strategies in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    console.log("OpenAI response:", responseText);
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let suggestions: ObjectionSuggestion[];
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      suggestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }
    
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

export async function generateDealCoachRecommendations(deal: any): Promise<DealCoachRecommendation[]> {
  try {
    console.log("Analyzing deal for AI coaching:", deal);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    const prompt = `You are an expert sales coach analyzing a deal. Here are the deal details:

Title: ${deal.title}
Company: ${deal.company}
Value: $${deal.value}
Current Stage: ${deal.stage}
Probability: ${deal.probability}%
Contact: ${deal.contact_name}
Last Activity: ${deal.last_activity}
Next Step: ${deal.next_step}

Based on this information, provide 3 AI-powered recommendations to improve the close probability. For each recommendation, provide:
1. Type: "high", "medium", or "low" (priority level)
2. Title: Short, actionable title
3. Description: Detailed explanation of the issue/opportunity
4. Action: Specific action to take
5. Impact: Expected impact on close probability (e.g., "+15% close probability")
6. Reasoning: Why this recommendation will help

Format your response as a JSON array with objects containing: type, title, description, action, impact, reasoning

Focus on practical, actionable advice based on sales best practices and the specific deal context.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sales coach. Provide practical, actionable deal coaching recommendations in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let recommendations: DealCoachRecommendation[];
    try {
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      recommendations = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }
    
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    return recommendations;

  } catch (error) {
    console.error('Error generating deal coach recommendations:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI recommendations. Please check your connection and try again.');
  }
}

export async function generateCustomerPersona(contact: any): Promise<CustomerPersona> {
  try {
    console.log("Generating customer persona for:", contact);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    const prompt = `You are an expert sales psychologist. Based on the following contact information, create a detailed customer persona:

Name: ${contact.name}
Company: ${contact.company}
Email: ${contact.email}
Phone: ${contact.phone}
Status: ${contact.status}
Current Persona: ${contact.persona || 'Not specified'}

Generate a comprehensive behavioral profile including:
1. name: Professional persona name
2. role: Likely role/position
3. company_size: Estimated company size category
4. industry: Likely industry
5. pain_points: Array of likely pain points
6. communication_style: How they prefer to communicate
7. decision_making_style: How they make decisions
8. preferred_channels: Array of preferred communication channels
9. buying_motivations: Array of what motivates their purchases
10. objections_likely: Array of likely objections they might raise
11. recommended_approach: Best approach for engaging with this persona

Format your response as a JSON object with these exact fields.

Base your analysis on the contact information provided and common behavioral patterns for similar profiles.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sales psychologist. Create detailed customer personas in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let persona: CustomerPersona;
    try {
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      persona = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }
    
    return persona;

  } catch (error) {
    console.error('Error generating customer persona:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate customer persona. Please check your connection and try again.');
  }
}

export async function generateWinLossAnalysis(deals: any[]): Promise<WinLossAnalysis> {
  try {
    console.log("Analyzing win/loss patterns for deals:", deals);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    const dealsSummary = deals.map(deal => ({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      outcome: deal.stage === 'Closing' ? 'won' : (deal.probability < 20 ? 'lost' : 'in_progress')
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sales analyst. Provide comprehensive win/loss analysis in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysis: WinLossAnalysis;
    try {
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }
    
    return analysis;

  } catch (error) {
    console.error('Error generating win/loss analysis:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate win/loss analysis. Please check your connection and try again.');
  }
}

export function isOpenAIConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!apiKey && apiKey.length > 0;
}
