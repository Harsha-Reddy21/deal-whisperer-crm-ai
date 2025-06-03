# Semantic Search Implementation

This document explains the implementation of semantic search capabilities in the Deal Whisperer CRM.

## Overview

The CRM now features embedding-based semantic search that enables more intelligent, context-aware querying of CRM data. Unlike traditional keyword search, semantic search understands the meaning behind queries and can find relevant matches even when exact keywords aren't present.

## How It Works

1. **Vector Embeddings**: All deals, contacts, and leads are automatically converted to vector embeddings (1536-dimensional vectors) using OpenAI's `text-embedding-3-small` model.

2. **Database Storage**: These embeddings are stored in the database alongside the original data.

3. **Query Processing**: When a user asks a question in ChatCRM:
   - The question is converted to a vector embedding
   - This embedding is compared against all stored embeddings using vector similarity
   - The most semantically similar results are returned

4. **Search Integration**: The ChatCRM component includes these relevant search results in the context sent to the LLM, allowing for more precise, data-driven responses.

## Technical Implementation

### Database Schema

The implementation uses pgvector to store and query vector embeddings:

```sql
-- Deal table embedding column
ALTER TABLE deals ADD COLUMN embedding vector(1536);

-- Contact table embedding column 
ALTER TABLE contacts ADD COLUMN embedding vector(1536);

-- Lead table embedding column
ALTER TABLE leads ADD COLUMN embedding vector(1536);

-- Indexes for faster vector search
CREATE INDEX deals_embedding_idx ON deals USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX contacts_embedding_idx ON contacts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX leads_embedding_idx ON leads USING ivfflat (embedding vector_cosine_ops);
```

### Vector Similarity Search Functions

Database functions to perform vector similarity search:

```sql
CREATE OR REPLACE FUNCTION search_similar_deals(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  target_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  stage text,
  value float,
  probability float,
  contact_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.company,
    d.stage,
    d.value,
    d.probability,
    d.contact_name,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM
    deals d
  WHERE
    d.user_id = target_user_id
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

Similar functions exist for `search_similar_contacts` and `search_similar_leads`.

### Embedding Services

The system includes dedicated services for managing embeddings:

- `DealEmbeddingService`: Handles deal embeddings
- `ContactEmbeddingService`: Handles contact embeddings 
- `LeadEmbeddingService`: Handles lead embeddings

Each service is responsible for:
1. Generating embeddings when records are created or updated
2. Composing the text for embedding (including related activities)
3. Storing embeddings in the database

### Semantic Search Service

The `SemanticSearchService` provides the interface for performing searches:

```typescript
// Perform semantic search
const searchResults = await semanticSearchService.semanticSearch({
  query: "Show me deals about software licensing",
  userId: user.id,
  maxResults: 5,
  similarityThreshold: 0.5
});
```

### ChatCRM Integration

The ChatCRM component leverages semantic search by:

1. Taking the user's message and running it through the semantic search service
2. Formatting the results to include in the context sent to the LLM
3. Including relevant CRM data based on the query's semantic meaning

## Examples

### Example 1: Semantic Search Query

**User Question**: "What enterprise clients have we worked with recently?"

Even if no CRM records contain the exact words "enterprise clients", the semantic search will understand the intent and find:

- Deals with large companies
- Contacts at enterprise-level organizations
- Leads from Fortune 500 companies

**Flow**:
1. Query → Embedding conversion
2. Vector similarity search across deals, contacts, leads
3. Results sorted by relevance
4. Top matches included in AI context

### Example 2: Specific Domain Knowledge

**User Question**: "Show me deals related to cloud migration"

The system will match semantically similar concepts such as:
- AWS deployment deals
- Azure migration projects
- Data center transition discussions
- Infrastructure modernization opportunities

This works even if the exact phrase "cloud migration" doesn't appear in the records.

### Example 3: Intent Understanding

**User Question**: "Which leads seem most promising right now?"

The semantic search understands this is about lead quality and will match:
- Leads with high scores
- Recently active leads
- Leads with positive engagement metrics
- Leads matching successful past conversion patterns

## Benefits

- **Better Understanding**: The AI can better understand what the user is looking for
- **More Relevant Results**: Returns semantically similar items, not just keyword matches
- **Improved Context**: The AI has access to the most relevant CRM data for each query
- **Comprehensive Search**: Search spans across deals, contacts, and leads

## Maintenance

Embeddings are automatically kept up-to-date:

- When a deal, contact, or lead is created, an embedding is generated
- When a deal, contact, or lead is updated, its embedding is regenerated
- When an activity related to a deal, contact, or lead changes, the parent item's embedding is updated

## Performance Considerations

- **Embedding Generation**: Happens asynchronously after entity creation/update
- **Search Performance**: Vector similarity search is optimized with pgvector indexes
- **Cache Strategy**: Consider caching common search results
- **Batch Processing**: Embedding updates are processed in batches for efficiency

## Future Enhancements

Potential improvements to consider:

1. Extending semantic search to other entities (emails, files, etc.)
2. Adding semantic search filters (e.g., "show only won deals about cloud services") 
3. Implementing hybrid search with both keyword and semantic capabilities
4. Adding a dedicated search UI that leverages the semantic search capabilities 