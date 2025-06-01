# Deal Whisperer CRM - AI-Powered Sales Management System

A comprehensive Customer Relationship Management (CRM) system powered by advanced AI features including semantic search, deal similarity analysis, email summarization, and intelligent recommendations.

Live Delpoyed Link : https://ai-powered-crm.netlify.app/



## 🤖 AI Features Overview

### 1. **Semantic Search & Vector Similarity**
- **Hybrid Search Engine**: Combines vector similarity search with traditional SQL queries
- **OpenAI Embeddings**: Uses text-embedding-3-small for 1536-dimension vectors
- **Cross-Entity Search**: Find similar deals, contacts, activities, and companies
- **No Threshold Filtering**: Always returns top relevant results

### 2. **Intelligent Deal Analysis**
- **LLM-Powered Similarity**: GPT-4 analyzes deals for intelligent recommendations
- **Pattern Recognition**: Identifies success factors and risk patterns from historical data
- **Actionable Insights**: Provides specific next steps based on similar deal outcomes
- **Confidence Scoring**: AI-generated confidence levels for each recommendation
- **Historical Context**: Leverages past wins/losses for strategic guidance

### 3. **Email Intelligence**
- **Smart Summarization**: AI-powered email summaries with key insights
- **Action Item Extraction**: Automatically identifies tasks and follow-ups
- **Priority Detection**: Highlights urgent emails and important communications
- **Sentiment Analysis**: Understands email tone and context
- **Bulk Processing**: Summarize multiple emails or entire conversations


### 4. **Company Research & Generation**
- **Web-Powered Research**: Real-time company information using Tavily API
- **AI Company Generation**: Generate targeted company lists based on criteria
- **Confidence Scoring**: Reliability indicators for AI-generated data
- **Source Attribution**: Track information sources for verification
- **Automatic Integration**: Seamlessly add researched companies to CRM

### 5. **Audio/Video Transcription**
- **Speech-to-Text**: Convert meeting recordings to searchable text
- **Content Summarization**: AI-generated summaries of transcribed content
- **Key Point Extraction**: Identify important topics and decisions
- **Action Item Detection**: Automatically extract follow-up tasks
- **Sentiment Analysis**: Understand meeting tone and participant engagement

### 6. **Predictive Analytics**
- **Deal Scoring**: AI-powered probability assessments
- **Lead Qualification**: Intelligent lead scoring and prioritization
- **Customer Personas**: AI-generated buyer personas from interaction data
- **Success Prediction**: Forecast deal outcomes based on historical patterns
- **Risk Assessment**: Early warning system for at-risk opportunities



## ✨ Features We've Added

### 🎯 **Deal Management Features**
- **"Similar" Button**: Gets the top related deals using LLM analysis with actionable recommendations
- **AI Deal Analysis**: GPT-4 powered similarity analysis with confidence scoring and success patterns
- **Deal Pipeline**: Visual pipeline with drag-and-drop functionality and AI insights
- **Deal Recommendations**: Intelligent suggestions based on historical deal outcomes

### 🔍 **Search & Discovery Features**
- **"AI Search" Button**: Semantic search across all CRM data (deals, contacts, activities, companies,etc)
- **Vector Similarity Search**: No threshold filtering - always returns top relevant results
- **Cross-Entity Search**: Find related content across different data types
- **Real-time Search Results**: Instant results with similarity scoring and ranking

### 📧 **Email Intelligence Features**
- **"Summarize Unread" Button**: AI-powered summaries of unread emails with key insights
- **"Summarize All" Button**: Bulk email analysis with action items and priority detection
- **Email Read Tracking**: Click-to-read functionality with database status updates
- **Gmail-like Interface**: Inbox/Sent views with search and filtering capabilities

### 🏢 **Company Research Features**
- **"Get Company Info AI" Button**: Real-time company research using Tavily web search
- **"Get Companies" Button**: Generate targeted company lists based on search criteria
- **Web-Powered Research**: Live data from LinkedIn, Crunchbase, Bloomberg, and other sources
- **Confidence Scoring**: Reliability indicators for AI-generated company data
- **Auto-Add to CRM**: Seamlessly integrate researched companies into your database

### 🎤 **Transcription Features**
- **"Upload" Button**: Audio/video file upload with validation (100MB limit)
- **"Get Transcript" Button**: AI-powered speech-to-text conversion
- **"Summarize" Button**: Extract key points, action items, and sentiment analysis
- **File Management**: View, copy, delete uploaded files with status tracking

### 📊 **Contact & Lead Management Features**
- **Mandatory Field Validation**: Company, email, and phone are required for all contacts/leads
- **AI Persona Generation**: Automatic buyer persona creation from interaction data
- **Lead Scoring**: Intelligent qualification and prioritization
- **Contact Relationship Tracking**: Link contacts to companies and deals

### 🔧 **System Features**
- **Row Level Security**: User-scoped data access with comprehensive RLS policies
- **Real-time Updates**: Live data synchronization across all components
- **Sample Data Generation**: Automatic sample data creation for new users
- **Performance Optimization**: Strategic indexing and vector search optimization



## 🚀 Setup Instructions

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase Account** (for database and authentication)
- **OpenAI API Key** (for AI features)
- **Tavily API Key** (optional, for web search)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd deal-whisperer-crm-ai
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API (Required for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# Tavily API (Optional, for web search)
VITE_TAVILY_API_KEY=your_tavily_api_key
```

### 4. Database Setup

#### Option A: Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

2. **Apply Database Schema**
   - Open Supabase Dashboard → SQL Editor
   - Copy content from `migrations/001_complete_crm_schema.sql`
   - Paste and execute the migration
   - Verify tables are created in Table Editor

3. **Enable Required Extensions**
   ```sql
   -- Run in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

#### Option B: Local PostgreSQL

1. **Install PostgreSQL** (v14 or higher)
2. **Install pgvector extension**
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql-14-pgvector
   
   # macOS with Homebrew
   brew install pgvector
   ```

3. **Create Database and Apply Schema**
   ```bash
   createdb deal_whisperer_crm
   psql deal_whisperer_crm -f migrations/001_complete_crm_schema.sql
   ```

### 5. API Keys Setup

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create an account and generate an API key
3. Add to your `.env` file as `VITE_OPENAI_API_KEY`

#### Tavily API Key (Optional)
1. Visit [Tavily](https://tavily.com)
2. Sign up and get your API key
3. Add to your `.env` file as `VITE_TAVILY_API_KEY`

### 6. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

The application will be available at `http://localhost:8080` (or next available port).



## 🔧 Configuration Options

### AI Model Configuration

The system uses the following AI models by default:
- **Embeddings**: `text-embedding-3-small` (1536 dimensions)
- **Chat Completion**: `gpt-4` for analysis and recommendations
- **Fallback**: Graceful degradation when APIs are unavailable

### Vector Search Configuration

```typescript
// Customize in src/lib/ai/embeddingService.ts
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.0; // Always return top results
```

### Performance Tuning

For large datasets, consider:
- Adjusting vector index parameters in the database
- Implementing result caching for frequent searches
- Batch processing for bulk operations

## 🧪 Testing AI Features

### 1. Semantic Search
- Navigate to any section with the "AI Search" button
- Try queries like "enterprise software deals" or "CTO contacts"
- Results are ranked by semantic similarity

### 2. Deal Similarity
- Create or view a deal
- Click "Similar" button to see AI-powered recommendations
- Review confidence scores and suggested actions

### 3. Email Summarization
- Go to Emails section
- Use "Summarize Unread" or "Summarize All" buttons
- Review AI-generated insights and action items

### 4. Company Research
- Navigate to Companies section
- Use "Get Company Info AI" for detailed research
- Try "Get Companies" to generate prospect lists




## 📊 Monitoring & Analytics

### Database Performance
```sql
-- Monitor vector search performance
SELECT query_text, search_type, results_count, created_at 
FROM semantic_searches 
ORDER BY created_at DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%vector%';
```

### AI Usage Tracking
- Search queries are logged in `semantic_searches` table
- Email summaries are stored in `email_summaries` table
- Company research results are tracked with confidence scores

