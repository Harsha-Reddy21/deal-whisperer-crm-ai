// Legacy OpenAI file - Re-exports from modular AI services
// This file maintains backward compatibility while using the new modular structure

export type {
  ObjectionSuggestion,
  DealCoachRecommendation,
  CustomerPersona,
  WinLossAnalysis,
  ProductPersonaMatch,
  ProductPersonaResponse,
  EmailGenerationRequest,
  EmailGenerationResponse
} from './ai';

export {
  generateObjectionSuggestions,
  generateDealCoachRecommendations,
  generateCustomerPersona,
  generateLeadPersona,
  generateWinLossAnalysis,
  generateAIAssistantResponse,
  isOpenAIConfigured,
  findPeopleForProduct,
  generateEmailContent
} from './ai';
