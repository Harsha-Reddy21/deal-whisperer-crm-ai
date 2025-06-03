import { supabase } from '@/integrations/supabase/client';
import { generateEmbedding, EmbeddingResponse } from './embeddingService';

export interface CompositeEmbeddingRequest {
  entityType: 'deal' | 'contact' | 'lead';
  entityId: string;
  userId: string;
}

export interface CompositeSearchRequest {
  query: string;
  entityType: 'deal' | 'contact' | 'lead' | 'all';
  similarityThreshold?: number;
  maxResults?: number;
  userId: string;
}

export interface CompositeSearchResult {
  id: string;
  entityType: string;
  title?: string;
  name?: string;
  company?: string;
  stage?: string;
  status?: string;
  value?: number;
  email?: string;
  similarity: number;
  contextPreview: string;
}

// Generate composite embedding for an entity (deal, contact, or lead)
export async function generateCompositeEmbedding(request: CompositeEmbeddingRequest): Promise<void> {
  try {
    // Get the rich text context using database functions
    let contextText = '';
    
    switch (request.entityType) {
      case 'deal':
        const { data: dealContext, error: dealError } = await (supabase as any)
          .rpc('compose_deal_context', { deal_id: request.entityId });
        
        if (dealError) {
          console.error('Error getting deal context:', dealError);
          throw dealError;
        }
        contextText = dealContext || '';
        break;
        
      case 'contact':
        const { data: contactContext, error: contactError } = await (supabase as any)
          .rpc('compose_contact_context', { contact_id: request.entityId });
        
        if (contactError) {
          console.error('Error getting contact context:', contactError);
          throw contactError;
        }
        contextText = contactContext || '';
        break;
        
      case 'lead':
        const { data: leadContext, error: leadError } = await (supabase as any)
          .rpc('compose_lead_context', { lead_id: request.entityId });
        
        if (leadError) {
          console.error('Error getting lead context:', leadError);
          throw leadError;
        }
        contextText = leadContext || '';
        break;
        
      default:
        throw new Error(`Unsupported entity type: ${request.entityType}`);
    }

    if (!contextText || contextText.trim().length === 0) {
      console.warn(`No context text found for ${request.entityType} ${request.entityId}`);
      return;
    }

    // Generate embedding for the composite context
    const embeddingResponse: EmbeddingResponse = await generateEmbedding({ 
      text: contextText 
    });

    // Store the composite embedding in the appropriate table
    const tableName = request.entityType === 'deal' ? 'deals' : 
                     request.entityType === 'contact' ? 'contacts' : 'leads';
    
    const { error: updateError } = await (supabase as any)
      .from(tableName)
      .update({ 
        composite_embedding: embeddingResponse.embedding,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.entityId)
      .eq('user_id', request.userId);

    if (updateError) {
      console.error(`Error storing composite embedding for ${request.entityType}:`, updateError);
      throw updateError;
    }

    // Also store in embedding_metadata for tracking
    const { error: metadataError } = await (supabase as any)
      .from('embedding_metadata')
      .upsert({
        user_id: request.userId,
        table_name: tableName,
        record_id: request.entityId,
        field_name: 'composite',
        text_content: contextText.substring(0, 1000) + (contextText.length > 1000 ? '...' : ''), // Truncate for storage
        embedding_vector: embeddingResponse.embedding,
        embedding_model: embeddingResponse.model,
        updated_at: new Date().toISOString()
      });

    if (metadataError) {
      console.warn('Error storing composite embedding metadata:', metadataError);
      // Don't throw here as the main embedding was stored successfully
    }

    console.log(`✅ Composite embedding generated for ${request.entityType} ${request.entityId}`);

  } catch (error) {
    console.error('Error in generateCompositeEmbedding:', error);
    throw error;
  }
}

// Update composite embedding when entity or related activities change
export async function updateCompositeEmbedding(
  entityType: 'deal' | 'contact' | 'lead',
  entityId: string,
  userId: string
): Promise<void> {
  return generateCompositeEmbedding({ entityType, entityId, userId });
}

// Search using composite embeddings
export async function searchCompositeEmbeddings(request: CompositeSearchRequest): Promise<CompositeSearchResult[]> {
  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding({ text: request.query });
    
    const results: CompositeSearchResult[] = [];
    const similarityThreshold = request.similarityThreshold || 0.7;
    const maxResults = request.maxResults || 10;

    // Search deals if requested
    if (request.entityType === 'deal' || request.entityType === 'all') {
      const { data: dealResults, error: dealError } = await (supabase as any)
        .rpc('search_deals_composite', {
          query_embedding: queryEmbedding.embedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: request.userId
        });

      if (dealError) {
        console.error('Error searching deals:', dealError);
      } else if (dealResults) {
        results.push(...(dealResults as any[]).map((deal: any) => ({
          id: deal.id,
          entityType: 'deal',
          title: deal.title,
          company: deal.company,
          stage: deal.stage,
          value: deal.value,
          similarity: deal.similarity,
          contextPreview: deal.context_preview
        })));
      }
    }

    // Search contacts if requested
    if (request.entityType === 'contact' || request.entityType === 'all') {
      const { data: contactResults, error: contactError } = await (supabase as any)
        .rpc('search_contacts_composite', {
          query_embedding: queryEmbedding.embedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: request.userId
        });

      if (contactError) {
        console.error('Error searching contacts:', contactError);
      } else if (contactResults) {
        results.push(...(contactResults as any[]).map((contact: any) => ({
          id: contact.id,
          entityType: 'contact',
          name: contact.name,
          company: contact.company,
          title: contact.title,
          email: contact.email,
          similarity: contact.similarity,
          contextPreview: contact.context_preview
        })));
      }
    }

    // Search leads if requested
    if (request.entityType === 'lead' || request.entityType === 'all') {
      const { data: leadResults, error: leadError } = await (supabase as any)
        .rpc('search_leads_composite', {
          query_embedding: queryEmbedding.embedding,
          similarity_threshold: similarityThreshold,
          match_count: maxResults,
          target_user_id: request.userId
        });

      if (leadError) {
        console.error('Error searching leads:', leadError);
      } else if (leadResults) {
        results.push(...(leadResults as any[]).map((lead: any) => ({
          id: lead.id,
          entityType: 'lead',
          name: lead.name,
          company: lead.company,
          email: lead.email,
          status: lead.status,
          similarity: lead.similarity,
          contextPreview: lead.context_preview
        })));
      }
    }

    // Sort by similarity and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

  } catch (error) {
    console.error('Error in searchCompositeEmbeddings:', error);
    throw error;
  }
}

// Batch generate composite embeddings for all entities of a type
export async function batchGenerateCompositeEmbeddings(
  entityType: 'deal' | 'contact' | 'lead',
  userId: string,
  batchSize: number = 5
): Promise<{ processed: number; errors: number }> {
  try {
    const tableName = entityType === 'deal' ? 'deals' : 
                     entityType === 'contact' ? 'contacts' : 'leads';
    
    // Get all entities for the user that don't have composite embeddings
    const { data: entities, error: fetchError } = await (supabase as any)
      .from(tableName)
      .select('id')
      .eq('user_id', userId)
      .is('composite_embedding', null);

    if (fetchError) {
      console.error(`Error fetching ${entityType}s:`, fetchError);
      throw fetchError;
    }

    if (!entities || entities.length === 0) {
      console.log(`No ${entityType}s found without composite embeddings`);
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entity: any) => {
        try {
          await generateCompositeEmbedding({
            entityType,
            entityId: entity.id,
            userId
          });
          processed++;
        } catch (error) {
          console.error(`Error processing ${entityType} ${entity.id}:`, error);
          errors++;
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < entities.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Batch processing complete for ${entityType}s: ${processed} processed, ${errors} errors`);
    return { processed, errors };

  } catch (error) {
    console.error(`Error in batchGenerateCompositeEmbeddings for ${entityType}:`, error);
    throw error;
  }
}

// Get the rich text context for an entity (useful for debugging)
export async function getEntityContext(
  entityType: 'deal' | 'contact' | 'lead',
  entityId: string
): Promise<string> {
  try {
    let contextText = '';
    
    switch (entityType) {
      case 'deal':
        const { data: dealContext, error: dealError } = await (supabase as any)
          .rpc('compose_deal_context', { deal_id: entityId });
        
        if (dealError) throw dealError;
        contextText = dealContext || '';
        break;
        
      case 'contact':
        const { data: contactContext, error: contactError } = await (supabase as any)
          .rpc('compose_contact_context', { contact_id: entityId });
        
        if (contactError) throw contactError;
        contextText = contactContext || '';
        break;
        
      case 'lead':
        const { data: leadContext, error: leadError } = await (supabase as any)
          .rpc('compose_lead_context', { lead_id: entityId });
        
        if (leadError) throw leadError;
        contextText = leadContext || '';
        break;
    }

    return contextText;

  } catch (error) {
    console.error('Error getting entity context:', error);
    throw error;
  }
}

// Handle activity changes to update related entity embeddings
export async function handleActivityChange(
  activityType: 'create' | 'update' | 'delete',
  dealId?: string,
  contactId?: string, 
  leadId?: string,
  userId?: string
): Promise<void> {
  if (!userId) {
    console.warn('User ID is required for handleActivityChange');
    return;
  }

  const updatePromises: Promise<void>[] = [];

  // Update deal embedding if deal is affected
  if (dealId) {
    updatePromises.push(
      updateCompositeEmbedding('deal', dealId, userId)
        .catch(err => console.error(`Error updating deal embedding after activity ${activityType}:`, err))
    );
  }

  // Update contact embedding if contact is affected
  if (contactId) {
    updatePromises.push(
      updateCompositeEmbedding('contact', contactId, userId)
        .catch(err => console.error(`Error updating contact embedding after activity ${activityType}:`, err))
    );
  }
  
  // Update lead embedding if lead is affected
  if (leadId) {
    updatePromises.push(
      updateCompositeEmbedding('lead', leadId, userId)
        .catch(err => console.error(`Error updating lead embedding after activity ${activityType}:`, err))
    );
  }

  // Wait for all updates to complete
  if (updatePromises.length > 0) {
    await Promise.allSettled(updatePromises);
    console.log(`✅ Composite embeddings updated for entities after activity ${activityType}`);
  }
} 