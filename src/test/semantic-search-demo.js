// Semantic Search Demo Script
// Run with: node src/test/semantic-search-demo.js

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID - replace with a valid user ID from your database
const TEST_USER_ID = 'REPLACE_WITH_VALID_USER_ID';

// Sample queries to test
const sampleQueries = [
  "Show me enterprise deals in the software industry",
  "Which leads are most promising for cloud services?",
  "Find contacts at financial companies that are ready to buy",
  "What deals are closing this month in the healthcare sector?",
  "Show leads who mentioned AI or machine learning"
];

/**
 * Generate embedding for a query
 */
async function generateEmbedding(text) {
  console.log(`\n🔍 STEP 1: Generating embedding for query: "${text}"`);
  
  try {
    const startTime = performance.now();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    
    const embedding = response.data[0].embedding;
    const duration = (performance.now() - startTime).toFixed(2);
    
    console.log(`✅ Embedding generated in ${duration}ms (dimensions: ${embedding.length})`);
    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search for similar deals
 */
async function searchSimilarDeals(embedding, userId, maxResults = 10, threshold = 0.01) {
  console.log(`\n🔍 STEP 2A: Searching for similar deals (threshold: ${threshold})`);
  
  try {
    const startTime = performance.now();
    const { data, error } = await supabase.rpc(
      'search_similar_deals',
      {
        query_embedding: embedding,
        target_user_id: userId,
        similarity_threshold: threshold,
        match_count: maxResults
      }
    );
    
    const duration = (performance.now() - startTime).toFixed(2);
    
    if (error) {
      console.error('❌ Deal search error:', error);
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} deals in ${duration}ms`);
    
    if (data && data.length > 0) {
      console.log(`📊 Top deal match:`, {
        title: data[0].title,
        company: data[0].company,
        stage: data[0].stage,
        similarity: Math.round(data[0].similarity * 100) + '%'
      });
      
      // Log all deal results
      console.log(`📋 All deal results:`);
      data.forEach((deal, index) => {
        console.log(`  ${index + 1}. ${deal.title} | ${deal.company || 'N/A'} | ${Math.round(deal.similarity * 100)}%`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error searching deals:', error);
    return [];
  }
}

/**
 * Search for similar contacts
 */
async function searchSimilarContacts(embedding, userId, maxResults = 10, threshold = 0.01) {
  console.log(`\n🔍 STEP 2B: Searching for similar contacts (threshold: ${threshold})`);
  
  try {
    const startTime = performance.now();
    const { data, error } = await supabase.rpc(
      'search_similar_contacts',
      {
        query_embedding: embedding,
        target_user_id: userId,
        similarity_threshold: threshold,
        match_count: maxResults
      }
    );
    
    const duration = (performance.now() - startTime).toFixed(2);
    
    if (error) {
      console.error('❌ Contact search error:', error);
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} contacts in ${duration}ms`);
    
    if (data && data.length > 0) {
      console.log(`📊 Top contact match:`, {
        name: data[0].name,
        company: data[0].company,
        similarity: Math.round(data[0].similarity * 100) + '%'
      });
      
      // Log all contact results
      console.log(`📋 All contact results:`);
      data.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.name} | ${contact.company || 'N/A'} | ${Math.round(contact.similarity * 100)}%`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error searching contacts:', error);
    return [];
  }
}

/**
 * Search for similar leads
 */
async function searchSimilarLeads(embedding, userId, maxResults = 10, threshold = 0.01) {
  console.log(`\n🔍 STEP 2C: Searching for similar leads (threshold: ${threshold})`);
  
  try {
    const startTime = performance.now();
    const { data, error } = await supabase.rpc(
      'search_similar_leads',
      {
        query_embedding: embedding,
        target_user_id: userId,
        similarity_threshold: threshold,
        match_count: maxResults
      }
    );
    
    const duration = (performance.now() - startTime).toFixed(2);
    
    if (error) {
      console.error('❌ Lead search error:', error);
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} leads in ${duration}ms`);
    
    if (data && data.length > 0) {
      console.log(`📊 Top lead match:`, {
        name: data[0].name,
        company: data[0].company,
        similarity: Math.round(data[0].similarity * 100) + '%'
      });
      
      // Log all lead results
      console.log(`📋 All lead results:`);
      data.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.name} | ${lead.company || 'N/A'} | ${Math.round(lead.similarity * 100)}%`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error searching leads:', error);
    return [];
  }
}

/**
 * Format results for display
 */
function formatResults(query, deals, contacts, leads) {
  console.log(`\n🔍 STEP 3: Formatting search results`);
  
  const allResults = [
    ...deals.map(d => ({ ...d, type: 'deal' })),
    ...contacts.map(c => ({ ...c, type: 'contact' })),
    ...leads.map(l => ({ ...l, type: 'lead' }))
  ].sort((a, b) => b.similarity - a.similarity);
  
  console.log(`\n📊 SEMANTIC SEARCH RESULTS FOR: "${query}"`);
  console.log(`Found ${allResults.length} total matches across all entity types`);
  
  if (allResults.length === 0) {
    console.log('No results found above threshold');
    return;
  }
  
  console.log('\n🏆 TOP 5 RESULTS (ALL TYPES):');
  allResults.slice(0, 5).forEach((result, index) => {
    const name = result.title || result.name;
    const type = result.type.toUpperCase();
    const similarity = Math.round(result.similarity * 100);
    
    console.log(`${index + 1}. [${type}] ${name} | ${result.company || 'N/A'} | Relevance: ${similarity}%`);
  });
  
  // Print results by type
  if (deals.length > 0) {
    console.log('\n📈 DEALS:');
    deals.slice(0, 3).forEach((deal, index) => {
      console.log(`${index + 1}. ${deal.title} | ${deal.company || 'N/A'} | Stage: ${deal.stage} | Value: $${deal.value} | Relevance: ${Math.round(deal.similarity * 100)}%`);
    });
  }
  
  if (contacts.length > 0) {
    console.log('\n👤 CONTACTS:');
    contacts.slice(0, 3).forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} | ${contact.company || 'N/A'} | Email: ${contact.email || 'N/A'} | Relevance: ${Math.round(contact.similarity * 100)}%`);
    });
  }
  
  if (leads.length > 0) {
    console.log('\n🎯 LEADS:');
    leads.slice(0, 3).forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} | ${lead.company || 'N/A'} | Source: ${lead.source || 'N/A'} | Relevance: ${Math.round(lead.similarity * 100)}%`);
    });
  }
}

/**
 * Run the full semantic search flow
 */
async function runSemanticSearch(query, userId) {
  console.log('\n==================================================');
  console.log(`🚀 SEMANTIC SEARCH FLOW: "${query}"`);
  console.log('==================================================');
  
  try {
    const totalStartTime = performance.now();
    
    // Generate embedding
    const embedding = await generateEmbedding(query);
    
    // Run searches in parallel
    const [deals, contacts, leads] = await Promise.all([
      searchSimilarDeals(embedding, userId),
      searchSimilarContacts(embedding, userId),
      searchSimilarLeads(embedding, userId)
    ]);
    
    // Format and display results
    formatResults(query, deals, contacts, leads);
    
    const totalDuration = (performance.now() - totalStartTime).toFixed(2);
    console.log(`\n✅ Search completed in ${totalDuration}ms`);
    
  } catch (error) {
    console.error('❌ Error in semantic search flow:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 SEMANTIC SEARCH DEMO');
  console.log('==================================================');
  
  if (TEST_USER_ID === 'REPLACE_WITH_VALID_USER_ID') {
    console.error('❌ Please replace TEST_USER_ID with a valid user ID from your database');
    return;
  }
  
  // Run demo with sample queries
  for (const query of sampleQueries) {
    await runSemanticSearch(query, TEST_USER_ID);
  }
  
  console.log('\n==================================================');
  console.log('🏁 DEMO COMPLETED');
  console.log('==================================================');
}

// Run the demo
main().catch(console.error); 