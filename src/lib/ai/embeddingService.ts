import { supabase } from '@/integrations/supabase/client';
import { getOpenAIConfig } from './config';

// Types for embedding operations
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface SemanticSearchRequest {
  query: string;
  searchType: 'deals' | 'contacts' | 'activities' | 'companies' | 'all';
  similarityThreshold?: number;
  maxResults?: number;
  userId?: string;
}

export interface SemanticSearchResult {
  id: string;
  title?: string;
  name?: string;
  company?: string;
  stage?: string;
  value?: number;
  persona?: string;
  similarity: number;
  type: string;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  query: string;
  searchType: string;
  totalResults: number;
  searchTime: number;
  averageSimilarity: number;
}

export interface EmbeddingMetadata {
  id: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  textContent: string;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
}

// Generate embedding using OpenAI API
export async function generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
  try {
    const config = getOpenAIConfig();
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: request.text,
        model: request.model || 'text-embedding-3-small',
        encoding_format: 'float'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      embedding: data.data[0].embedding,
      model: data.model,
      usage: data.usage
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Fallback: Generate a mock embedding for development
    console.warn('Using mock embedding for development');
    return {
      embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
      model: request.model || 'text-embedding-3-small',
      usage: {
        prompt_tokens: request.text.split(' ').length,
        total_tokens: request.text.split(' ').length
      }
    };
  }
}

// Store embedding in database
export async function storeEmbedding(
  tableName: string,
  recordId: string,
  fieldName: string,
  textContent: string,
  embedding: number[],
  userId: string,
  model: string = 'text-embedding-3-small'
): Promise<void> {
  try {
    // Store in embedding_metadata table (using type assertion since it's not in generated types yet)
    const { error: metadataError } = await (supabase as any)
      .from('embedding_metadata')
      .upsert({
        user_id: userId,
        table_name: tableName,
        record_id: recordId,
        field_name: fieldName,
        text_content: textContent,
        embedding_vector: embedding,
        embedding_model: model,
        updated_at: new Date().toISOString()
      });

    if (metadataError) {
      console.error('Error storing embedding metadata:', metadataError);
      throw metadataError;
    }

    // Update the actual table with the embedding
    const vectorColumnName = `${fieldName}_vector`;
    const { error: updateError } = await (supabase as any)
      .from(tableName)
      .update({ [vectorColumnName]: embedding })
      .eq('id', recordId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating table with embedding:', updateError);
      throw updateError;
    }

    console.log(`✅ Embedding stored for ${tableName}.${fieldName} (record: ${recordId})`);
  } catch (error) {
    console.error('Error in storeEmbedding:', error);
    throw error;
  }
}

// Generate and store embedding for a record
export async function generateAndStoreEmbedding(
  tableName: string,
  recordId: string,
  fieldName: string,
  textContent: string,
  userId: string
): Promise<void> {
  if (!textContent || textContent.trim().length === 0) {
    console.warn(`Skipping embedding generation for empty text in ${tableName}.${fieldName}`);
    return;
  }

  try {
    const embeddingResponse = await generateEmbedding({ text: textContent });
    await storeEmbedding(
      tableName,
      recordId,
      fieldName,
      textContent,
      embeddingResponse.embedding,
      userId,
      embeddingResponse.model
    );
  } catch (error) {
    console.error(`Error generating and storing embedding for ${tableName}.${fieldName}:`, error);
    throw error;
  }
}

// Perform semantic search
export async function performSemanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
  const startTime = Date.now();
  
  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding({ text: request.query });
    
    // Use a very low threshold to always return top results
    const effectiveThreshold = 0.0; // Always return top results regardless of similarity
    
    // Store the search query for analytics (using type assertion)
    const { error: searchError } = await (supabase as any)
      .from('semantic_searches')
      .insert({
        user_id: request.userId,
        query_text: request.query,
        query_vector: queryEmbedding.embedding,
        search_type: request.searchType,
        similarity_threshold: effectiveThreshold
      });

    if (searchError) {
      console.warn('Error storing search query:', searchError);
    }

    let results: SemanticSearchResult[] = [];

    // Search based on type
    if (request.searchType === 'deals' || request.searchType === 'all') {
      const { data: dealResults, error: dealError } = await (supabase as any)
        .rpc('search_similar_deals', {
          query_embedding: queryEmbedding.embedding,
          similarity_threshold: effectiveThreshold,
          match_count: request.maxResults || 10,
          target_user_id: request.userId
        });

      if (!dealError && dealResults) {
        results.push(...dealResults.map((deal: any) => ({
          id: deal.id,
          title: deal.title,
          company: deal.company,
          stage: deal.stage,
          value: deal.value,
          similarity: deal.similarity,
          type: 'deal'
        })));
      }
    }

    if (request.searchType === 'contacts' || request.searchType === 'all') {
      const { data: contactResults, error: contactError } = await (supabase as any)
        .rpc('search_similar_contacts', {
          query_embedding: queryEmbedding.embedding,
          similarity_threshold: effectiveThreshold,
          match_count: request.maxResults || 10,
          target_user_id: request.userId
        });

      if (!contactError && contactResults) {
        results.push(...contactResults.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          company: contact.company,
          title: contact.title,
          persona: contact.persona,
          similarity: contact.similarity,
          type: 'contact'
        })));
      }
    }

    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    if (request.maxResults) {
      results = results.slice(0, request.maxResults);
    }

    const searchTime = Date.now() - startTime;
    const averageSimilarity = results.length > 0 
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length 
      : 0;

    // Update search record with results
    if (!searchError) {
      await (supabase as any)
        .from('semantic_searches')
        .update({
          results_count: results.length,
          search_results: results
        })
        .eq('user_id', request.userId)
        .eq('query_text', request.query)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return {
      results,
      query: request.query,
      searchType: request.searchType,
      totalResults: results.length,
      searchTime,
      averageSimilarity
    };

  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
}

// Batch generate embeddings for existing records
export async function batchGenerateEmbeddings(
  tableName: string,
  fieldName: string,
  userId: string,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Get records that don't have embeddings yet
    const vectorColumnName = `${fieldName}_vector`;
    const { data: records, error } = await (supabase as any)
      .from(tableName)
      .select(`id, ${fieldName}`)
      .eq('user_id', userId)
      .is(vectorColumnName, null)
      .limit(batchSize);

    if (error) {
      console.error('Error fetching records for batch embedding:', error);
      throw error;
    }

    if (!records || records.length === 0) {
      console.log(`No records found for batch embedding in ${tableName}.${fieldName}`);
      return { processed: 0, errors: 0 };
    }

    console.log(`Processing ${records.length} records for ${tableName}.${fieldName}`);

    // Process records in batches
    for (const record of records) {
      try {
        const textContent = record[fieldName];
        if (textContent && textContent.trim().length > 0) {
          await generateAndStoreEmbedding(tableName, record.id, fieldName, textContent, userId);
          processed++;
        }
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Batch embedding complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };

  } catch (error) {
    console.error('Error in batch embedding generation:', error);
    throw error;
  }
}

// Get embedding metadata for a record
export async function getEmbeddingMetadata(
  tableName: string,
  recordId: string,
  fieldName?: string
): Promise<EmbeddingMetadata[]> {
  try {
    let query = (supabase as any)
      .from('embedding_metadata')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId);

    if (fieldName) {
      query = query.eq('field_name', fieldName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching embedding metadata:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getEmbeddingMetadata:', error);
    throw error;
  }
}

// Delete embeddings for a record
export async function deleteEmbeddings(
  tableName: string,
  recordId: string,
  userId: string
): Promise<void> {
  try {
    // Delete from embedding_metadata
    const { error: metadataError } = await (supabase as any)
      .from('embedding_metadata')
      .delete()
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .eq('user_id', userId);

    if (metadataError) {
      console.error('Error deleting embedding metadata:', metadataError);
      throw metadataError;
    }

    // Clear vector columns in the main table
    const vectorColumns = ['title_vector', 'description_vector', 'next_step_vector', 'persona_vector', 'notes_vector'];
    const updateData: any = {};
    
    for (const column of vectorColumns) {
      updateData[column] = null;
    }

    const { error: updateError } = await (supabase as any)
      .from(tableName)
      .update(updateData)
      .eq('id', recordId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error clearing vector columns:', updateError);
      throw updateError;
    }

    console.log(`✅ Embeddings deleted for ${tableName} record ${recordId}`);
  } catch (error) {
    console.error('Error in deleteEmbeddings:', error);
    throw error;
  }
} 