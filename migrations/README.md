# Deal Whisperer CRM - Database Schema

This directory contains the complete database schema for the Deal Whisperer CRM system.

## Migration File

- **`001_complete_crm_schema.sql`** - Complete database schema with all tables, indexes, functions, and policies

## Database Schema Overview

### Core CRM Tables

1. **`companies`** - Company profiles and information
   - Basic info: name, industry, size, website, location
   - AI features: description_vector, notes_vector for semantic search
   - Metadata: founded_year, revenue_range, employee_count

2. **`contacts`** - Contact management with AI personas
   - Required fields: name, email, phone, company
   - AI features: persona_vector, notes_vector for semantic search
   - Relationship: linked to companies table

3. **`leads`** - Lead management before conversion
   - Required fields: name, email, phone, company
   - Lead tracking: source, status, score, conversion_date
   - UTM tracking for marketing attribution

4. **`deals`** - Sales pipeline and opportunity management
   - Deal info: title, value, stage, probability, expected_close_date
   - AI features: title_vector, next_step_vector, description_vector
   - Relationships: linked to contacts and companies

5. **`activities`** - Customer interactions and tasks
   - Types: call, email, meeting, task, note, demo, proposal, follow_up
   - AI features: description_vector, notes_vector for semantic search
   - Scheduling: scheduled_at, completed_at, follow_up_date

6. **`email_tracking`** - Email communications and tracking
   - Email data: subject, body, sender, recipients
   - Tracking: opened_at, clicked_at, replied_at, read_at
   - Status tracking: sent, delivered, opened, clicked, replied

### AI and Analytics Tables

7. **`embedding_metadata`** - Vector embeddings for AI search
   - Stores vector embeddings for all CRM data
   - Enables semantic search across all content
   - Tracks embedding model and metadata

8. **`semantic_searches`** - Search queries and results
   - Stores user search queries and results
   - Analytics for search patterns and performance
   - Caching for frequently searched terms

9. **`email_summaries`** - AI-generated email insights
   - Summary types: unread, daily, weekly, custom, single
   - AI analysis: key insights, action items, priority emails
   - Statistics and date range tracking

10. **`transcripts`** - Audio/video transcription and analysis
    - File management: filename, type, size, status
    - AI processing: transcript_text, summary, key_points
    - Analysis: topics, sentiment, confidence_score

## Key Features

### Vector Search (AI-Powered)
- **pgvector extension** for similarity search
- **1536-dimension embeddings** using OpenAI text-embedding-3-small
- **Cosine similarity** for finding related content
- **Automatic indexing** with ivfflat indexes for performance

### Row Level Security (RLS)
- **User-scoped data** - users can only access their own data
- **Comprehensive policies** for all CRUD operations
- **Secure by default** - no data leakage between users

### Performance Optimization
- **Strategic indexes** on frequently queried columns
- **Vector indexes** for AI search performance
- **Composite indexes** for complex queries
- **Automatic timestamp updates** with triggers

### Search Implementation

The CRM uses a **hybrid search approach**:

1. **Vector Similarity Search**
   - Uses OpenAI embeddings to understand semantic meaning
   - Finds conceptually similar content even with different wording
   - Powered by pgvector extension with cosine similarity

2. **Traditional SQL Search**
   - Fast exact matches on indexed columns
   - Filters by user, status, dates, etc.
   - Combined with vector search for comprehensive results

3. **LLM-Enhanced Analysis**
   - Uses GPT-4 for intelligent deal similarity analysis
   - Provides actionable recommendations based on historical data
   - Generates insights and success patterns

## How to Apply the Migration

### For Supabase Projects

1. **Copy the SQL content** from `001_complete_crm_schema.sql`
2. **Open Supabase Dashboard** → SQL Editor
3. **Paste and run** the migration
4. **Verify tables** are created in the Table Editor

### For Local PostgreSQL

```bash
# Connect to your database
psql -h localhost -U your_username -d your_database

# Run the migration
\i migrations/001_complete_crm_schema.sql
```

### For Production Deployment

```bash
# Using psql with connection string
psql "postgresql://username:password@host:port/database" -f migrations/001_complete_crm_schema.sql
```

## Sample Data

The migration includes functions to create sample data:

```sql
-- Create sample data for a user
SELECT create_sample_data_for_user('user-uuid-here');

-- Add sample emails only
SELECT add_sample_emails_for_user('user-uuid-here');
```

## Required Extensions

The migration automatically enables:
- **`uuid-ossp`** - UUID generation
- **`vector`** - Vector similarity search

## Environment Variables

Make sure these are set in your application:

```env
# OpenAI API for embeddings and AI features
VITE_OPENAI_API_KEY=your_openai_api_key

# Tavily API for web search (optional)
VITE_TAVILY_API_KEY=your_tavily_api_key

# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Functions

### Vector Search Functions
- `search_similar_deals()` - Find similar deals
- `search_similar_contacts()` - Find similar contacts  
- `search_similar_activities()` - Find similar activities
- `search_similar_companies()` - Find similar companies

### Utility Functions
- `update_updated_at_column()` - Auto-update timestamps
- `create_sample_data_for_user()` - Create sample data
- `add_sample_emails_for_user()` - Add sample emails

## Monitoring and Maintenance

### Performance Monitoring
```sql
-- Check vector index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%vector%';

-- Monitor search performance
SELECT query_text, search_type, results_count, created_at 
FROM semantic_searches 
ORDER BY created_at DESC 
LIMIT 10;
```

### Maintenance Tasks
```sql
-- Vacuum vector indexes periodically
VACUUM ANALYZE deals;
VACUUM ANALYZE contacts;
VACUUM ANALYZE activities;

-- Clean old search logs (optional)
DELETE FROM semantic_searches WHERE created_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Common Issues

1. **Vector extension not found**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **RLS blocking queries**
   - Ensure `auth.uid()` returns the correct user ID
   - Check if user is properly authenticated

3. **Vector search returning no results**
   - Verify embeddings are generated and stored
   - Check if vector columns have data
   - Ensure similarity threshold is not too high

4. **Performance issues**
   - Run `ANALYZE` on tables after bulk inserts
   - Check if vector indexes are being used
   - Consider adjusting `lists` parameter for ivfflat indexes

## Schema Version

- **Version**: 1.0.0
- **Created**: 2024
- **Compatible with**: PostgreSQL 14+, Supabase
- **Extensions**: uuid-ossp, vector (pgvector) 