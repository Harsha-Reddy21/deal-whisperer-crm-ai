import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test query
const testQuery = 'deals related to artificial intelligence';

/**
 * Generate an embedding for the search query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log(`Generating embedding for query: "${query}"`);
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    
    console.log(`Embedding generated (dimensions: ${response.data[0].embedding.length})`);
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search for similar deals
 */
async function searchSimilarDeals(queryEmbedding: number[]): Promise<any[]> {
  console.log(`\nSearching for similar deals...`);
  
  try {
    const { data, error } = await supabase.rpc(
      'search_similar_deals',
      {
        query_embedding: queryEmbedding,
        target_user_id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
        similarity_threshold: 0.01,
        match_count: 5
      }
    );
    
    if (error) {
      console.error('Error searching deals:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} deals`);
    return data || [];
  } catch (error) {
    console.error('Error in searchSimilarDeals:', error);
    return [];
  }
}

/**
 * Main test function
 */
async function testEmbeddingContent() {
  console.log('=== TESTING EMBEDDING CONTENT IN SEARCH RESULTS ===\n');
  
  try {
    // Generate embedding for test query
    const queryEmbedding = await generateQueryEmbedding(testQuery);
    
    // Search for similar deals
    const deals = await searchSimilarDeals(queryEmbedding);
    
    if (deals.length === 0) {
      console.log('No deals found for the test query.');
      return;
    }
    
    // Check if embedding_content is included in results
    const hasEmbeddingContent = deals.some(deal => deal.embedding_content);
    
    console.log('\n=== TEST RESULTS ===');
    console.log(`Found ${deals.length} deals matching query`);
    console.log(`embedding_content field present: ${hasEmbeddingContent ? 'YES ✅' : 'NO ❌'}`);
    
    if (hasEmbeddingContent) {
      // Display sample content from first result
      console.log('\n=== SAMPLE EMBEDDING CONTENT ===');
      const sample = deals[0].embedding_content;
      console.log(sample ? sample.substring(0, 200) + '...' : 'No content available');
    } else {
      console.log('\n⚠️ embedding_content field is missing from results!');
      console.log('Please verify that the database functions have been updated correctly.');
    }
    
    // Check all results
    console.log('\n=== ALL RESULTS ===');
    deals.forEach((deal, index) => {
      console.log(`${index + 1}. ${deal.title} | ${deal.similarity.toFixed(2)} | content: ${deal.embedding_content ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEmbeddingContent()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 