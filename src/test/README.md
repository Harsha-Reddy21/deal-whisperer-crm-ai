# Embedding Content Test

This directory contains test scripts to verify the embedding content enhancements for semantic search.

## Setup

Before running the tests, you need to install the necessary dependencies:

```bash
npm install dotenv @supabase/supabase-js openai
```

## Running Tests

### Test Embedding Content

This test verifies that the embedding content is being properly returned in semantic search results.

To run the test:

```bash
# First, set up environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_KEY="your_supabase_service_key"
export OPENAI_API_KEY="your_openai_api_key" 
export TEST_USER_ID="user_id_with_data"

# Run the test
npx ts-node src/test/test_embedding_content.ts
```

## Expected Output

If the test is successful, you should see output similar to:

```
=== TESTING EMBEDDING CONTENT IN SEARCH RESULTS ===

Generating embedding for query: "deals related to artificial intelligence"
Embedding generated (dimensions: 1536)

Searching for similar deals...
Found 3 deals

=== TEST RESULTS ===
Found 3 deals matching query
embedding_content field present: YES ✅

=== SAMPLE EMBEDDING CONTENT ===
Deal: SALES AND ARTIFICIAL INTELLIGENCE (OPENAI)
Value: $100
Stage: Discovery
Company: OpenAI
Contact: John Smith
Probability: 60%
Next Step: Schedule follow-up meeting
Outcome: Pending
Last Activity: 2023-10-15...

=== ALL RESULTS ===
1. SALES AND ARTIFICIAL INTELLIGENCE (OPENAI) | 0.60 | content: ✅
2. Machine Learning Solutions | 0.42 | content: ✅
3. AI Training Program | 0.39 | content: ✅
```

If the test fails with a missing embedding_content field, make sure you have applied the database function updates from:
`supabase/functions/fix_search_with_content.sql` 