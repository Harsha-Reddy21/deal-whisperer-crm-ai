import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

/**
 * Lead Embedding Service
 * Handles creation and updating of embeddings for leads and their related activities
 */
export class LeadEmbeddingService {
  /**
   * Fetches a lead and its related activities
   */
  async fetchLeadWithActivities(leadId: string) {
    console.log(`[Embeddings] Fetching lead data and activities for lead ${leadId}`);
    try {
      // Fetch the lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      if (!lead) throw new Error(`Lead with ID ${leadId} not found`);

      // Fetch related activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      console.log(`[Embeddings] Found lead with ${activities?.length || 0} related activities`);
      return { lead, activities: activities || [] };
    } catch (error) {
      console.error('[Embeddings] Error fetching lead with activities:', error);
      throw error;
    }
  }

  /**
   * Composes the embedding text from lead data and activities
   * Format follows the example in sample.md
   */
  composeEmbeddingText(lead: any, activities: any[]) {
    console.log(`[Embeddings] Composing text for embedding lead: ${lead.name}`);
    // Format the lead data part
    let embeddingText = `Lead: ${lead.name}\n`;
    embeddingText += `Company: ${lead.company || 'N/A'}\n`;
    embeddingText += `Email: ${lead.email || 'N/A'}\n`;
    embeddingText += `Phone: ${lead.phone || 'N/A'}\n`;
    embeddingText += `Lead Source: ${lead.source || 'N/A'}\n`;
    embeddingText += `Status: ${lead.status || 'N/A'}\n`;
    embeddingText += `Score: ${lead.score || 0}\n`;
    
    // Add any other relevant lead fields
    if (lead.title) embeddingText += `Title: ${lead.title}\n`;
    if (lead.custom_fields) {
      try {
        const customFields = JSON.parse(lead.custom_fields);
        for (const [key, value] of Object.entries(customFields)) {
          embeddingText += `${key}: ${value}\n`;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    embeddingText += `Created At: ${new Date(lead.created_at).toLocaleDateString()}\n`;
    embeddingText += `Notes: ${lead.notes || ''}\n\n`;

    // Add activities section if there are any
    if (activities.length > 0) {
      embeddingText += 'Activities:\n';
      
      // Format each activity
      activities.forEach(activity => {
        const date = activity.created_at ? 
          new Date(activity.created_at).toISOString().split('T')[0] : 
          'Unknown date';
          
        embeddingText += `- [${date}] ${activity.type}: ${activity.description || activity.title || ''}\n`;
        
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
    console.log(`[Embeddings] Generating embedding vector for text (${text.length} characters)`);
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
   * Creates or updates embeddings for a lead
   */
  async updateLeadEmbedding(leadId: string) {
    console.log(`[Embeddings] Starting embedding update process for lead ${leadId}`);
    try {
      // 1. Fetch lead and activities
      console.log(`[Embeddings] Step 1: Fetching lead data and activities`);
      const { lead, activities } = await this.fetchLeadWithActivities(leadId);
      
      // 2. Compose the text for embedding
      console.log(`[Embeddings] Step 2: Composing text for embedding`);
      const embeddingText = this.composeEmbeddingText(lead, activities);
      
      // 3. Generate the embedding vector
      console.log(`[Embeddings] Step 3: Generating embedding vector`);
      const embeddingVector = await this.generateEmbedding(embeddingText);
      
      // 4. Update the lead record with the embedding
      console.log(`[Embeddings] Step 4: Storing embedding in database`);
      const { error } = await supabase
        .from('leads')
        .update({ 
          embedding: embeddingVector,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
      
      if (error) throw error;

      console.log('embeddingVector', embeddingVector);
      
      console.log(`[Embeddings] ✅ Successfully updated embedding for lead ${leadId}`);
      return { success: true, leadId };
    } catch (error) {
      console.error(`[Embeddings] ❌ Error updating lead embedding for ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Handles lead creation by generating initial embeddings
   */
  async handleLeadCreated(leadId: string) {
    console.log(`[Embeddings] 🆕 New lead created - generating initial embeddings for lead ${leadId}`);
    return this.updateLeadEmbedding(leadId);
  }

  /**
   * Handles lead updates by regenerating embeddings
   */
  async handleLeadUpdated(leadId: string) {
    console.log(`[Embeddings] 🔄 Lead updated - regenerating embeddings for lead ${leadId}`);
    return this.updateLeadEmbedding(leadId);
  }

  /**
   * Handles activity creation/update by updating the related lead's embeddings
   */
  async handleActivityChanged(activityId: string) {
    console.log(`[Embeddings] 📝 Activity changed (${activityId}) - checking for related lead`);
    try {
      // Get the activity to find the associated lead
      const { data: activity, error } = await supabase
        .from('activities')
        .select('lead_id')
        .eq('id', activityId)
        .single();
      
      if (error) throw error;
      if (!activity || !activity.lead_id) {
        console.log(`[Embeddings] Activity ${activityId} is not associated with any lead`);
        return { success: false, reason: 'No lead associated with activity' };
      }
      
      // Update the lead embedding
      console.log(`[Embeddings] Found related lead ${activity.lead_id} - updating embeddings`);
      return this.updateLeadEmbedding(activity.lead_id);
    } catch (error) {
      console.error(`[Embeddings] Error handling activity change for ${activityId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const leadEmbeddingService = new LeadEmbeddingService(); 