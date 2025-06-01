# Vector Embeddings Implementation Guide

## Overview

This CRM system now includes advanced AI-powered vector embeddings for semantic search and intelligent recommendations. The implementation allows you to:

- **Semantic Search**: Find similar deals, contacts, and activities using natural language
- **Deal Recommendations**: Get AI-powered insights based on similar deals
- **Automatic Embedding Generation**: Embeddings are created automatically when deals are added/updated
- **Batch Processing**: Generate embeddings for existing data

## Database Schema

### New Tables

#### `embedding_metadata`
Stores vector embeddings with metadata for all CRM entities:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- table_name: TEXT (deals, contacts, activities, companies)
- record_id: UUID (ID of the record)
- field_name: TEXT (title, description, persona, etc.)
- text_content: TEXT (Original text content)
- embedding_vector: vector(1536) (OpenAI embedding)
- embedding_model: TEXT (Model used for embedding)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `semantic_searches`
Tracks search queries and results for analytics:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- query_text: TEXT (Search query)
- query_vector: vector(1536) (Query embedding)
- search_type: TEXT (deals, contacts, activities, companies, all)
- results_count: INTEGER
- similarity_threshold: DECIMAL(3,2)
- search_results: JSONB (Search results)
- created_at: TIMESTAMP
```

### Enhanced Tables

All main tables now have vector columns:
- **deals**: `title_vector`, `next_step_vector`, `description_vector`
- **contacts**: `persona_vector`, `notes_vector`
- **activities**: `description_vector`, `notes_vector`
- **companies**: `description_vector`, `notes_vector`

## API Services

### Core Embedding Service (`embeddingService.ts`)

#### Key Functions:

1. **`generateEmbedding(request: EmbeddingRequest)`**
   - Generates embeddings using OpenAI API
   - Falls back to mock embeddings for development
   - Returns embedding vector and usage statistics

2. **`storeEmbedding(tableName, recordId, fieldName, textContent, embedding, userId)`**
   - Stores embeddings in both metadata table and main table
   - Handles upserts for existing records

3. **`performSemanticSearch(request: SemanticSearchRequest)`**
   - Performs vector similarity search across CRM data
   - Returns ranked results with similarity scores
   - Supports filtering by entity type and similarity threshold

4. **`batchGenerateEmbeddings(tableName, fieldName, userId)`**
   - Processes existing records to generate embeddings
   - Handles large datasets with pagination
   - Returns processing statistics

### Deal-Specific Service (`dealEmbeddingManager.ts`)

#### Key Functions:

1. **`createDealWithEmbeddings(dealData)`**
   - Creates new deal and generates embeddings automatically
   - Processes title and next_step fields

2. **`updateDealWithEmbeddings(dealId, updates, userId)`**
   - Updates deal and regenerates embeddings for changed fields
   - Only processes fields that have been modified

3. **`deleteDealWithEmbeddings(dealId, userId)`**
   - Deletes deal and all associated embeddings
   - Ensures clean removal from vector search

4. **`searchSimilarDeals(request: DealSearchRequest)`**
   - Finds similar deals using semantic search
   - Returns deals with similarity scores and metadata

5. **`getDealRecommendations(dealId, userId)`**
   - Analyzes similar deals to generate recommendations
   - Provides insights on pricing, stages, and next steps

## UI Components

### SemanticSearchDialog

A comprehensive search interface that allows users to:
- Search across all CRM entities using natural language
- Filter by entity type (deals, contacts, activities, companies)
- Adjust similarity thresholds
- View detailed results with similarity scores
- Select results to navigate to specific records

### Enhanced DealsPipeline

The deals pipeline now includes:
- **AI Search Button**: Opens semantic search dialog
- **Generate AI Button**: Batch processes embeddings for existing deals
- **Similar Button**: Shows similar deals and recommendations for each deal
- **AI Readiness Indicators**: Shows data quality for AI analysis

## Usage Examples

### 1. Creating a Deal with Embeddings

```typescript
import { createDealWithEmbeddings } from '@/lib/ai';

const newDeal = await createDealWithEmbeddings({
  title: "Enterprise Software Implementation",
  company: "TechCorp Inc",
  next_step: "Schedule technical demo with CTO",
  stage: "Discovery",
  value: 150000,
  user_id: user.id
});
```

### 2. Semantic Search

```typescript
import { performSemanticSearch } from '@/lib/ai';

const results = await performSemanticSearch({
  query: "enterprise software deals with CTOs",
  searchType: "deals",
  similarityThreshold: 0.7,
  maxResults: 10,
  userId: user.id
});
```

### 3. Getting Deal Recommendations

```typescript
import { getDealRecommendations } from '@/lib/ai';

const recommendations = await getDealRecommendations(
  dealId,
  user.id,
  5 // max recommendations
);

console.log(recommendations.similarDeals);
console.log(recommendations.recommendations);
```

### 4. Batch Processing Existing Data

```typescript
import { batchProcessDealsForEmbeddings } from '@/lib/ai';

const result = await batchProcessDealsForEmbeddings(user.id);
console.log(`Processed ${result.processed} deals with ${result.errors} errors`);
```

## Database Functions

### Vector Similarity Search Functions

#### `search_similar_deals(query_embedding, similarity_threshold, match_count, target_user_id)`
Returns similar deals based on title embeddings:
```sql
SELECT 
  d.id,
  d.title,
  d.company,
  d.stage,
  d.value,
  1 - (d.title_vector <=> query_embedding) as similarity
FROM deals d
WHERE 
  d.title_vector IS NOT NULL
  AND d.user_id = target_user_id
  AND 1 - (d.title_vector <=> query_embedding) > similarity_threshold
ORDER BY d.title_vector <=> query_embedding
LIMIT match_count;
```

#### `search_similar_contacts(query_embedding, similarity_threshold, match_count, target_user_id)`
Returns similar contacts based on persona embeddings.

## Performance Considerations

### Indexing
- Uses `ivfflat` indexes for vector similarity search
- Optimized for cosine similarity operations
- Indexes are created for all vector columns

### Batch Processing
- Processes records in configurable batch sizes (default: 10)
- Handles large datasets with pagination
- Includes error handling and retry logic

### Caching
- Search queries are stored for analytics
- Results can be cached for frequently used queries
- Embedding metadata tracks when embeddings were last updated

## Configuration

### Environment Variables
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### OpenAI Models
- Default embedding model: `text-embedding-3-small` (1536 dimensions)
- Supports other OpenAI embedding models
- Fallback to mock embeddings for development

## Migration Guide

### For Existing Data

1. **Run the Migration**:
   ```bash
   npx supabase db reset
   ```

2. **Generate Embeddings for Existing Deals**:
   - Use the "Generate AI" button in the deals pipeline
   - Or call `batchProcessDealsForEmbeddings(userId)` programmatically

3. **Test Semantic Search**:
   - Use the "AI Search" button to test vector search
   - Try queries like "enterprise software deals" or "CTO contacts"

### For New Installations

The vector embeddings are automatically set up with the migration. New deals will have embeddings generated automatically when created.

## Troubleshooting

### Common Issues

1. **No Search Results**:
   - Ensure embeddings have been generated for your data
   - Try lowering the similarity threshold
   - Check that OpenAI API key is configured

2. **Slow Performance**:
   - Verify vector indexes are created
   - Consider reducing batch sizes for large datasets
   - Monitor OpenAI API rate limits

3. **TypeScript Errors**:
   - New tables may not be in generated Supabase types
   - Use type assertions `(supabase as any)` for new tables
   - Regenerate types after migration

### Debug Information

The system logs detailed information about:
- Embedding generation progress
- Search query performance
- Batch processing statistics
- API usage and errors

## Future Enhancements

### Planned Features

1. **Multi-field Search**: Search across multiple fields simultaneously
2. **Hybrid Search**: Combine vector search with traditional keyword search
3. **Custom Embeddings**: Support for domain-specific embedding models
4. **Real-time Updates**: Automatic embedding updates on data changes
5. **Analytics Dashboard**: Insights into search patterns and AI usage

### Integration Opportunities

1. **Email Integration**: Embed email content for better search
2. **Document Search**: Vector search across uploaded files
3. **Activity Recommendations**: Suggest next actions based on similar deals
4. **Contact Matching**: Find similar contacts across different companies

## Security and Privacy

### Data Protection
- All embeddings are user-scoped with RLS policies
- Original text content is stored securely
- Vector data cannot be reverse-engineered to original text

### API Security
- OpenAI API calls are made server-side only
- API keys are not exposed to client
- Rate limiting and error handling implemented

This implementation provides a solid foundation for AI-powered CRM functionality while maintaining security, performance, and user experience standards. 