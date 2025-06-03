import { supabase } from '@/integrations/supabase/client';
import { generateAndStoreEmbedding, performSemanticSearch, batchGenerateEmbeddings, deleteEmbeddings } from './embeddingService';
import { generateCompositeEmbedding } from './compositeEmbeddingService';

// Types for lead embedding operations
export interface LeadEmbeddingData {
  id?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  notes?: string;
  user_id: string;
}

export interface LeadSearchRequest {
  query: string;
  similarityThreshold?: number;
  maxResults?: number;
  userId: string;
}

export interface LeadSearchResult {
  id: string;
  name: string;
  company?: string;
  email?: string;
  status?: string;
  similarity: number;
}

// Create a new lead with embeddings
export async function createLeadWithEmbeddings(leadData: Omit<LeadEmbeddingData, 'id'>): Promise<string> {
  try {
    // Insert the lead first
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        name: leadData.name,
        company: leadData.company || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
        status: leadData.status || 'new',
        source: leadData.source || 'manual',
        notes: leadData.notes || '',
        user_id: leadData.user_id,
        score: 50 // Default score
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      throw insertError;
    }

    const leadId = newLead.id;

    // Generate embeddings for relevant fields
    const embeddingPromises = [];

    if (leadData.notes && leadData.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('leads', leadId, 'notes', leadData.notes, leadData.user_id)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);
    
    // Generate composite embedding that includes lead context and related activities
    try {
      await generateCompositeEmbedding({
        entityType: 'lead',
        entityId: leadId,
        userId: leadData.user_id
      });
      
      console.log(`✅ Composite embedding generated for new lead: ${leadId}`);
    } catch (embeddingError) {
      console.error('Error generating composite embedding for new lead:', embeddingError);
      // Don't throw here to avoid failing the entire lead creation
    }

    console.log(`✅ Lead created with embeddings: ${leadId}`);
    return leadId;

  } catch (error) {
    console.error('Error in createLeadWithEmbeddings:', error);
    throw error;
  }
}

// Update lead with embeddings
export async function updateLeadWithEmbeddings(
  leadId: string,
  updates: Partial<LeadEmbeddingData>,
  userId: string
): Promise<void> {
  try {
    // Update the lead record
    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    // Generate embeddings for updated fields
    const embeddingPromises = [];

    if (updates.notes !== undefined && updates.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('leads', leadId, 'notes', updates.notes, userId)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);
    
    // Update composite embedding to reflect changes
    try {
      await generateCompositeEmbedding({
        entityType: 'lead',
        entityId: leadId,
        userId: userId
      });
      
      console.log(`✅ Composite embedding updated for lead: ${leadId}`);
    } catch (embeddingError) {
      console.error('Error updating composite embedding for lead:', embeddingError);
      // Don't throw here to avoid failing the entire update
    }

    console.log(`✅ Lead updated with embeddings: ${leadId}`);

  } catch (error) {
    console.error('Error in updateLeadWithEmbeddings:', error);
    throw error;
  }
}

// Delete lead with embeddings
export async function deleteLeadWithEmbeddings(leadId: string, userId: string): Promise<void> {
  try {
    // Delete embeddings first
    await deleteEmbeddings('leads', leadId, userId);

    // Delete the lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Lead and embeddings deleted: ${leadId}`);

  } catch (error) {
    console.error('Error in deleteLeadWithEmbeddings:', error);
    throw error;
  }
}

// Search for similar leads using semantic search
export async function searchSimilarLeads(request: LeadSearchRequest): Promise<LeadSearchResult[]> {
  try {
    // Use 'all' as searchType since 'leads' is not a valid option in the current type definition
    const searchResponse = await performSemanticSearch({
      query: request.query,
      searchType: 'all', // Changed from 'leads' to 'all' to match valid types
      similarityThreshold: request.similarityThreshold || 0.7,
      maxResults: request.maxResults || 10,
      userId: request.userId
    });

    // Map the results and handle potential missing properties
    return searchResponse.results.map(result => ({
      id: result.id,
      name: result.name || '',
      company: result.company,
      email: result.type === 'lead' ? result.title : undefined, // Use title as fallback since email is not in SemanticSearchResult
      status: undefined, // Status is not in SemanticSearchResult
      similarity: result.similarity
    }));

  } catch (error) {
    console.error('Error in searchSimilarLeads:', error);
    throw error;
  }
}

// Batch process existing leads to generate embeddings
export async function batchProcessLeadsForEmbeddings(userId: string): Promise<{
  processed: number;
  errors: number;
}> {
  try {
    console.log('🚀 Starting batch processing of leads for embeddings...');

    const notesResult = await batchGenerateEmbeddings('leads', 'notes', userId);

    console.log(`✅ Batch processing complete: ${notesResult.processed} embeddings generated, ${notesResult.errors} errors`);

    return notesResult;

  } catch (error) {
    console.error('Error in batchProcessLeadsForEmbeddings:', error);
    throw error;
  }
}

// Get lead embedding statistics
export async function getLeadEmbeddingStats(userId: string): Promise<{
  totalLeads: number;
  leadsWithEmbeddings: number;
  embeddingCoverage: number;
}> {
  try {
    // Get total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get leads with embeddings
    const { count: leadsWithEmbeddings } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('composite_embedding', 'is', null);

    const embeddingCoverage = totalLeads > 0 
      ? Math.round((leadsWithEmbeddings || 0) / totalLeads * 100)
      : 0;

    return {
      totalLeads: totalLeads || 0,
      leadsWithEmbeddings: leadsWithEmbeddings || 0,
      embeddingCoverage
    };

  } catch (error) {
    console.error('Error getting lead embedding stats:', error);
    return {
      totalLeads: 0,
      leadsWithEmbeddings: 0,
      embeddingCoverage: 0
    };
  }
} 