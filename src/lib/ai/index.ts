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

// Export AI services
export { generateObjectionSuggestions } from './objectionHandler';
export { generateDealCoachRecommendations } from './dealCoach';
export { generateCustomerPersona, generateLeadPersona } from './personaBuilder';
export { generateWinLossAnalysis } from './winLossAnalyzer';
export { generateAIAssistantResponse } from './assistant';
export { findPeopleForProduct } from './productPersonaMatcher';
export { generateEmailContent } from './emailGenerator';

// Email Summarization
export { 
  summarizeEmails, 
  summarizeSingleEmail,
  type EmailSummaryRequest,
  type EmailSummaryResponse 
} from './emailSummarizer';

// Company Research
export {
  researchCompanyInfo,
  generateCompanies
} from './companyResearcher'; 