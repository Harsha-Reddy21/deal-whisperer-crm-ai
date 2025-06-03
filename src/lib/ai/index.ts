// AI Services - Main Export File

// Export types
export type {
  ObjectionSuggestion,
  DealCoachRecommendation,
  CustomerPersona,
  WinLossAnalysis,
  OpenAIConfig,
  OpenAIMessage,
  OpenAIResponse
} from './types';

// Export product persona matcher types
export type {
  ProductPersonaMatch,
  ProductPersonaResponse
} from './productPersonaMatcher';

// Export email generator types
export type {
  EmailGenerationRequest,
  EmailGenerationResponse
} from './emailGenerator';

// Export email summarization types
export type {
  EmailSummaryRequest,
  EmailSummaryResponse 
} from './emailSummarizer';

// Export company research types
export type {
  CompanyInfo,
  CompanyResearchRequest,
  CompanyGenerationRequest,
  CompanyResearchResponse,
  CompanyGenerationResponse
} from './companyResearcher';

// Export Tavily search types
export type {
  TavilySearchRequest,
  TavilySearchResult,
  TavilySearchResponse
} from './tavilySearch';

// Export transcription service types
export type {
  TranscriptionRequest,
  TranscriptionResponse,
  SummarizationRequest,
  SummarizationResponse
} from './transcriptionService';

// Export deal similarity analyzer types
export type {
  DealSimilarityRequest,
  DealSimilarityResponse,
  SimilarDeal,
  DealRecommendation
} from './dealSimilarityAnalyzer';

// Export CRM data analysis types
export type {
  CRMDataContext 
} from './crmDataAnalyzer';

// Export configuration utilities
export {
  getOpenAIConfig,
  isOpenAIConfigured,
  makeOpenAIRequest,
  parseOpenAIJsonResponse
} from './config';

// Export Tavily search utilities
export {
  getTavilyConfig,
  isTavilyConfigured,
  searchWithTavily,
  searchCompanyInfo,
  searchCompaniesList
} from './tavilySearch';

// Export transcription utilities
export {
  transcribeAudio,
  summarizeTranscript,
  extractAudioFromVideo,
  validateTranscriptionFile,
  getEstimatedTranscriptionTime
} from './transcriptionService';

// Export deal similarity analyzer
export {
  analyzeDealSimilarity,
  getQuickSimilarDeals
} from './dealSimilarityAnalyzer';

// Export AI services
export { generateObjectionSuggestions } from './objectionHandler';
export { generateDealCoachRecommendations } from './dealCoach';
export { generateCustomerPersona, generateLeadPersona } from './personaBuilder';
export { generateWinLossAnalysis } from './winLossAnalyzer';
export { generateAIAssistantResponse } from './assistant';
export { findPeopleForProduct } from './productPersonaMatcher';
export { generateEmailContent } from './emailGenerator';

// Email summarization
export { summarizeEmails, summarizeSingleEmail } from './emailSummarizer';

// Company research
export { researchCompanyInfo, generateCompanies } from './companyResearcher';

// CRM data analysis
export { fetchCRMData, formatCRMDataForAI, analyzeDataTrends } from './crmDataAnalyzer';

// Smart Lead Analyzer
export * from './smartLeadAnalyzer';

// LinkedIn Contact Enricher
export * from './linkedinEnricher';

// AI Services and Utilities
export * from './config';
export * from './types';
export * from './emailSummarizer';
export * from './companyResearcher';
export * from './tavilySearch';
export * from './transcriptionService';
export * from './dealSimilarityAnalyzer';

// Vector Embeddings and Semantic Search
export * from './embeddingService';
export * from './dealEmbeddingManager';

// Lead embeddings service
export { leadEmbeddingService, LeadEmbeddingService } from './leadEmbeddings'; 