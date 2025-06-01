// Customer Persona Builder AI Service

import type { CustomerPersona } from './types';
import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

/**
 * Generate customer persona from contact information
 */
export async function generateCustomerPersona(contact: any): Promise<CustomerPersona> {
  try {
    console.log("Generating customer persona for:", contact);

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

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales psychologist. Create detailed customer personas in valid JSON format."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages);
    
    // Parse the JSON response
    const persona = parseOpenAIJsonResponse<CustomerPersona>(responseText);
    
    return persona;

  } catch (error) {
    console.error('Error generating customer persona:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate customer persona. Please check your connection and try again.');
  }
}

/**
 * Generate lead persona with enhanced analysis for leads with interaction data
 */
export async function generateLeadPersona(lead: any): Promise<CustomerPersona> {
  try {
    console.log("Generating lead persona for:", lead);

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
${lead.activities?.map((activity: any) => `- ${activity.type}: ${activity.subject} (${activity.status})`).join('\n') || 'No activities'}

Deals: ${lead.deals?.length || 0} deals associated
${lead.deals?.map((deal: any) => `- ${deal.title}: $${deal.value} (${deal.stage})`).join('\n') || 'No deals'}

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

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales psychologist. Create detailed but realistic customer personas in valid JSON format. When data is limited, be conservative and mention the need for more information."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages);
    
    // Parse the JSON response
    const persona = parseOpenAIJsonResponse<CustomerPersona>(responseText);
    
    return persona;

  } catch (error) {
    console.error('Error generating lead persona:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate lead persona. Please check your connection and try again.');
  }
} 