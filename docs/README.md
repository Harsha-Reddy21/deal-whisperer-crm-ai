# Embedding-Based Semantic Search

This implementation adds embedding-based semantic search to the Deal Whisperer CRM, enabling more intelligent, context-aware querying of CRM data.

## How It Works

1. User questions in ChatCRM are converted to vector embeddings
2. Vector similarity search is performed across deals, contacts, and leads
3. Semantically relevant results are included in the AI context
4. The AI provides responses based on the most relevant CRM data

## Documentation

- [Semantic Search Implementation](semantic-search.md) - Detailed documentation
- [Embedding Search Flow](embedding-search-flow.md) - Flow diagram and process explanation

## Code Structure

- `src/lib/ai/semanticSearch.ts` - Main semantic search service
- `src/components/ChatCRM.tsx` - Integration with ChatCRM component
- `supabase/functions/*.sql` - Database functions for vector similarity search
- `supabase/migrations/*.sql` - Migration for setting up pgvector

## Testing the Implementation

### Option 1: Use the ChatCRM Interface

The simplest way to test is to use the ChatCRM component and observe the console logs:

1. Open your browser's developer console (F12)
2. Open the ChatCRM component
3. Enter a query like "Show me enterprise deals in the software industry"
4. Watch the console for detailed logs showing the search flow
5. See how the AI's response incorporates the semantically relevant results

### Option 2: Run the Demo Script

For direct testing outside the UI:

1. Make sure you have Node.js installed
2. Edit `src/test/semantic-search-demo.js` and replace `TEST_USER_ID` with a valid user ID
3. Run the script:

```bash
npm install dotenv openai @supabase/supabase-js
node src/test/semantic-search-demo.js
```

The script will run sample queries and show the complete flow with detailed logs.

## Example Queries to Try

- "What enterprise clients have we worked with recently?"
- "Which leads seem most promising right now?"
- "Show me deals related to cloud migration"
- "Find contacts at financial companies that are ready to buy"
- "What healthcare deals are closing this month?"

## Console Logging

The implementation includes detailed console logging:

- 🚀 Process start/end markers
- 🔍 Search steps and substeps
- ⏱️ Timing information for each step
- 📊 Match statistics and top results
- ✅ Success indicators
- ❌ Error indicators

## Performance Considerations

- Embedding generation (typically 200-500ms)
- Vector search performance (typically 50-200ms per entity type)
- Total search flow (typically 500-1000ms)
- LLM processing time (typically 1-3s)

## Troubleshooting

- If no results are found, try lowering the similarity threshold (default: 0.5)
- Ensure embeddings are being generated for your CRM entities
- Check database migrations to confirm pgvector is properly installed
- Verify that RPC functions are correctly created in your database 