import { useCallback } from 'react';
import { contactEmbeddingService } from '@/lib/ai/contactEmbeddings';

/**
 * Hook for managing contact embeddings
 * Provides functions to update embeddings when contacts or activities change
 */
export function useContactEmbeddings() {
  /**
   * Update embeddings for a contact
   */
  const updateContactEmbedding = useCallback(async (contactId: string) => {
    console.log(`[Hook] updateContactEmbedding called for contact ${contactId}`);
    try {
      const result = await contactEmbeddingService.updateContactEmbedding(contactId);
      console.log(`[Hook] updateContactEmbedding completed successfully for contact ${contactId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in updateContactEmbedding hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle contact creation by generating initial embeddings
   */
  const handleContactCreated = useCallback(async (contactId: string) => {
    console.log(`[Hook] handleContactCreated called for new contact ${contactId}`);
    try {
      const result = await contactEmbeddingService.handleContactCreated(contactId);
      console.log(`[Hook] Initial embeddings generated for new contact ${contactId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleContactCreated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle contact updates by regenerating embeddings
   */
  const handleContactUpdated = useCallback(async (contactId: string) => {
    console.log(`[Hook] handleContactUpdated called for contact ${contactId}`);
    try {
      const result = await contactEmbeddingService.handleContactUpdated(contactId);
      console.log(`[Hook] Embeddings updated for modified contact ${contactId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleContactUpdated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle activity changes by updating the related contact's embeddings
   */
  const handleActivityChanged = useCallback(async (activityId: string) => {
    console.log(`[Hook] handleActivityChanged called for activity ${activityId}`);
    try {
      const result = await contactEmbeddingService.handleActivityChanged(activityId);
      console.log(`[Hook] Processed activity change ${activityId}, updated related contact embeddings`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleActivityChanged hook:', error);
      throw error;
    }
  }, []);

  return {
    updateContactEmbedding,
    handleContactCreated,
    handleContactUpdated,
    handleActivityChanged
  };
} 