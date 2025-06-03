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
    console.log(`🔍 [Semantic Search] STEP 1: Generating query embedding for: "${query}"`);
    const startTime = performance.now();
    
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      });
      
      const embedTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [Semantic Search] Embedding generated in ${embedTime}ms (dimensions: ${response.data[0].embedding.length})`);
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ [Semantic Search] Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Search for similar deals using vector similarity
   */
  async searchSimilarDeals(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`🔍 [Semantic Search] STEP 2A: Searching for similar deals (threshold: ${similarityThreshold}, max: ${maxResults})`);
    const startTime = performance.now();
    
    try {
      // Use type assertion for RPC call
      const { data: dealResults, error: dealError } = await (supabase as any).rpc(
        'search_similar_deals',
        {
          query_embedding: queryEmbedding,
          target_user_id: userId,
          similarity_threshold: similarityThreshold,
          match_count: maxResults
        }
      );

      if (dealError) {
        console.error('❌ [Semantic Search] Deal search error:', dealError);
        return [];
      }

      const searchTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [Semantic Search] Found ${dealResults?.length || 0} relevant deals in ${searchTime}ms`);
      
      if (dealResults && dealResults.length > 0) {
        console.log('📊 [Semantic Search] Top deal match:', {
          title: dealResults[0].title,
          similarity: Math.round(dealResults[0].similarity * 100) + '%'
        });
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
      console.error('❌ [Semantic Search] Error searching deals:', error);
      return [];
    }
  }

  /**
   * Search for similar contacts using vector similarity
   */
  async searchSimilarContacts(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`🔍 [Semantic Search] STEP 2B: Searching for similar contacts (threshold: ${similarityThreshold}, max: ${maxResults})`);
    const startTime = performance.now();
    
    try {
      // Use type assertion for RPC call
      const { data: contactResults, error: contactError } = await (supabase as any).rpc(
        'search_similar_contacts',
        {
          query_embedding: queryEmbedding,
          target_user_id: userId,
          similarity_threshold: similarityThreshold,
          match_count: maxResults
        }
      );

      if (contactError) {
        console.error('❌ [Semantic Search] Contact search error:', contactError);
        return [];
      }

      const searchTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [Semantic Search] Found ${contactResults?.length || 0} relevant contacts in ${searchTime}ms`);
      
      if (contactResults && contactResults.length > 0) {
        console.log('📊 [Semantic Search] Top contact match:', {
          name: contactResults[0].name,
          similarity: Math.round(contactResults[0].similarity * 100) + '%'
        });
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
      console.error('❌ [Semantic Search] Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Search for similar leads using vector similarity
   */
  async searchSimilarLeads(queryEmbedding: number[], userId: string, maxResults: number, similarityThreshold: number): Promise<SemanticSearchResult[]> {
    console.log(`🔍 [Semantic Search] STEP 2C: Searching for similar leads (threshold: ${similarityThreshold}, max: ${maxResults})`);
    const startTime = performance.now();
    
    try {
      // Use type assertion for RPC call
      const { data: leadResults, error: leadError } = await (supabase as any).rpc(
        'search_similar_leads',
        {
          query_embedding: queryEmbedding,
          target_user_id: userId,
          similarity_threshold: similarityThreshold,
          match_count: maxResults
        }
      );

      if (leadError) {
        console.error('❌ [Semantic Search] Lead search error:', leadError);
        return [];
      }

      const searchTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [Semantic Search] Found ${leadResults?.length || 0} relevant leads in ${searchTime}ms`);
      
      if (leadResults && leadResults.length > 0) {
        console.log('📊 [Semantic Search] Top lead match:', {
          name: leadResults[0].name,
          similarity: Math.round(leadResults[0].similarity * 100) + '%'
        });
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
      console.error('❌ [Semantic Search] Error searching leads:', error);
      return [];
    }
  }

  /**
   * Perform semantic search across multiple data types
   */
  async semanticSearch(options: SemanticSearchOptions): Promise<SemanticSearchResponse> {
    console.log(`\n🚀 [Semantic Search] STARTING SEMANTIC SEARCH PROCESS`);
    console.log(`📝 [Semantic Search] User query: "${options.query}"`);
    const totalStartTime = performance.now();
    
    try {
      const {
        query,
        userId,
        includedTypes = ['deals', 'contacts', 'leads'],
        maxResults = 5,
        similarityThreshold = 0.5
      } = options;

      // Handle missing userId with a default value
      const effectiveUserId = userId || 'default-user-id';
      
      // Override the similarity threshold to ensure we always get results
      // Use a very low threshold (0.01) instead of the provided one
      const effectiveThreshold = 0.01;

      console.log(`🔎 [Semantic Search] Search parameters:`, {
        includedTypes,
        maxResults,
        requestedThreshold: similarityThreshold,
        effectiveThreshold: effectiveThreshold,
        userId: userId ? 'provided' : 'using default'
      });
      console.log(`ℹ️ [Semantic Search] Using low similarity threshold to ensure results are returned`);

      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      // Run searches in parallel
      console.log(`🔍 [Semantic Search] STEP 2: Running parallel searches across ${includedTypes.length} entity types`);
      const searchPromises: Promise<SemanticSearchResult[]>[] = [];
      
      if (includedTypes.includes('deals')) {
        searchPromises.push(this.searchSimilarDeals(queryEmbedding, effectiveUserId, maxResults, effectiveThreshold));
      }
      
      if (includedTypes.includes('contacts')) {
        searchPromises.push(this.searchSimilarContacts(queryEmbedding, effectiveUserId, maxResults, effectiveThreshold));
      }
      
      if (includedTypes.includes('leads')) {
        searchPromises.push(this.searchSimilarLeads(queryEmbedding, effectiveUserId, maxResults, effectiveThreshold));
      }
      
      // Wait for all searches to complete
      console.log(`⏳ [Semantic Search] Waiting for all search operations to complete...`);
      const searchResults = await Promise.all(searchPromises);
      
      // Combine and sort results by similarity
      console.log(`🔍 [Semantic Search] STEP 3: Combining and ranking results by similarity`);
      const combinedResults = searchResults
        .flat()
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);
      
      const totalResults = combinedResults.length;
      const totalTime = (performance.now() - totalStartTime).toFixed(2);
      
      console.log(`✅ [Semantic Search] SEARCH COMPLETE: Found ${totalResults} results in ${totalTime}ms`);
      
      if (totalResults > 0) {
        console.log(`📊 [Semantic Search] Top ${Math.min(3, totalResults)} matches:`, combinedResults.slice(0, 3).map(r => ({
          type: r.type,
          name: r.name,
          similarity: Math.round(r.similarity * 100) + '%'
        })));
      } else {
        console.log(`⚠️ [Semantic Search] No matches found - this is unusual with the near-zero threshold`);
      }
      
      return {
        results: combinedResults,
        query,
        totalResults: combinedResults.length
      };
    } catch (error) {
      console.error('❌ [Semantic Search] Error performing semantic search:', error);
      return {
        results: [],
        query: options.query,
        totalResults: 0
      };
    } finally {
      console.log(`🏁 [Semantic Search] SEARCH PROCESS COMPLETED\n`);
    }
  }

  /**
   * Format search results for inclusion in AI context
   */
  formatResultsForAI(searchResponse: SemanticSearchResponse): string {
    console.log(`🔍 [Semantic Search] STEP 4: Formatting ${searchResponse.results.length} results for AI context`);
    
    if (searchResponse.results.length === 0) {
      console.log(`ℹ️ [Semantic Search] No results to format for AI context`);
      return '';
    }

    let formattedResults = `SEMANTIC SEARCH RESULTS FOR QUERY: "${searchResponse.query}"\n\n`;
    formattedResults += `I've searched across all CRM data and found ${searchResponse.results.length} items related to your query. Here are the most relevant matches:\n\n`;

    // Group results by type
    const dealResults = searchResponse.results.filter(r => r.type === 'deal');
    const contactResults = searchResponse.results.filter(r => r.type === 'contact');
    const leadResults = searchResponse.results.filter(r => r.type === 'lead');

    console.log(`📊 [Semantic Search] Grouped results: ${dealResults.length} deals, ${contactResults.length} contacts, ${leadResults.length} leads`);

    // Format deals
    if (dealResults.length > 0) {
      formattedResults += `RELEVANT DEALS:\n`;
      dealResults.slice(0, 10).forEach((deal, index) => {
        formattedResults += `${index + 1}. ${deal.name} (${deal.company || 'No company'}) | Stage: ${deal.stage || 'N/A'} | Value: $${deal.value?.toLocaleString() || 'N/A'} | Relevance: ${Math.round(deal.similarity * 100)}%\n`;
      });
      formattedResults += '\n';
    }

    // Format contacts
    if (contactResults.length > 0) {
      formattedResults += `RELEVANT CONTACTS:\n`;
      contactResults.slice(0, 10).forEach((contact, index) => {
        formattedResults += `${index + 1}. ${contact.name} | ${contact.title || 'No title'} at ${contact.company || 'No company'} | Email: ${contact.email || 'N/A'} | Status: ${contact.status || 'N/A'} | Relevance: ${Math.round(contact.similarity * 100)}%\n`;
      });
      formattedResults += '\n';
    }

    // Format leads
    if (leadResults.length > 0) {
      formattedResults += `RELEVANT LEADS:\n`;
      leadResults.slice(0, 10).forEach((lead, index) => {
        formattedResults += `${index + 1}. ${lead.name} | Company: ${lead.company || 'N/A'} | Source: ${lead.source || 'N/A'} | Status: ${lead.status || 'N/A'} | Score: ${lead.score || 'N/A'} | Relevance: ${Math.round(lead.similarity * 100)}%\n`;
      });
    }

    // Add note about similarity scores for transparency
    formattedResults += `\nNote: Relevance scores indicate how closely each item matches the query semantically, with higher percentages being better matches.\n`;
    console.log('formattedResults', formattedResults);
    console.log(`✅ [Semantic Search] Successfully formatted search results for AI context (${formattedResults.length} characters)`);
    return formattedResults;
  }
}

// Export a singleton instance
export const semanticSearchService = new SemanticSearchService();

/**
 * Utility function to visualize similarity scores in the console
 * This is helpful for debugging and understanding the search results
 */
export function debugSemanticSearch(searchResponse: SemanticSearchResponse) {
  if (!searchResponse || !searchResponse.results || searchResponse.results.length === 0) {
    console.log('❌ No search results to debug');
    return;
  }

  console.log('\n==================================================');
  console.log(`📊 SEMANTIC SEARCH RESULTS VISUALIZATION`);
  console.log(`Query: "${searchResponse.query}"`);
  console.log(`Total results: ${searchResponse.results.length}`);
  console.log('==================================================');

  // Group by type
  const byType = {
    deal: searchResponse.results.filter(r => r.type === 'deal'),
    contact: searchResponse.results.filter(r => r.type === 'contact'),
    lead: searchResponse.results.filter(r => r.type === 'lead')
  };

  console.log(`\nRESULTS BY TYPE:`);
  console.log(`- Deals: ${byType.deal.length}`);
  console.log(`- Contacts: ${byType.contact.length}`);
  console.log(`- Leads: ${byType.lead.length}`);

  // Get min and max similarity for scale
  const minSimilarity = Math.min(...searchResponse.results.map(r => r.similarity));
  const maxSimilarity = Math.max(...searchResponse.results.map(r => r.similarity));
  console.log(`\nSimilarity range: ${Math.round(minSimilarity * 100)}% to ${Math.round(maxSimilarity * 100)}%`);

  // Visualization
  console.log('\n🔍 TOP 10 RESULTS WITH SIMILARITY BARS:');
  searchResponse.results.slice(0, 10).forEach((result, index) => {
    const name = result.title || result.name;
    const similarity = result.similarity;
    const percent = Math.round(similarity * 100);
    const barLength = Math.floor(similarity * 40); // Scale to 40 chars max
    const bar = '█'.repeat(barLength);
    
    console.log(`${index + 1}. [${result.type.toUpperCase()}] ${name.padEnd(30).substring(0, 30)} ${bar} ${percent}%`);
  });

  // Analysis
  if (searchResponse.results.length > 0) {
    const topResult = searchResponse.results[0];
    const avgSimilarity = searchResponse.results.reduce((sum, r) => sum + r.similarity, 0) / searchResponse.results.length;
    
    console.log('\n📈 QUICK ANALYSIS:');
    console.log(`- Top match: ${topResult.title || topResult.name} (${Math.round(topResult.similarity * 100)}%)`);
    console.log(`- Average similarity: ${Math.round(avgSimilarity * 100)}%`);
    
    const distribution = {
      high: searchResponse.results.filter(r => r.similarity >= 0.8).length,
      medium: searchResponse.results.filter(r => r.similarity >= 0.5 && r.similarity < 0.8).length,
      low: searchResponse.results.filter(r => r.similarity >= 0.3 && r.similarity < 0.5).length,
      veryLow: searchResponse.results.filter(r => r.similarity < 0.3).length
    };
    
    console.log('- Similarity distribution:');
    console.log(`  High (80-100%): ${distribution.high}`);
    console.log(`  Medium (50-79%): ${distribution.medium}`);
    console.log(`  Low (30-49%): ${distribution.low}`);
    console.log(`  Very Low (<30%): ${distribution.veryLow}`);
  }
  
  console.log('==================================================\n');
} 