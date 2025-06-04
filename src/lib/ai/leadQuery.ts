// Smart Lead Query Service

import { SemanticSearchService } from './semanticSearch';
import { makeOpenAIRequest, parseOpenAIJsonResponse, isOpenAIConfigured } from './config';
import { supabase } from '@/integrations/supabase/client';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

// Define types for lead query operations
export interface LeadQueryRequest {
  query: string;
  userId: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface LeadQueryResponse {
  answer: string;
  topLeads: any[];
  query: string;
  sources: string[];
  confidence: number;
}

/**
 * Process a smart lead query using hybrid search and AI analysis
 */
export async function processLeadQuery(request: LeadQueryRequest): Promise<LeadQueryResponse> {
  try {
    console.log(`🔍 [Smart Lead Query] Processing query: "${request.query}"`);
    
    // Initialize semantic search service
    const searchService = new SemanticSearchService();
    
    // Perform semantic search on leads
    try {
      const searchResults = await searchService.semanticSearch({
        query: request.query,
        userId: request.userId,
        includedTypes: ['leads'],
        maxResults: request.maxResults || 10,
        similarityThreshold: request.similarityThreshold || 0.3
      });
      
      console.log(`✅ [Smart Lead Query] Found ${searchResults.results.length} matching leads`);
      
      // If no results found, try fallback keyword search
      if (searchResults.results.length === 0) {
        console.log(`⚠️ [Smart Lead Query] No vector matches, trying keyword search`);
        return fallbackToKeywordSearch(request);
      }
      
      // Format results for AI context
      const formattedResults = searchService.formatResultsForAI(searchResults);
      
      // Get traditional database results for hybrid search
      const { data: traditionalResults, error: dbError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', request.userId)
        .ilike('name', `%${request.query}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (dbError) {
        console.error('❌ [Smart Lead Query] Error fetching traditional results:', dbError);
      } else {
        console.log(`✅ [Smart Lead Query] Found ${traditionalResults?.length || 0} traditional matches`);
      }
      
      // Combine semantic and traditional results for hybrid approach
      const hybridResults = searchResults.results.slice();
      if (traditionalResults && traditionalResults.length > 0) {
        // Add traditional results that aren't already in semantic results
        for (const traditionalLead of traditionalResults) {
          if (!hybridResults.find(r => r.id === traditionalLead.id)) {
            hybridResults.push({
              id: traditionalLead.id,
              type: 'lead',
              name: traditionalLead.name,
              company: traditionalLead.company,
              email: traditionalLead.email,
              status: traditionalLead.status,
              source: traditionalLead.source,
              score: traditionalLead.score,
              similarity: 0.5, // Default similarity for traditional results
              embeddingContent: `Lead: ${traditionalLead.name}\nEmail: ${traditionalLead.email || 'Unknown'}\nCompany: ${traditionalLead.company || 'Unknown'}\nStatus: ${traditionalLead.status || 'Unknown'}`
            });
          }
        }
      }
      
      // If OpenAI is not configured, return just the results
      if (!isOpenAIConfigured()) {
        return {
          answer: "I found these leads matching your query, but I'm unable to provide a detailed analysis without AI configuration.",
          topLeads: hybridResults.map(r => ({
            id: r.id,
            name: r.name,
            company: r.company,
            email: r.email,
            status: r.status,
            source: r.source,
            score: r.score,
            similarity: Math.round(r.similarity * 100)
          })),
          query: request.query,
          sources: ['Vector Database', 'SQL Database'],
          confidence: 50
        };
      }
      
      // Generate AI answer based on hybrid results
      console.log(`🧠 [Smart Lead Query] Generating AI analysis for ${hybridResults.length} leads`);
      
      const prompt = `You are an expert lead analysis assistant. Answer the following query about leads using the search results provided:

USER QUERY: "${request.query}"

SEARCH RESULTS:
${formattedResults}

ADDITIONAL LEADS FROM KEYWORD SEARCH:
${traditionalResults ? JSON.stringify(traditionalResults.slice(0, 3), null, 2) : 'None found'}

Provide a comprehensive, detailed answer to the user's query that:
1. Directly addresses their specific question about leads
2. Cites specific leads and data points from the search results
3. Includes relevant metrics, patterns, or insights from the data
4. Organizes information in a clear, structured way using paragraphs or bullet points
5. Avoids generic statements and uses specific lead data to support conclusions
6. Focuses on the most relevant leads (highest similarity or most relevant to query)

Your answer should be professional, data-driven, and actionable. Format information clearly and avoid repeating the same points.
If you can't find a direct answer to their query in the search results, explain what you found instead and suggest how they might refine their query.

Generate your answer in natural language, NOT as JSON.`;

      const messages = [
        {
          role: "system" as const,
          content: "You are an expert lead management AI assistant that provides clear, accurate, data-driven analysis of leads based on search results."
        },
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const responseText = await makeOpenAIRequest(messages, { maxTokens: 2000, temperature: 0.3 });
      
      // Prepare lead data for response
      const topLeads = hybridResults.slice(0, 5).map(r => ({
        id: r.id,
        name: r.name,
        company: r.company,
        email: r.email,
        status: r.status,
        source: r.source,
        score: r.score,
        similarity: Math.round(r.similarity * 100)
      }));
      
      // Calculate confidence based on result quality
      const avgSimilarity = searchResults.results.length > 0 
        ? searchResults.results.slice(0, 3).reduce((sum, r) => sum + r.similarity, 0) / Math.min(3, searchResults.results.length)
        : 0;
      
      const confidence = Math.round(avgSimilarity * 100);
      
      return {
        answer: responseText,
        topLeads,
        query: request.query,
        sources: ['Vector Search', 'Keyword Search', 'AI Analysis'],
        confidence
      };
    } catch (searchError) {
      console.error('❌ [Smart Lead Query] Error in semantic search:', searchError);
      return fallbackToKeywordSearch(request);
    }
  } catch (error) {
    console.error('❌ [Smart Lead Query] Error processing query:', error);
    throw error;
  }
}

/**
 * Fallback to keyword search when semantic search fails or returns no results
 */
async function fallbackToKeywordSearch(request: LeadQueryRequest): Promise<LeadQueryResponse> {
  console.log(`🔍 [Smart Lead Query] Falling back to keyword search for: "${request.query}"`);
  
  try {
    // Perform keyword search
    const { data: keywordResults, error: keywordError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', request.userId)
      .or(`name.ilike.%${request.query}%, company.ilike.%${request.query}%, email.ilike.%${request.query}%`)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (keywordError) {
      console.error('❌ [Smart Lead Query] Error in keyword search:', keywordError);
      throw keywordError;
    }
    
    console.log(`✅ [Smart Lead Query] Found ${keywordResults?.length || 0} leads via keyword search`);
    
    if (!keywordResults || keywordResults.length === 0) {
      return {
        answer: "I couldn't find any leads matching your query. Please try with different keywords or check if lead data exists in your CRM.",
        topLeads: [],
        query: request.query,
        sources: ['Keyword Search'],
        confidence: 0
      };
    }
    
    // Map the results to a consistent format
    const topLeads = keywordResults.map(lead => ({
      id: lead.id,
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      status: lead.status || '',
      source: lead.source || '',
      score: lead.score || 0,
      similarity: 100 // Default high similarity for exact keyword matches
    }));
    
    // If OpenAI is configured, generate analysis
    if (isOpenAIConfigured()) {
      const leadsSummary = keywordResults.map(lead => ({
        name: lead.name,
        company: lead.company,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        score: lead.score
      }));
      
      const prompt = `You are an expert lead analysis assistant. Answer the following query about leads using the search results provided:

USER QUERY: "${request.query}"

LEADS FOUND VIA KEYWORD SEARCH:
${JSON.stringify(leadsSummary, null, 2)}

Provide a comprehensive, detailed answer to the user's query based on these keyword search results.
Your answer should be professional, data-driven, and actionable.
If you can't fully address the query with the available data, explain what you found and suggest how the user might refine their query.

Generate your answer in natural language, NOT as JSON.`;

      const messages = [
        {
          role: "system" as const,
          content: "You are an expert lead management AI assistant that provides clear, accurate, data-driven analysis of leads based on search results."
        },
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const responseText = await makeOpenAIRequest(messages, { maxTokens: 1500, temperature: 0.4 });
      
      return {
        answer: responseText,
        topLeads,
        query: request.query,
        sources: ['Keyword Search', 'AI Analysis'],
        confidence: 70 // Medium confidence for keyword-based results
      };
    } else {
      // Return basic response without AI analysis
      return {
        answer: `I found ${topLeads.length} leads matching your keywords "${request.query}". You can view the details below.`,
        topLeads,
        query: request.query,
        sources: ['Keyword Search'],
        confidence: 60
      };
    }
  } catch (error) {
    console.error('❌ [Smart Lead Query] Error in fallback keyword search:', error);
    return {
      answer: "I encountered an error while searching for leads. Please try again with a different query or check your database connection.",
      topLeads: [],
      query: request.query,
      sources: [],
      confidence: 0
    };
  }
} 