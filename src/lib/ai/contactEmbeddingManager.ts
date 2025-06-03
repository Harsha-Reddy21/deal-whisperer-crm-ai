import { supabase } from '@/integrations/supabase/client';
import { generateAndStoreEmbedding, performSemanticSearch, batchGenerateEmbeddings, deleteEmbeddings } from './embeddingService';

// Types for contact embedding operations
export interface ContactEmbeddingData {
  id?: string;
  name: string;
  company?: string;
  title?: string;
  persona?: string;
  notes?: string;
  user_id: string;
}

export interface ContactSearchRequest {
  query: string;
  similarityThreshold?: number;
  maxResults?: number;
  userId: string;
}

export interface ContactSearchResult {
  id: string;
  name: string;
  company?: string;
  title?: string;
  persona?: string;
  similarity: number;
}

export interface ContactRecommendations {
  similarContacts: ContactSearchResult[];
  recommendations: string[];
  insights: {
    commonTitles: string[];
    commonCompanies: string[];
    averageEngagement: string;
  };
}

// Create a new contact with embeddings
export async function createContactWithEmbeddings(contactData: Omit<ContactEmbeddingData, 'id'>): Promise<string> {
  try {
    // Insert the contact first
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        name: contactData.name,
        company: contactData.company || '',
        title: contactData.title || '',
        persona: contactData.persona || '',
        notes: contactData.notes || '',
        user_id: contactData.user_id,
        email: '', // Default empty
        phone: '', // Default empty
        status: 'active'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating contact:', insertError);
      throw insertError;
    }

    const contactId = newContact.id;

    // Generate embeddings for relevant fields
    const embeddingPromises = [];

    if (contactData.persona && contactData.persona.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('contacts', contactId, 'persona', contactData.persona, contactData.user_id)
      );
    }

    if (contactData.notes && contactData.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('contacts', contactId, 'notes', contactData.notes, contactData.user_id)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Contact created with embeddings: ${contactId}`);
    return contactId;

  } catch (error) {
    console.error('Error in createContactWithEmbeddings:', error);
    throw error;
  }
}

// Update contact with embeddings
export async function updateContactWithEmbeddings(
  contactId: string,
  updates: Partial<ContactEmbeddingData>,
  userId: string
): Promise<void> {
  try {
    // Update the contact record
    const { error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating contact:', updateError);
      throw updateError;
    }

    // Generate embeddings for updated fields
    const embeddingPromises = [];

    if (updates.persona !== undefined && updates.persona.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('contacts', contactId, 'persona', updates.persona, userId)
      );
    }

    if (updates.notes !== undefined && updates.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('contacts', contactId, 'notes', updates.notes, userId)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Contact updated with embeddings: ${contactId}`);

  } catch (error) {
    console.error('Error in updateContactWithEmbeddings:', error);
    throw error;
  }
}

// Delete contact with embeddings
export async function deleteContactWithEmbeddings(contactId: string, userId: string): Promise<void> {
  try {
    // Delete embeddings first
    await deleteEmbeddings('contacts', contactId, userId);

    // Delete the contact
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting contact:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Contact and embeddings deleted: ${contactId}`);

  } catch (error) {
    console.error('Error in deleteContactWithEmbeddings:', error);
    throw error;
  }
}

// Search for similar contacts
export async function searchSimilarContacts(request: ContactSearchRequest): Promise<ContactSearchResult[]> {
  try {
    const searchResponse = await performSemanticSearch({
      query: request.query,
      searchType: 'contacts',
      similarityThreshold: request.similarityThreshold || 0.7,
      maxResults: request.maxResults || 10,
      userId: request.userId
    });

    return searchResponse.results.map(result => ({
      id: result.id,
      name: result.name || '',
      company: result.company,
      title: result.title,
      persona: result.persona,
      similarity: result.similarity
    }));

  } catch (error) {
    console.error('Error in searchSimilarContacts:', error);
    throw error;
  }
}

// Get contact recommendations based on similar contacts
export async function getContactRecommendations(
  contactId: string,
  userId: string,
  maxRecommendations: number = 5
): Promise<ContactRecommendations> {
  try {
    // Get the contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

    // Search for similar contacts based on persona
    const searchQuery = contact.persona || `${contact.title} at ${contact.company}`;
    const similarContacts = await searchSimilarContacts({
      query: searchQuery,
      similarityThreshold: 0.6,
      maxResults: maxRecommendations,
      userId
    });

    // Filter out the current contact
    const filteredSimilarContacts = similarContacts.filter(c => c.id !== contactId);

    // Generate insights
    const commonTitles = [...new Set(filteredSimilarContacts.map(c => c.title).filter(Boolean))];
    const commonCompanies = [...new Set(filteredSimilarContacts.map(c => c.company).filter(Boolean))];

    // Generate recommendations based on similar contacts
    const recommendations = [];
    
    if (filteredSimilarContacts.length > 0) {
      recommendations.push(`Found ${filteredSimilarContacts.length} similar contacts in your CRM`);
      
      if (commonTitles.length > 0) {
        recommendations.push(`Common titles among similar contacts: ${commonTitles.slice(0, 3).join(', ')}`);
      }
      
      if (commonCompanies.length > 0) {
        recommendations.push(`Similar contacts work at: ${commonCompanies.slice(0, 3).join(', ')}`);
      }
      
      recommendations.push('Consider reaching out to similar contacts for referrals or insights');
    } else {
      recommendations.push('No similar contacts found. This contact has a unique profile in your CRM');
    }

    return {
      similarContacts: filteredSimilarContacts,
      recommendations,
      insights: {
        commonTitles,
        commonCompanies,
        averageEngagement: filteredSimilarContacts.length > 0 ? 'Active' : 'Unknown'
      }
    };

  } catch (error) {
    console.error('Error in getContactRecommendations:', error);
    throw error;
  }
}

// Batch process contacts for embeddings
export async function batchProcessContactsForEmbeddings(
  userId: string,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  try {
    console.log('🚀 Starting batch processing of contacts for embeddings...');

    const personaResult = await batchGenerateEmbeddings('contacts', 'persona', userId, batchSize);
    const notesResult = await batchGenerateEmbeddings('contacts', 'notes', userId, batchSize);

    const totalProcessed = personaResult.processed + notesResult.processed;
    const totalErrors = personaResult.errors + notesResult.errors;

    console.log(`✅ Batch processing complete: ${totalProcessed} embeddings generated, ${totalErrors} errors`);

    return {
      processed: totalProcessed,
      errors: totalErrors
    };

  } catch (error) {
    console.error('Error in batchProcessContactsForEmbeddings:', error);
    throw error;
  }
}

// Get contact embedding statistics
export async function getContactEmbeddingStats(userId: string): Promise<{
  totalContacts: number;
  contactsWithPersonaEmbeddings: number;
  contactsWithNotesEmbeddings: number;
  embeddingCoverage: number;
}> {
  try {
    // Get total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get contacts with persona embeddings
    const { count: contactsWithPersonaEmbeddings } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('persona_vector', 'is', null);

    // Get contacts with notes embeddings
    const { count: contactsWithNotesEmbeddings } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('notes_vector', 'is', null);

    const embeddingCoverage = totalContacts > 0 
      ? Math.round(((contactsWithPersonaEmbeddings || 0) / totalContacts) * 100)
      : 0;

    return {
      totalContacts: totalContacts || 0,
      contactsWithPersonaEmbeddings: contactsWithPersonaEmbeddings || 0,
      contactsWithNotesEmbeddings: contactsWithNotesEmbeddings || 0,
      embeddingCoverage
    };

  } catch (error) {
    console.error('Error getting contact embedding stats:', error);
    return {
      totalContacts: 0,
      contactsWithPersonaEmbeddings: 0,
      contactsWithNotesEmbeddings: 0,
      embeddingCoverage: 0
    };
  }
} 