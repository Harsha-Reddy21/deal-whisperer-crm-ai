import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export interface EmbeddingJob {
  id: string;
  record_type: 'deal' | 'contact' | 'lead';
  record_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SimilarRecord {
  record_type: string;
  record_id: string;
  content: string;
  similarity: number;
}

export class EmbeddingService {
  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Get content for a specific record type and ID
   */
  async getRecordContent(recordType: string, recordId: string): Promise<string | null> {
    try {
      let functionName: string;
      
      switch (recordType) {
        case 'deal':
          functionName = 'get_deal_embedding_content';
          break;
        case 'contact':
          functionName = 'get_contact_embedding_content';
          break;
        case 'lead':
          functionName = 'get_lead_embedding_content';
          break;
        default:
          throw new Error(`Unknown record type: ${recordType}`);
      }

      const { data, error } = await supabase.rpc(functionName, {
        [`${recordType}_id`]: recordId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error getting ${recordType} content:`, error);
      throw error;
    }
  }

  /**
   * Update embedding for a specific record
   */
  async updateRecordEmbedding(recordType: string, recordId: string): Promise<void> {
    try {
      // Get the content for embedding
      const content = await this.getRecordContent(recordType, recordId);
      
      if (!content) {
        throw new Error(`No content found for ${recordType} ${recordId}`);
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Update the record with embedding
      const tableName = recordType === 'deal' ? 'deals' : 
                       recordType === 'contact' ? 'contacts' : 'leads';

      const { error } = await supabase
        .from(tableName)
        .update({
          embedding: `[${embedding.join(',')}]`,
          embedding_content: content,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        throw error;
      }

      console.log(`Updated embedding for ${recordType} ${recordId}`);
    } catch (error) {
      console.error(`Error updating embedding for ${recordType} ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Process pending embedding jobs
   */
  async processPendingJobs(limit: number = 10): Promise<void> {
    try {
      // Get pending jobs
      const { data: jobs, error: fetchError } = await supabase
        .from('embedding_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      if (!jobs || jobs.length === 0) {
        console.log('No pending embedding jobs');
        return;
      }

      console.log(`Processing ${jobs.length} embedding jobs`);

      // Process each job
      for (const job of jobs) {
        try {
          // Mark job as processing
          await supabase
            .from('embedding_jobs')
            .update({ 
              status: 'processing',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Process the embedding
          await this.updateRecordEmbedding(job.record_type, job.record_id);

          // Mark job as completed
          await supabase
            .from('embedding_jobs')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          console.log(`Completed embedding job ${job.id}`);

        } catch (error) {
          console.error(`Failed to process embedding job ${job.id}:`, error);
          
          // Mark job as failed
          await supabase
            .from('embedding_jobs')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }
      }
    } catch (error) {
      console.error('Error processing embedding jobs:', error);
      throw error;
    }
  }

  /**
   * Search for similar records using embeddings
   */
  async searchSimilarRecords(
    query: string,
    recordTypes: string[] = ['deal', 'contact', 'lead'],
    similarityThreshold: number = 0.7,
    maxResults: number = 10
  ): Promise<SimilarRecord[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search for similar records
      const { data, error } = await supabase.rpc('search_similar_records', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        record_types: recordTypes,
        similarity_threshold: similarityThreshold,
        max_results: maxResults
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error searching similar records:', error);
      throw error;
    }
  }

  /**
   * Queue embedding job for a record
   */
  async queueEmbeddingJob(recordType: string, recordId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('queue_embedding_job', {
        p_record_type: recordType,
        p_record_id: recordId
      });

      if (error) {
        throw error;
      }

      console.log(`Queued embedding job for ${recordType} ${recordId}`);
    } catch (error) {
      console.error(`Error queuing embedding job:`, error);
      throw error;
    }
  }

  /**
   * Get embedding job status
   */
  async getEmbeddingJobs(status?: string): Promise<EmbeddingJob[]> {
    try {
      let query = supabase
        .from('embedding_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting embedding jobs:', error);
      throw error;
    }
  }

  /**
   * Bulk process all existing records (for initial setup)
   */
  async processAllRecords(): Promise<void> {
    try {
      console.log('Starting bulk embedding process...');

      // Queue jobs for all deals
      const { data: deals } = await supabase
        .from('deals')
        .select('id');

      if (deals) {
        for (const deal of deals) {
          await this.queueEmbeddingJob('deal', deal.id);
        }
        console.log(`Queued ${deals.length} deal embedding jobs`);
      }

      // Queue jobs for all contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id');

      if (contacts) {
        for (const contact of contacts) {
          await this.queueEmbeddingJob('contact', contact.id);
        }
        console.log(`Queued ${contacts.length} contact embedding jobs`);
      }

      // Queue jobs for all leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id');

      if (leads) {
        for (const lead of leads) {
          await this.queueEmbeddingJob('lead', lead.id);
        }
        console.log(`Queued ${leads.length} lead embedding jobs`);
      }

      console.log('Bulk embedding process queued. Run processPendingJobs() to execute.');
    } catch (error) {
      console.error('Error in bulk embedding process:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService(); 