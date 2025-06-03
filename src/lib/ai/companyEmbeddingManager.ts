import { supabase } from '@/integrations/supabase/client';
import { generateAndStoreEmbedding, performSemanticSearch, batchGenerateEmbeddings, deleteEmbeddings } from './embeddingService';

// Types for company embedding operations
export interface CompanyEmbeddingData {
  id?: string;
  name: string;
  industry?: string;
  description?: string;
  notes?: string;
  website?: string;
  user_id: string;
}

export interface CompanySearchRequest {
  query: string;
  similarityThreshold?: number;
  maxResults?: number;
  userId: string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  website?: string;
  similarity: number;
}

export interface CompanyRecommendations {
  similarCompanies: CompanySearchResult[];
  recommendations: string[];
  insights: {
    commonIndustries: string[];
    marketOpportunities: string[];
    competitorAnalysis: string;
  };
}

// Create a new company with embeddings
export async function createCompanyWithEmbeddings(companyData: Omit<CompanyEmbeddingData, 'id'>): Promise<string> {
  try {
    // Insert the company first
    const { data: newCompany, error: insertError } = await supabase
      .from('companies')
      .insert({
        name: companyData.name,
        industry: companyData.industry || '',
        description: companyData.description || '',
        notes: companyData.notes || '',
        website: companyData.website || '',
        user_id: companyData.user_id,
        size: '', // Default empty
        location: '', // Default empty
        status: 'active'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating company:', insertError);
      throw insertError;
    }

    const companyId = newCompany.id;

    // Generate embeddings for relevant fields
    const embeddingPromises = [];

    if (companyData.description && companyData.description.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('companies', companyId, 'description', companyData.description, companyData.user_id)
      );
    }

    if (companyData.notes && companyData.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('companies', companyId, 'notes', companyData.notes, companyData.user_id)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Company created with embeddings: ${companyId}`);
    return companyId;

  } catch (error) {
    console.error('Error in createCompanyWithEmbeddings:', error);
    throw error;
  }
}

// Update company with embeddings
export async function updateCompanyWithEmbeddings(
  companyId: string,
  updates: Partial<CompanyEmbeddingData>,
  userId: string
): Promise<void> {
  try {
    // Update the company record
    const { error: updateError } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating company:', updateError);
      throw updateError;
    }

    // Generate embeddings for updated fields
    const embeddingPromises = [];

    if (updates.description !== undefined && updates.description.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('companies', companyId, 'description', updates.description, userId)
      );
    }

    if (updates.notes !== undefined && updates.notes.trim()) {
      embeddingPromises.push(
        generateAndStoreEmbedding('companies', companyId, 'notes', updates.notes, userId)
      );
    }

    // Wait for all embeddings to be generated
    await Promise.allSettled(embeddingPromises);

    console.log(`✅ Company updated with embeddings: ${companyId}`);

  } catch (error) {
    console.error('Error in updateCompanyWithEmbeddings:', error);
    throw error;
  }
}

// Delete company with embeddings
export async function deleteCompanyWithEmbeddings(companyId: string, userId: string): Promise<void> {
  try {
    // Delete embeddings first
    await deleteEmbeddings('companies', companyId, userId);

    // Delete the company
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting company:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Company and embeddings deleted: ${companyId}`);

  } catch (error) {
    console.error('Error in deleteCompanyWithEmbeddings:', error);
    throw error;
  }
}

// Search for similar companies
export async function searchSimilarCompanies(request: CompanySearchRequest): Promise<CompanySearchResult[]> {
  try {
    const searchResponse = await performSemanticSearch({
      query: request.query,
      searchType: 'companies',
      similarityThreshold: request.similarityThreshold || 0.7,
      maxResults: request.maxResults || 10,
      userId: request.userId
    });

    return searchResponse.results.map(result => ({
      id: result.id,
      name: result.name || '',
      industry: result.industry,
      description: result.description,
      website: result.website,
      similarity: result.similarity
    }));

  } catch (error) {
    console.error('Error in searchSimilarCompanies:', error);
    throw error;
  }
}

// Get company recommendations based on similar companies
export async function getCompanyRecommendations(
  companyId: string,
  userId: string,
  maxRecommendations: number = 5
): Promise<CompanyRecommendations> {
  try {
    // Get the company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('user_id', userId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Search for similar companies based on description
    const searchQuery = company.description || `${company.industry} company ${company.name}`;
    const similarCompanies = await searchSimilarCompanies({
      query: searchQuery,
      similarityThreshold: 0.6,
      maxResults: maxRecommendations,
      userId
    });

    // Filter out the current company
    const filteredSimilarCompanies = similarCompanies.filter(c => c.id !== companyId);

    // Generate insights
    const commonIndustries = [...new Set(filteredSimilarCompanies.map(c => c.industry).filter(Boolean))];
    
    // Generate recommendations based on similar companies
    const recommendations = [];
    
    if (filteredSimilarCompanies.length > 0) {
      recommendations.push(`Found ${filteredSimilarCompanies.length} similar companies in your CRM`);
      
      if (commonIndustries.length > 0) {
        recommendations.push(`Common industries: ${commonIndustries.slice(0, 3).join(', ')}`);
      }
      
      recommendations.push('Consider cross-selling opportunities with similar companies');
      recommendations.push('Analyze successful strategies used with similar companies');
    } else {
      recommendations.push('No similar companies found. This company has a unique profile in your CRM');
      recommendations.push('Consider this as a new market opportunity');
    }

    // Market opportunities based on similar companies
    const marketOpportunities = [];
    if (commonIndustries.length > 0) {
      marketOpportunities.push(`Expand in ${commonIndustries[0]} industry`);
      marketOpportunities.push('Develop industry-specific solutions');
    }
    marketOpportunities.push('Identify partnership opportunities');

    return {
      similarCompanies: filteredSimilarCompanies,
      recommendations,
      insights: {
        commonIndustries,
        marketOpportunities,
        competitorAnalysis: filteredSimilarCompanies.length > 0 
          ? `${filteredSimilarCompanies.length} similar companies identified for competitive analysis`
          : 'No direct competitors found in CRM'
      }
    };

  } catch (error) {
    console.error('Error in getCompanyRecommendations:', error);
    throw error;
  }
}

// Batch process companies for embeddings
export async function batchProcessCompaniesForEmbeddings(
  userId: string,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  try {
    console.log('🚀 Starting batch processing of companies for embeddings...');

    const descriptionResult = await batchGenerateEmbeddings('companies', 'description', userId, batchSize);
    const notesResult = await batchGenerateEmbeddings('companies', 'notes', userId, batchSize);

    const totalProcessed = descriptionResult.processed + notesResult.processed;
    const totalErrors = descriptionResult.errors + notesResult.errors;

    console.log(`✅ Batch processing complete: ${totalProcessed} embeddings generated, ${totalErrors} errors`);

    return {
      processed: totalProcessed,
      errors: totalErrors
    };

  } catch (error) {
    console.error('Error in batchProcessCompaniesForEmbeddings:', error);
    throw error;
  }
}

// Get company embedding statistics
export async function getCompanyEmbeddingStats(userId: string): Promise<{
  totalCompanies: number;
  companiesWithDescriptionEmbeddings: number;
  companiesWithNotesEmbeddings: number;
  embeddingCoverage: number;
}> {
  try {
    // Get total companies
    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get companies with description embeddings
    const { count: companiesWithDescriptionEmbeddings } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('description_vector', 'is', null);

    // Get companies with notes embeddings
    const { count: companiesWithNotesEmbeddings } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('notes_vector', 'is', null);

    const embeddingCoverage = totalCompanies > 0 
      ? Math.round(((companiesWithDescriptionEmbeddings || 0) / totalCompanies) * 100)
      : 0;

    return {
      totalCompanies: totalCompanies || 0,
      companiesWithDescriptionEmbeddings: companiesWithDescriptionEmbeddings || 0,
      companiesWithNotesEmbeddings: companiesWithNotesEmbeddings || 0,
      embeddingCoverage
    };

  } catch (error) {
    console.error('Error getting company embedding stats:', error);
    return {
      totalCompanies: 0,
      companiesWithDescriptionEmbeddings: 0,
      companiesWithNotesEmbeddings: 0,
      embeddingCoverage: 0
    };
  }
} 