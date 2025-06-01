# AI Services - Modular Architecture

This directory contains the modular AI services for the CRM application, organized by functionality for better maintainability and code organization.

## Directory Structure

```
src/lib/ai/
├── README.md                    # This documentation file
├── index.ts                     # Main export file - use this for imports
├── types.ts                     # TypeScript interfaces and types
├── config.ts                    # OpenAI configuration and utilities
├── objectionHandler.ts          # Objection handling AI service
├── dealCoach.ts                # Deal coaching AI service
├── personaBuilder.ts           # Customer persona generation service
├── winLossAnalyzer.ts          # Win/loss analysis service
├── productPersonaMatcher.ts    # Product-based persona matching service
├── emailGenerator.ts           # Email content generation service
└── assistant.ts                # General AI assistant service
```

## Modules Overview

### 🔧 Core Infrastructure

#### `types.ts`
- Defines all TypeScript interfaces used across AI services
- Includes: `ObjectionSuggestion`, `DealCoachRecommendation`, `CustomerPersona`, `WinLossAnalysis`
- OpenAI API types: `OpenAIConfig`, `OpenAIMessage`, `OpenAIResponse`

#### `config.ts`
- OpenAI API configuration management
- Utility functions for API requests and response parsing
- Functions: `getOpenAIConfig()`, `isOpenAIConfigured()`, `makeOpenAIRequest()`, `parseOpenAIJsonResponse()`

#### `index.ts`
- Main export file for all AI services
- Single entry point for importing AI functionality
- Re-exports all types and functions

### 🤖 AI Services

#### `objectionHandler.ts`
- **Purpose**: Generate AI-powered objection handling suggestions
- **Function**: `generateObjectionSuggestions(objection: string)`
- **Returns**: Array of `ObjectionSuggestion` with approach, text, effectiveness, and reasoning

#### `dealCoach.ts`
- **Purpose**: Provide AI-powered deal coaching recommendations
- **Function**: `generateDealCoachRecommendations(deal: any, context?: any)`
- **Returns**: Array of `DealCoachRecommendation` with priority, actions, and impact analysis

#### `personaBuilder.ts`
- **Purpose**: Generate customer personas from contact/lead data
- **Functions**: 
  - `generateCustomerPersona(contact: any)` - For existing contacts
  - `generateLeadPersona(lead: any)` - For leads with interaction data
- **Returns**: `CustomerPersona` with behavioral insights and recommendations

#### `winLossAnalyzer.ts`
- **Purpose**: Analyze deal patterns to identify win/loss factors
- **Function**: `generateWinLossAnalysis(deals: any[])`
- **Returns**: `WinLossAnalysis` with factors, lessons, and recommendations

#### `productPersonaMatcher.ts` ⭐ **ENHANCED**
- **Purpose**: Find people (leads and contacts) related to specific products using AI analysis
- **Function**: `findPeopleForProduct(product: string, leads: any[], contacts: any[])`
- **Returns**: `ProductPersonaResponse` with matched people, relevance scores, and reasoning
- **Features**: 
  - Analyzes job titles, company industries, and personas
  - Provides relevance scoring (0-100)
  - Explains match reasoning and factors
  - Supports both leads and contacts

#### `emailGenerator.ts` ⭐ **NEW**
- **Purpose**: Generate professional email content based on subject line and context
- **Function**: `generateEmailContent(request: EmailGenerationRequest)`
- **Returns**: `EmailGenerationResponse` with generated content and suggestions
- **Features**:
  - Subject-based content generation
  - Context-aware messaging (recipient name, company, deal context)
  - Multiple tone options (professional, friendly, formal, casual)
  - Clean formatting with proper email structure
  - Actionable suggestions for improvement

#### `assistant.ts`
- **Purpose**: General AI assistant for sales queries
- **Function**: `generateAIAssistantResponse(prompt: string)`
- **Returns**: String response with sales advice and insights

## Usage Examples

### Basic Import (Recommended)
```typescript
import { 
  generateObjectionSuggestions,
  generateDealCoachRecommendations,
  generateCustomerPersona,
  findPeopleForProduct,
  generateEmailContent,
  isOpenAIConfigured
} from '@/lib/ai';
```

### Individual Module Import
```typescript
import { generateObjectionSuggestions } from '@/lib/ai/objectionHandler';
import { generateDealCoachRecommendations } from '@/lib/ai/dealCoach';
import { findPeopleForProduct } from '@/lib/ai/productPersonaMatcher';
import { generateEmailContent } from '@/lib/ai/emailGenerator';
```

### Type Imports
```typescript
import type { 
  ObjectionSuggestion, 
  DealCoachRecommendation,
  CustomerPersona,
  ProductPersonaMatch,
  ProductPersonaResponse,
  EmailGenerationRequest,
  EmailGenerationResponse
} from '@/lib/ai';
```

## Implementation Examples

### Objection Handling
```typescript
const suggestions = await generateObjectionSuggestions(
  "Your solution is too expensive for our budget"
);

suggestions.forEach(suggestion => {
  console.log(`${suggestion.approach}: ${suggestion.text}`);
  console.log(`Effectiveness: ${suggestion.effectiveness}%`);
});
```

### Deal Coaching
```typescript
const recommendations = await generateDealCoachRecommendations(deal, {
  activities: recentActivities,
  emails: emailHistory,
  dealAge: 30,
  lastActivityDays: 5
});

recommendations.forEach(rec => {
  console.log(`${rec.type.toUpperCase()}: ${rec.title}`);
  console.log(`Action: ${rec.action}`);
  console.log(`Expected Impact: ${rec.impact}`);
});
```

### Persona Generation
```typescript
const persona = await generateCustomerPersona(contact);
console.log(`Persona: ${persona.name}`);
console.log(`Communication Style: ${persona.communication_style}`);
console.log(`Pain Points: ${persona.pain_points.join(', ')}`);
```

### Product Persona Matching ⭐ **ENHANCED**
```typescript
const response = await findPeopleForProduct(
  "CRM software", 
  leads, 
  contacts
);

console.log(`Found ${response.matches.length} relevant people`);

response.matches.forEach(match => {
  console.log(`${match.person.name} (${match.relevanceScore}%)`);
  console.log(`Company: ${match.person.company}`);
  console.log(`Reasoning: ${match.reasoning}`);
  console.log(`Match Factors: ${match.matchFactors.join(', ')}`);
});
```

### Email Content Generation ⭐ **NEW**
```typescript
const emailRequest: EmailGenerationRequest = {
  subject: "Follow-up on our CRM discussion",
  recipientName: "John Smith",
  recipientCompany: "Tech Corp",
  context: "Deal-related communication",
  tone: "professional",
  senderName: "Alice Johnson",
  senderPosition: "Sales Manager",
  senderCompany: "Your Company",
  senderEmail: "alice@yourcompany.com",
  senderPhone: "+1-555-0123"
};

const response = await generateEmailContent(emailRequest);
console.log("Generated email content:");
console.log(response.content);
console.log("Suggestions:", response.suggestions);
```

## Configuration

### Environment Variables
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### Check Configuration
```typescript
import { isOpenAIConfigured } from '@/lib/ai';

if (!isOpenAIConfigured()) {
  console.error('OpenAI API key not configured');
}
```

## Error Handling

All AI services include comprehensive error handling:

```typescript
try {
  const suggestions = await generateObjectionSuggestions(objection);
  // Handle success
} catch (error) {
  if (error.message.includes('API key not found')) {
    // Handle configuration error
  } else if (error.message.includes('OpenAI API error')) {
    // Handle API error
  } else {
    // Handle other errors
  }
}
```

## New Features in Email Generator

### 📧 **Smart Email Generation**
- Analyzes subject line to understand email purpose
- Generates contextually appropriate content
- Includes proper greeting and professional closing
- Maintains consistent tone throughout
- **Uses actual recipient names instead of placeholders**
- **Includes personalized sender signature with real details**

### 🎯 **Context-Aware Content**
- Uses recipient name and company for personalized greetings
- Adapts content based on deal context
- Considers relationship type (lead vs. contact)
- Incorporates business context for relevance
- **Automatically fetches user profile information**
- **Combines first and last names for professional signatures**

### 🎨 **Tone Customization**
- Professional: Standard business communication
- Friendly: Warm but professional approach
- Formal: Traditional corporate style
- Casual: Relaxed, conversational tone

### ✨ **Enhanced User Experience**
- Copy to message field with one click
- Copy and edit functionality for customization
- Preview generated content before using
- Helpful suggestions for improvement
- **No more placeholder text in generated emails**
- **Real names and details automatically included**

## Enhanced EmailComposer Integration

### 🔄 **Workflow Improvements**
- **Removed Template Feature**: Simplified interface by removing template selection
- **AI-Powered Generation**: Generate content based on subject line with AI
- **Copy & Edit Options**: Users can copy generated content directly or copy and edit
- **Smart Email Population**: "To" field automatically populated with correct email address
- **Context-Aware Generation**: Uses contact details for better personalization

### 🎯 **User Experience Enhancements**
- **One-Click Generation**: Generate email content with single button click
- **Preview & Review**: See generated content before copying to message
- **Flexible Editing**: Choose to copy directly or copy and edit
- **Visual Feedback**: Clear indicators for AI generation status
- **Error Handling**: Graceful handling of generation failures

## Benefits of Modular Architecture

### 🔧 **Maintainability**
- Each service has a single responsibility
- Easy to locate and modify specific functionality
- Clear separation of concerns

### 📦 **Reusability**
- Services can be imported individually
- Shared utilities in `config.ts`
- Consistent error handling patterns

### 🧪 **Testability**
- Each module can be tested independently
- Mock individual services for unit tests
- Clear interfaces for testing

### 📈 **Scalability**
- Easy to add new AI services
- Consistent patterns for new functionality
- Centralized configuration management

### 🔄 **Backward Compatibility**
- Original `openai.ts` file maintained for existing imports
- Gradual migration path for existing code
- No breaking changes to existing functionality

## Migration Guide

### From Legacy `openai.ts`
The original `openai.ts` file now re-exports from the modular services, so existing imports continue to work:

```typescript
// This still works (legacy import)
import { generateObjectionSuggestions } from '@/lib/openai';

// Recommended new import
import { generateObjectionSuggestions } from '@/lib/ai';
```

### Best Practices
1. Use the main `@/lib/ai` import for new code
2. Import only what you need to reduce bundle size
3. Use TypeScript types for better development experience
4. Handle errors appropriately for better user experience

## Future Enhancements

Potential additions to the AI services:
- Advanced email template generation with A/B testing
- Email response analysis and optimization
- Lead scoring AI service
- Competitive analysis service
- Sales forecasting service
- Meeting summary generation service
- Advanced product recommendation engine
- Customer journey mapping service
- Email performance analytics and insights 