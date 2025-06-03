import { useCallback } from 'react';
import { leadEmbeddingService } from '@/lib/ai/leadEmbeddings';

/**
 * Hook for managing lead embeddings
 * Provides functions to update embeddings when leads or activities change
 */
export function useLeadEmbeddings() {
  /**
   * Update embeddings for a lead
   */
  const updateLeadEmbedding = useCallback(async (leadId: string) => {
    console.log(`[Hook] updateLeadEmbedding called for lead ${leadId}`);
    try {
      const result = await leadEmbeddingService.updateLeadEmbedding(leadId);
      console.log(`[Hook] updateLeadEmbedding completed successfully for lead ${leadId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in updateLeadEmbedding hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle lead creation by generating initial embeddings
   */
  const handleLeadCreated = useCallback(async (leadId: string) => {
    console.log(`[Hook] handleLeadCreated called for new lead ${leadId}`);
    try {
      const result = await leadEmbeddingService.handleLeadCreated(leadId);
      console.log(`[Hook] Initial embeddings generated for new lead ${leadId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleLeadCreated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle lead updates by regenerating embeddings
   */
  const handleLeadUpdated = useCallback(async (leadId: string) => {
    console.log(`[Hook] handleLeadUpdated called for lead ${leadId}`);
    try {
      const result = await leadEmbeddingService.handleLeadUpdated(leadId);
      console.log(`[Hook] Embeddings updated for modified lead ${leadId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleLeadUpdated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle activity changes by updating the related lead's embeddings
   */
  const handleActivityChanged = useCallback(async (activityId: string) => {
    console.log(`[Hook] handleActivityChanged called for activity ${activityId}`);
    try {
      const result = await leadEmbeddingService.handleActivityChanged(activityId);
      console.log(`[Hook] Processed activity change ${activityId}, updated related lead embeddings`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleActivityChanged hook:', error);
      throw error;
    }
  }, []);

  return {
    updateLeadEmbedding,
    handleLeadCreated,
    handleLeadUpdated,
    handleActivityChanged
  };
} 