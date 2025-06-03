import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export interface SemanticSearchOptions {
  query: string;
  userId: string;
  includedTypes?: ('deals' | 'contacts' | 'leads')[];
  maxResults?: number;
  similarityThreshold?: number;
}

export interface SemanticSearchResult {
  id: string;
  type: 'deal' | 'contact' | 'lead';
  name: string;
  title?: string;
  company?: string;
  similarity: number;
  stage?: string;
  value?: number;
  status?: string;
  email?: string;
  source?: string;
  score?: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  query: string;
  totalResults: number;
}

/**
 * Semantic Search Service
 * Performs semantic search across deals, contacts, and leads using vector embeddings
 */
export class SemanticSearchService {
  /**
   * Generates an embedding for the search query using OpenAI API
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    console.log(`[Semantic Search] Generating query embedding for: "${query}"`);
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('[Semantic Search] Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Search for similar deals using vector similarity
   */
  async searchSimilarDeals(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`[Semantic Search] Searching for similar deals...`);
    try {
      // Use type assertion for RPC call
      const { data: dealResults, error: dealError } = await (supabase as any).rpc(
        'search_similar_deals',
        {
          query_embedding: queryEmbedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: userId
        }
      );

      if (dealError) {
        console.error('[Semantic Search] Deal search error:', dealError);
        return [];
      }

      return (dealResults || []).map((deal: any) => ({
        id: deal.id,
        type: 'deal',
        name: deal.title,
        title: deal.title,
        company: deal.company,
        stage: deal.stage,
        value: deal.value,
        similarity: deal.similarity
      }));
    } catch (error) {
      console.error('[Semantic Search] Error searching deals:', error);
      return [];
    }
  }

  /**
   * Search for similar contacts using vector similarity
   */
  async searchSimilarContacts(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`[Semantic Search] Searching for similar contacts...`);
    try {
      // Use type assertion for RPC call
      const { data: contactResults, error: contactError } = await (supabase as any).rpc(
        'search_similar_contacts',
        {
          query_embedding: queryEmbedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: userId
        }
      );

      if (contactError) {
        console.error('[Semantic Search] Contact search error:', contactError);
        return [];
      }

      return (contactResults || []).map((contact: any) => ({
        id: contact.id,
        type: 'contact',
        name: contact.name,
        title: contact.title,
        company: contact.company,
        email: contact.email,
        status: contact.status,
        score: contact.score,
        similarity: contact.similarity
      }));
    } catch (error) {
      console.error('[Semantic Search] Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Search for similar leads using vector similarity
   */
  async searchSimilarLeads(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`[Semantic Search] Searching for similar leads...`);
    try {
      // Use type assertion for RPC call
      const { data: leadResults, error: leadError } = await (supabase as any).rpc(
        'search_similar_leads',
        {
          query_embedding: queryEmbedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: userId
        }
      );

      if (leadError) {
        console.error('[Semantic Search] Lead search error:', leadError);
        return [];
      }

      return (leadResults || []).map((lead: any) => ({
        id: lead.id,
        type: 'lead',
        name: lead.name,
        company: lead.company,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        score: lead.score,
        similarity: lead.similarity
      }));
    } catch (error) {
      console.error('[Semantic Search] Error searching leads:', error);
      return [];
    }
  }

  /**
   * Perform semantic search across multiple data types
   */
  async semanticSearch(options: SemanticSearchOptions): Promise<SemanticSearchResponse> {
    console.log(`[Semantic Search] Starting semantic search for query: "${options.query}"`);
    try {
      const {
        query,
        userId,
        includedTypes = ['deals', 'contacts', 'leads'],
        maxResults = 5,
        similarityThreshold = 0.5
      } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      // Run searches in parallel
      const searchPromises: Promise<SemanticSearchResult[]>[] = [];
      
      if (includedTypes.includes('deals')) {
        searchPromises.push(this.searchSimilarDeals(queryEmbedding, userId, maxResults, similarityThreshold));
      }
      
      if (includedTypes.includes('contacts')) {
        searchPromises.push(this.searchSimilarContacts(queryEmbedding, userId, maxResults, similarityThreshold));
      }
      
      if (includedTypes.includes('leads')) {
        searchPromises.push(this.searchSimilarLeads(queryEmbedding, userId, maxResults, similarityThreshold));
      }
      
      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);
      
      // Combine and sort results by similarity
      const combinedResults = searchResults
        .flat()
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);
      
      console.log(`[Semantic Search] Search complete. Found ${combinedResults.length} results.`);
      
      return {
        results: combinedResults,
        query,
        totalResults: combinedResults.length
      };
    } catch (error) {
      console.error('[Semantic Search] Error performing semantic search:', error);
      return {
        results: [],
        query: options.query,
        totalResults: 0
      };
    }
  }

  /**
   * Format search results for inclusion in AI context
   */
  formatResultsForAI(searchResponse: SemanticSearchResponse): string {
    if (searchResponse.results.length === 0) {
      return '';
    }

    let formattedResults = `SEMANTIC SEARCH RESULTS FOR QUERY: "${searchResponse.query}"\n\n`;

    // Group results by type
    const dealResults = searchResponse.results.filter(r => r.type === 'deal');
    const contactResults = searchResponse.results.filter(r => r.type === 'contact');
    const leadResults = searchResponse.results.filter(r => r.type === 'lead');

    // Format deals
    if (dealResults.length > 0) {
      formattedResults += `RELEVANT DEALS:\n`;
      dealResults.forEach(deal => {
        formattedResults += `- ${deal.name} (${deal.company || 'No company'}) | Stage: ${deal.stage || 'N/A'} | Value: $${deal.value?.toLocaleString() || 'N/A'} | Relevance: ${Math.round(deal.similarity * 100)}%\n`;
      });
      formattedResults += '\n';
    }

    // Format contacts
    if (contactResults.length > 0) {
      formattedResults += `RELEVANT CONTACTS:\n`;
      contactResults.forEach(contact => {
        formattedResults += `- ${contact.name} | ${contact.title || 'No title'} at ${contact.company || 'No company'} | Email: ${contact.email || 'N/A'} | Status: ${contact.status || 'N/A'} | Relevance: ${Math.round(contact.similarity * 100)}%\n`;
      });
      formattedResults += '\n';
    }

    // Format leads
    if (leadResults.length > 0) {
      formattedResults += `RELEVANT LEADS:\n`;
      leadResults.forEach(lead => {
        formattedResults += `- ${lead.name} | Company: ${lead.company || 'N/A'} | Source: ${lead.source || 'N/A'} | Status: ${lead.status || 'N/A'} | Score: ${lead.score || 'N/A'} | Relevance: ${Math.round(lead.similarity * 100)}%\n`;
      });
    }

    return formattedResults;
  }
}

// Export a singleton instance
export const semanticSearchService = new SemanticSearchService(); 