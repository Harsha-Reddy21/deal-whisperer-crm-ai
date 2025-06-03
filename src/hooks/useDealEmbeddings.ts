import { useCallback } from 'react';
import { dealEmbeddingService } from '@/lib/ai/dealEmbeddings';

/**
 * Hook for managing deal embeddings
 * Provides functions to update embeddings when deals or activities change
 */
export function useDealEmbeddings() {
  /**
   * Update embeddings for a deal
   */
  const updateDealEmbedding = useCallback(async (dealId: string) => {
    console.log(`[Hook] updateDealEmbedding called for deal ${dealId}`);
    try {
      const result = await dealEmbeddingService.updateDealEmbedding(dealId);
      console.log(`[Hook] updateDealEmbedding completed successfully for deal ${dealId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in updateDealEmbedding hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle deal creation by generating initial embeddings
   */
  const handleDealCreated = useCallback(async (dealId: string) => {
    console.log(`[Hook] handleDealCreated called for new deal ${dealId}`);
    try {
      const result = await dealEmbeddingService.handleDealCreated(dealId);
      console.log(`[Hook] Initial embeddings generated for new deal ${dealId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleDealCreated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle deal updates by regenerating embeddings
   */
  const handleDealUpdated = useCallback(async (dealId: string) => {
    console.log(`[Hook] handleDealUpdated called for deal ${dealId}`);
    try {
      const result = await dealEmbeddingService.handleDealUpdated(dealId);
      console.log(`[Hook] Embeddings updated for modified deal ${dealId}`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleDealUpdated hook:', error);
      throw error;
    }
  }, []);

  /**
   * Handle activity changes by updating the related deal's embeddings
   */
  const handleActivityChanged = useCallback(async (activityId: string) => {
    console.log(`[Hook] handleActivityChanged called for activity ${activityId}`);
    try {
      const result = await dealEmbeddingService.handleActivityChanged(activityId);
      console.log(`[Hook] Processed activity change ${activityId}, updated related deal embeddings`);
      return result;
    } catch (error) {
      console.error('[Hook] Error in handleActivityChanged hook:', error);
      throw error;
    }
  }, []);

  return {
    updateDealEmbedding,
    handleDealCreated,
    handleDealUpdated,
    handleActivityChanged
  };
} 