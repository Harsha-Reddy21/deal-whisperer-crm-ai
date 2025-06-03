import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

/**
 * Contact Embedding Service
 * Handles creation and updating of embeddings for contacts and their related activities
 */
export class ContactEmbeddingService {
  /**
   * Fetches a contact and its related activities
   */
  async fetchContactWithActivities(contactId: string) {
    console.log(`[Embeddings] Fetching contact data and activities for contact ${contactId}`);
    try {
      // Fetch the contact data
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;
      if (!contact) throw new Error(`Contact with ID ${contactId} not found`);

      // Fetch related activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      console.log(`[Embeddings] Found contact with ${activities?.length || 0} related activities`);
      return { contact, activities: activities || [] };
    } catch (error) {
      console.error('[Embeddings] Error fetching contact with activities:', error);
      throw error;
    }
  }

  /**
   * Composes the embedding text from contact data and activities
   * Format follows the example in sample.md but adapted for contacts
   */
  composeEmbeddingText(contact: any, activities: any[]) {
    console.log(`[Embeddings] Composing text for embedding contact: ${contact.name}`);
    // Format the contact data part
    let embeddingText = `Contact: ${contact.name}\n`;
    embeddingText += `Company: ${contact.company || 'N/A'}\n`;
    embeddingText += `Email: ${contact.email || 'N/A'}\n`;
    embeddingText += `Phone: ${contact.phone || 'N/A'}\n`;
    embeddingText += `Title: ${contact.title || 'N/A'}\n`;
    embeddingText += `Status: ${contact.status || 'N/A'}\n`;
    embeddingText += `Score: ${contact.score || 0}\n`;
    
    // Add any other relevant contact fields
    if (contact.persona) embeddingText += `Persona: ${contact.persona}\n`;
    if (contact.custom_fields) {
      try {
        const customFields = JSON.parse(contact.custom_fields);
        for (const [key, value] of Object.entries(customFields)) {
          embeddingText += `${key}: ${value}\n`;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    embeddingText += `Created At: ${new Date(contact.created_at).toLocaleDateString()}\n`;
    embeddingText += `Notes: ${contact.notes || ''}\n\n`;

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
   * Creates or updates embeddings for a contact
   */
  async updateContactEmbedding(contactId: string) {
    console.log(`[Embeddings] Starting embedding update process for contact ${contactId}`);
    try {
      // 1. Fetch contact and activities
      console.log(`[Embeddings] Step 1: Fetching contact data and activities`);
      const { contact, activities } = await this.fetchContactWithActivities(contactId);
      
      // 2. Compose the text for embedding
      console.log(`[Embeddings] Step 2: Composing text for embedding`);
      const embeddingText = this.composeEmbeddingText(contact, activities);
      
      // 3. Generate the embedding vector
      console.log(`[Embeddings] Step 3: Generating embedding vector`);
      const embeddingVector = await this.generateEmbedding(embeddingText);
      
      // 4. Update the contact record with the embedding
      console.log(`[Embeddings] Step 4: Storing embedding in database`);
      const { error } = await supabase
        .from('contacts')
        .update({ 
          persona_vector: embeddingVector,
            embedding: embeddingVector, // Also update notes vector with the same embedding
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
      
      if (error) throw error;
      
      console.log('embeddingVector', embeddingVector);
      
      console.log(`[Embeddings] ✅ Successfully updated embedding for contact ${contactId}`);
      return { success: true, contactId };
    } catch (error) {
      console.error(`[Embeddings] ❌ Error updating contact embedding for ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Handles contact creation by generating initial embeddings
   */
  async handleContactCreated(contactId: string) {
    console.log(`[Embeddings] 🆕 New contact created - generating initial embeddings for contact ${contactId}`);
    return this.updateContactEmbedding(contactId);
  }

  /**
   * Handles contact updates by regenerating embeddings
   */
  async handleContactUpdated(contactId: string) {
    console.log(`[Embeddings] 🔄 Contact updated - regenerating embeddings for contact ${contactId}`);
    return this.updateContactEmbedding(contactId);
  }

  /**
   * Handles activity creation/update by updating the related contact's embeddings
   */
  async handleActivityChanged(activityId: string) {
    console.log(`[Embeddings] 📝 Activity changed (${activityId}) - checking for related contact`);
    try {
      // Get the activity to find the associated contact
      const { data: activity, error } = await supabase
        .from('activities')
        .select('contact_id')
        .eq('id', activityId)
        .single();
      
      if (error) throw error;
      if (!activity || !activity.contact_id) {
        console.log(`[Embeddings] Activity ${activityId} is not associated with any contact`);
        return { success: false, reason: 'No contact associated with activity' };
      }
      
      // Update the contact embedding
      console.log(`[Embeddings] Found related contact ${activity.contact_id} - updating embeddings`);
      return this.updateContactEmbedding(activity.contact_id);
    } catch (error) {
      console.error(`[Embeddings] Error handling activity change for ${activityId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const contactEmbeddingService = new ContactEmbeddingService(); 