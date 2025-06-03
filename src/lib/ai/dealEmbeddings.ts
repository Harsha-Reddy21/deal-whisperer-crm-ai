import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

/**
 * Deal Embedding Service
 * Handles creation and updating of embeddings for deals and their related activities
 */
export class DealEmbeddingService {
  /**
   * Fetches a deal and its related activities
   */
  async fetchDealWithActivities(dealId: string) {
    console.log(`[Embeddings] Fetching deal data and activities for deal ${dealId}`);
    try {
      // Fetch the deal data
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      if (!deal) throw new Error(`Deal with ID ${dealId} not found`);

      // Fetch related activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      console.log(`[Embeddings] Found deal with ${activities?.length || 0} related activities`);
      return { deal, activities: activities || [] };
    } catch (error) {
      console.error('[Embeddings] Error fetching deal with activities:', error);
      throw error;
    }
  }

  /**
   * Composes the embedding text from deal data and activities
   * Format follows the example in sample.md but adapted for deals
   */
  composeEmbeddingText(deal: any, activities: any[]) {
    console.log(`[Embeddings] Composing text for embedding deal: ${deal.title}`);
    // Format the deal data part
    let embeddingText = `Deal: ${deal.title}\n`;
    embeddingText += `Company: ${deal.company || 'N/A'}\n`;
    embeddingText += `Value: ${deal.value || 0}\n`;
    embeddingText += `Stage: ${deal.stage || 'N/A'}\n`;
    embeddingText += `Probability: ${deal.probability || 0}%\n`;
    
    // Add any other relevant deal fields
    if (deal.next_step) embeddingText += `Next Step: ${deal.next_step}\n`;
    if (deal.close_date) embeddingText += `Close Date: ${new Date(deal.close_date).toLocaleDateString()}\n`;
    if (deal.contact_name) embeddingText += `Contact: ${deal.contact_name}\n`;
    if (deal.contact_id) embeddingText += `Contact ID: ${deal.contact_id}\n`;
    
    embeddingText += `Created At: ${new Date(deal.created_at).toLocaleDateString()}\n`;
    embeddingText += `Notes: ${deal.notes || ''}\n\n`;

    // Add activities section if there are any
    if (activities.length > 0) {
      embeddingText += 'Activities:\n';
      
      // Format each activity
      activities.forEach(activity => {
        const date = activity.created_at ? 
          new Date(activity.created_at).toISOString().split('T')[0] : 
          'Unknown date';
          
        embeddingText += `- [${date}] ${activity.type}: ${activity.description || activity.subject || ''}\n`;
        
        // Add notes if available
        if (activity.notes) {
          embeddingText += `  Notes: ${activity.notes}\n`;
        }
      });
    }

    console.log(`[Embeddings] Text composition complete (${embeddingText.length} characters)`);
    return embeddingText;
  }

  /**
   * Generates an embedding vector using OpenAI API
   */
  async generateEmbedding(text: string) {
    console.log(`[Embeddings] Generating embedding vector for text (${text} characters)`);
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      
      console.log(`[Embeddings] Successfully generated embedding vector (dimensions: ${response.data[0].embedding.length})`);
      return response.data[0].embedding;
    } catch (error) {
      console.error('[Embeddings] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Creates or updates embeddings for a deal
   */
  async updateDealEmbedding(dealId: string) {
    console.log(`[Embeddings] Starting embedding update process for deal ${dealId}`);
    try {
      // 1. Fetch deal and activities
      console.log(`[Embeddings] Step 1: Fetching deal data and activities`);
      const { deal, activities } = await this.fetchDealWithActivities(dealId);
      
      // 2. Compose the text for embedding
      console.log(`[Embeddings] Step 2: Composing text for embedding`);
      const embeddingText = this.composeEmbeddingText(deal, activities);
      
      // 3. Generate the embedding vector
      console.log(`[Embeddings] Step 3: Generating embedding vector`);
      const embeddingVector = await this.generateEmbedding(embeddingText);
      
      // 4. Update the deal record with the embedding
      console.log(`[Embeddings] Step 4: Storing embedding in database`);
      const { error } = await supabase
        .from('deals')
        .update({ 
          description_vector: embeddingVector,
          embedding: embeddingVector, // Also update notes vector with the same embedding
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', dealId);
      
      if (error) throw error;
      
      console.log(`[Embeddings] ✅ Successfully updated embedding for deal ${dealId}`);
      return { success: true, dealId };
    } catch (error) {
      console.error(`[Embeddings] ❌ Error updating deal embedding for ${dealId}:`, error);
      throw error;
    }
  }

  /**
   * Handles deal creation by generating initial embeddings
   */
  async handleDealCreated(dealId: string) {
    console.log(`[Embeddings] 🆕 New deal created - generating initial embeddings for deal ${dealId}`);
    return this.updateDealEmbedding(dealId);
  }

  /**
   * Handles deal updates by regenerating embeddings
   */
  async handleDealUpdated(dealId: string) {
    console.log(`[Embeddings] 🔄 Deal updated - regenerating embeddings for deal ${dealId}`);
    return this.updateDealEmbedding(dealId);
  }

  /**
   * Handles activity creation/update by updating the related deal's embeddings
   */
  async handleActivityChanged(activityId: string) {
    console.log(`[Embeddings] 📝 Activity changed (${activityId}) - checking for related deal`);
    try {
      // Get the activity to find the associated deal
      const { data: activity, error } = await supabase
        .from('activities')
        .select('deal_id')
        .eq('id', activityId)
        .single();
      
      if (error) throw error;
      if (!activity || !activity.deal_id) {
        console.log(`[Embeddings] Activity ${activityId} is not associated with any deal`);
        return { success: false, reason: 'No deal associated with activity' };
      }
      
      // Update the deal embedding
      console.log(`[Embeddings] Found related deal ${activity.deal_id} - updating embeddings`);
      return this.updateDealEmbedding(activity.deal_id);
    } catch (error) {
      console.error(`[Embeddings] Error handling activity change for ${activityId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const dealEmbeddingService = new DealEmbeddingService(); 