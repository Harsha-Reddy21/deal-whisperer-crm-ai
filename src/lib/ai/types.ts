// AI Service Types and Interfaces

export interface ObjectionSuggestion {
  approach: string;
  text: string;
  effectiveness: number;
  reasoning: string;
}

export interface DealCoachRecommendation {
  type: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  reasoning: string;
}

export interface CustomerPersona {
  name: string;
  role: string;
  company_size: string;
  industry: string;
  pain_points: string[];
  communication_style: string;
  decision_making_style: string;
  preferred_channels: string[];
  buying_motivations: string[];
  objections_likely: string[];
  recommended_approach: string;
}

export interface WinLossAnalysis {
  outcome: 'won' | 'lost';
  primary_factors: string[];
  contributing_factors: string[];
  lessons_learned: string[];
  recommendations: string[];
  confidence_score: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
} 