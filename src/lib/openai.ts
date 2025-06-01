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

export async function generateDealCoachRecommendations(deal: any, context?: any): Promise<DealCoachRecommendation[]> {
  try {
    console.log("Analyzing deal for AI coaching:", deal);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    // Enhanced context for better AI analysis
    const contextInfo = context ? `
    
DEAL CONTEXT ANALYSIS:
- Activities: ${context.activities?.length || 0} total activities
- Recent Activities: ${context.activities?.slice(0, 3).map(a => `${a.type}: ${a.subject}`).join(', ') || 'None'}
- Email Engagement: ${context.emails?.length || 0} emails sent
- Email Opens: ${context.emails?.filter(e => e.opened_at).length || 0}
- Email Clicks: ${context.emails?.filter(e => e.clicked_at).length || 0}
- Deal Age: ${context.dealAge || 0} days
- Days Since Last Activity: ${context.lastActivityDays || 0}
- Contact Information: ${context.contact ? `${context.contact.name} (${context.contact.title || 'Unknown title'})` : 'No contact linked'}
- Files/Documents: ${context.files?.length || 0} files attached
- Comments/Notes: ${context.comments?.length || 0} comments

BUYER BEHAVIOR SIGNALS:
- Email engagement rate: ${context.emails?.length > 0 ? Math.round((context.emails.filter(e => e.opened_at).length / context.emails.length) * 100) : 0}%
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
            content: "You are an expert sales coach and deal strategist. Provide practical, data-driven recommendations in valid JSON format. Focus on actionable insights that sales reps can implement immediately."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
    let recommendations: DealCoachRecommendation[];
    try {
      // Remove markdown code blocks if present
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

export async function generateLeadPersona(lead: any): Promise<CustomerPersona> {
  try {
    console.log("Generating lead persona for:", lead);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please check your .env file.');
    }

    // Check if we have sufficient data for persona generation
    const hasBasicInfo = lead.name && (lead.company || lead.email || lead.phone);
    const hasInteractionData = (lead.activities && lead.activities.length > 0) || 
                              (lead.deals && lead.deals.length > 0);
    
    if (!hasBasicInfo) {
      throw new Error('Insufficient lead information. Please add more details about the lead.');
    }

    let prompt;
    
    if (!hasInteractionData) {
      // Generate a basic persona with limited data
      prompt = `You are an expert sales psychologist. Based on the following limited lead information, create a basic customer persona profile:

Name: ${lead.name}
Company: ${lead.company || 'Not specified'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Status: ${lead.status || 'new'}
Source: ${lead.source || 'unknown'}
Lead Score: ${lead.score || 0}

IMPORTANT: Since this lead has limited interaction data, generate a conservative persona based on:
1. Industry patterns (if company is provided)
2. Lead source characteristics
3. Common behavioral patterns for similar leads
4. General best practices for this type of prospect

Generate a comprehensive but conservative behavioral profile including:
1. name: Professional persona name based on available info
2. role: Likely role/position (be conservative if uncertain)
3. company_size: Estimated company size category (use "Unknown" if uncertain)
4. industry: Likely industry (use "General Business" if uncertain)
5. pain_points: Array of common pain points for this type of lead
6. communication_style: Conservative estimate of communication preferences
7. decision_making_style: General decision-making patterns
8. preferred_channels: Array of standard communication channels
9. buying_motivations: Array of typical motivations for this lead type
10. objections_likely: Array of common objections for new leads
11. recommended_approach: Best initial approach for engaging with this lead

Format your response as a JSON object with these exact fields.

Note: Since interaction data is limited, focus on industry standards and conservative estimates. Mention in the recommended_approach that more data collection is needed.`;
    } else {
      // Generate a detailed persona with interaction data
      prompt = `You are an expert sales psychologist. Based on the following comprehensive lead information and interaction history, create a detailed customer persona:

LEAD INFORMATION:
Name: ${lead.name}
Company: ${lead.company || 'Not specified'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Status: ${lead.status || 'new'}
Source: ${lead.source || 'unknown'}
Lead Score: ${lead.score || 0}

INTERACTION HISTORY:
Activities: ${lead.activities?.length || 0} activities recorded
${lead.activities?.map(activity => `- ${activity.type}: ${activity.subject} (${activity.status})`).join('\n') || 'No activities'}

Deals: ${lead.deals?.length || 0} deals associated
${lead.deals?.map(deal => `- ${deal.title}: $${deal.value} (${deal.stage})`).join('\n') || 'No deals'}

Generate a comprehensive behavioral profile including:
1. name: Professional persona name
2. role: Likely role/position based on interactions
3. company_size: Estimated company size category
4. industry: Likely industry
5. pain_points: Array of pain points based on interaction patterns
6. communication_style: How they prefer to communicate (based on activity patterns)
7. decision_making_style: How they make decisions (based on deal progression)
8. preferred_channels: Array of preferred communication channels
9. buying_motivations: Array of what motivates their purchases
10. objections_likely: Array of likely objections they might raise
11. recommended_approach: Best approach for engaging with this persona

Format your response as a JSON object with these exact fields.

Base your analysis on the interaction history and behavioral patterns observed.`;
    }

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
            content: "You are an expert sales psychologist. Create detailed but realistic customer personas in valid JSON format. When data is limited, be conservative and mention the need for more information."
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
    console.error('Error generating lead persona:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate lead persona. Please check your connection and try again.');
  }
}

export function isOpenAIConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!apiKey && apiKey.length > 0;
}
