import { supabase } from '@/integrations/supabase/client';
import { generateAndStoreEmbedding, deleteEmbeddings, performSemanticSearch } from './embeddingService';

export interface DealEmbeddingData {
  id: string;
  title: string;
  company?: string;
  next_step?: string;
  stage?: string;
  value?: number;
  user_id: string;
}

export interface DealSearchRequest {
  query: string;
  similarityThreshold?: number;
  maxResults?: number;
  userId: string;
}

export interface DealSearchResult {
  id: string;
  title: string;
  company?: string;
  stage?: string;
  value?: number;
  similarity: number;
  matchedField: string;
}

// Create a new deal with embeddings
export async function createDealWithEmbeddings(dealData: Omit<DealEmbeddingData, 'id'>): Promise<string> {
  try {
    // Insert the deal first
    const { data: newDeal, error: insertError } = await supabase
      .from('deals')
      .insert({
        title: dealData.title,
        company: dealData.company || '',
        next_step: dealData.next_step || '',
        stage: dealData.stage || 'Discovery',
        value: dealData.value || 0,
        user_id: dealData.user_id,
        probability: 50, // Default probability
        contact_name: '', // Default empty
        last_activity: new Date().toISOString(),
        outcome: 'in_progress'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating deal:', insertError);
      throw insertError;
    }

    const dealId = newDeal.id;

    // Generate embeddings for relevant fields
    const embeddingPromises = [];

    if (dealData.title && dealData.title.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('deals', dealId, 'title', dealData.title, dealData.user_id)
      );
    }

    if (dealData.next_step && dealData.next_step.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('deals', dealId, 'next_step', dealData.next_step, dealData.user_id)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Deal created with embeddings: ${dealId}`);
    return dealId;

  } catch (error) {
    console.error('Error in createDealWithEmbeddings:', error);
    throw error;
  }
}

// Update a deal and regenerate embeddings for changed fields
export async function updateDealWithEmbeddings(
  dealId: string,
  updates: Partial<DealEmbeddingData>,
  userId: string
): Promise<void> {
  try {
    // Update the deal in the database
    const { error: updateError } = await supabase
      .from('deals')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating deal:', updateError);
      throw updateError;
    }

    // Regenerate embeddings for updated fields
    const embeddingPromises = [];

    if (updates.title !== undefined && updates.title.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('deals', dealId, 'title', updates.title, userId)
      );
    }

    if (updates.next_step !== undefined && updates.next_step.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('deals', dealId, 'next_step', updates.next_step, userId)
      );
    }

    // Wait for all embeddings to be updated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Deal updated with embeddings: ${dealId}`);

  } catch (error) {
    console.error('Error in updateDealWithEmbeddings:', error);
    throw error;
  }
}

// Delete a deal and its embeddings
export async function deleteDealWithEmbeddings(dealId: string, userId: string): Promise<void> {
  try {
    // Delete embeddings first
    await deleteEmbeddings('deals', dealId, userId);

    // Delete the deal
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting deal:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Deal and embeddings deleted: ${dealId}`);

  } catch (error) {
    console.error('Error in deleteDealWithEmbeddings:', error);
    throw error;
  }
}

// Search for similar deals using semantic search
export async function searchSimilarDeals(request: DealSearchRequest): Promise<DealSearchResult[]> {
  try {
    const searchResponse = await performSemanticSearch({
      query: request.query,
      searchType: 'deals',
      similarityThreshold: request.similarityThreshold || 0.7,
      maxResults: request.maxResults || 10,
      userId: request.userId
    });

    return searchResponse.results.map(result => ({
      id: result.id,
      title: result.title || '',
      company: result.company,
      stage: result.stage,
      value: result.value,
      similarity: result.similarity,
      matchedField: 'title' // Default to title, could be enhanced to detect which field matched
    }));

  } catch (error) {
    console.error('Error in searchSimilarDeals:', error);
    throw error;
  }
}

// Batch process existing deals to generate embeddings
export async function batchProcessDealsForEmbeddings(userId: string): Promise<{
  processed: number;
  errors: number;
  details: { field: string; processed: number; errors: number }[];
}> {
  try {
    const results = [];

    // Process title embeddings
    const titleResult = await batchGenerateEmbeddingsForField('deals', 'title', userId);
    results.push({ field: 'title', ...titleResult });

    // Process next_step embeddings
    const nextStepResult = await batchGenerateEmbeddingsForField('deals', 'next_step', userId);
    results.push({ field: 'next_step', ...nextStepResult });

    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log(`✅ Batch processing complete: ${totalProcessed} processed, ${totalErrors} errors`);

    return {
      processed: totalProcessed,
      errors: totalErrors,
      details: results
    };

  } catch (error) {
    console.error('Error in batchProcessDealsForEmbeddings:', error);
    throw error;
  }
}

// Helper function to batch generate embeddings for a specific field
async function batchGenerateEmbeddingsForField(
  tableName: string,
  fieldName: string,
  userId: string,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    try {
      // Get records that don't have embeddings yet
      const vectorColumnName = `${fieldName}_vector`;
      const { data: records, error } = await (supabase as any)
        .from(tableName)
        .select(`id, ${fieldName}`)
        .eq('user_id', userId)
        .is(vectorColumnName, null)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching records for batch embedding:', error);
        throw error;
      }

      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing batch ${offset}-${offset + records.length} for ${tableName}.${fieldName}`);

      // Process records in this batch
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

      offset += batchSize;

      // If we got fewer records than batch size, we're done
      if (records.length < batchSize) {
        hasMore = false;
      }

    } catch (error) {
      console.error('Error in batch processing:', error);
      errors++;
      hasMore = false;
    }
  }

  return { processed, errors };
}

// Get deal recommendations based on similar deals
export async function getDealRecommendations(
  dealId: string,
  userId: string,
  maxRecommendations: number = 5
): Promise<{
  similarDeals: DealSearchResult[];
  recommendations: string[];
}> {
  try {
    // Get the current deal
    const { data: currentDeal, error: dealError } = await supabase
      .from('deals')
      .select('title, next_step, stage, value')
      .eq('id', dealId)
      .eq('user_id', userId)
      .single();

    if (dealError || !currentDeal) {
      throw new Error('Deal not found');
    }

    // Search for similar deals based on title
    const searchQuery = `${currentDeal.title} ${currentDeal.stage}`;
    const similarDeals = await searchSimilarDeals({
      query: searchQuery,
      similarityThreshold: 0.6,
      maxResults: maxRecommendations,
      userId
    });

    // Filter out the current deal from results
    const filteredSimilarDeals = similarDeals.filter(deal => deal.id !== dealId);

    // Generate recommendations based on similar deals
    const recommendations = [];
    
    if (filteredSimilarDeals.length > 0) {
      const avgValue = filteredSimilarDeals.reduce((sum, deal) => sum + (deal.value || 0), 0) / filteredSimilarDeals.length;
      
      if (currentDeal.value < avgValue * 0.8) {
        recommendations.push(`Consider increasing deal value. Similar deals average $${avgValue.toLocaleString()}`);
      }

      const commonStages = filteredSimilarDeals.map(deal => deal.stage).filter(Boolean);
      const stageFrequency = commonStages.reduce((acc: any, stage) => {
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {});

      const mostCommonStage = Object.keys(stageFrequency).reduce((a, b) => 
        stageFrequency[a] > stageFrequency[b] ? a : b
      );

      if (mostCommonStage && mostCommonStage !== currentDeal.stage) {
        recommendations.push(`Similar deals often progress to "${mostCommonStage}" stage`);
      }

      recommendations.push(`Found ${filteredSimilarDeals.length} similar deals for pattern analysis`);
    } else {
      recommendations.push('No similar deals found. This appears to be a unique opportunity.');
    }

    return {
      similarDeals: filteredSimilarDeals,
      recommendations
    };

  } catch (error) {
    console.error('Error in getDealRecommendations:', error);
    throw error;
  }
} 