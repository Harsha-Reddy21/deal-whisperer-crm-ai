// Product Persona Matcher AI Service

import { makeOpenAIRequest, parseOpenAIJsonResponse } from './config';

export interface ProductPersonaMatch {
  person: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company: string;
    title?: string;
    type: 'lead' | 'contact';
  };
  relevanceScore: number;
  reasoning: string;
  matchFactors: string[];
}

export interface ProductPersonaResponse {
  matches: ProductPersonaMatch[];
  totalAnalyzed: number;
  searchQuery: string;
}

/**
 * Find people (leads and contacts) related to a specific product using AI analysis
 */
export async function findPeopleForProduct(
  product: string,
  leads: any[],
  contacts: any[]
): Promise<ProductPersonaResponse> {
  try {
    console.log("Finding people for product:", product);

    // Combine and format people data for analysis
    const allPeople = [
      ...leads.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company || 'Unknown',
        title: lead.title || 'Unknown',
        industry: lead.industry,
        status: lead.status,
        source: lead.source,
        score: lead.score,
        type: 'lead' as const
      })),
      ...contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company || 'Unknown',
        title: contact.title || 'Unknown',
        persona: contact.persona,
        status: contact.status,
        score: contact.score,
        type: 'contact' as const
      }))
    ];

    if (allPeople.length === 0) {
      return {
        matches: [],
        totalAnalyzed: 0,
        searchQuery: product
      };
    }

    const prompt = `You are an expert sales analyst. Analyze the following people data to find individuals who would be most relevant for the product: "${product}".

PEOPLE DATA:
${JSON.stringify(allPeople.slice(0, 50), null, 2)}

ANALYSIS CRITERIA:
1. Job title relevance to the product
2. Company industry alignment
3. Persona/role fit for the product
4. Decision-making authority
5. Company size appropriateness
6. Current status and engagement level

For each person who has ANY relevance to the product (even minimal), provide:
1. person: The person object with id, name, email, phone, company, title, type
2. relevanceScore: Score from 0-100 (only include people with score >= 30)
3. reasoning: Brief explanation of why they're relevant
4. matchFactors: Array of specific factors that make them a good match

Return ONLY people with relevance score >= 30. If no one meets this threshold, return an empty matches array.

Format your response as a JSON object with:
- matches: Array of ProductPersonaMatch objects
- totalAnalyzed: Number of people analyzed
- searchQuery: The product search term

Focus on quality matches rather than quantity. Be selective but don't be overly restrictive.`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert sales analyst. Analyze people data to find product-relevant prospects in valid JSON format. Be thorough but selective in matching people to products."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const responseText = await makeOpenAIRequest(messages, { maxTokens: 2000 });
    console.log("OpenAI response:", responseText);
    
    // Parse the JSON response
    const response = parseOpenAIJsonResponse<ProductPersonaResponse>(responseText);
    
    // Validate the response structure
    if (!response.matches || !Array.isArray(response.matches)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate each match has required fields
    const validMatches = response.matches.filter(match => 
      match.person && 
      match.person.id && 
      match.person.name && 
      match.person.email &&
      typeof match.relevanceScore === 'number' && 
      match.reasoning &&
      Array.isArray(match.matchFactors)
    );

    return {
      matches: validMatches,
      totalAnalyzed: response.totalAnalyzed || allPeople.length,
      searchQuery: product
    };

  } catch (error) {
    console.error('Error finding people for product:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to find people for product. Please check your connection and try again.');
  }
} 