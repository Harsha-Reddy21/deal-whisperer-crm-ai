# Database Function Fixes

This directory contains SQL files to fix issues with the semantic search database functions.

## Issues Fixed

The fixes address several type mismatch issues:

1. **Type mismatch errors**: 
   - The `score` field in the `search_similar_contacts` and `search_similar_leads` functions was returning an integer when a float was expected
   - The `value` field in the `search_similar_deals` function was returning a numeric(12,2) when a float was expected
   - The `probability` field in the `search_similar_deals` function has been cast to float to prevent potential issues

   Error example:
   ```
   {code: '42804', details: 'Returned type integer does not match expected type double precision in column 8.', hint: null, message: 'structure of query does not match function result type'}
   ```

2. **Parameter order issue**: PostgreSQL requires that once a parameter has a default value, all subsequent parameters must also have defaults. Our original functions had default values for `similarity_threshold` and `match_count` but not for `target_user_id` which came after them.

## How to Apply the Fixes

### Step 1: Fix Database Functions

You can apply these fixes using the Supabase SQL Editor or by connecting directly to your database with a PostgreSQL client.

#### Option 1: Using Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left navigation
3. Create a new query
4. Copy and paste the contents of `apply_all_fixes.sql` to apply all fixes at once, or use the individual fix files
5. Run the query

#### Option 2: Using a PostgreSQL Client

If you have direct database access, you can run:

```bash
psql -h your-supabase-db-host -U postgres -d postgres -f apply_all_fixes.sql
```

### Step 2: Update JavaScript Code

After fixing the database functions, you need to update your JavaScript/TypeScript code to match the new parameter order. The order has changed from:

```javascript
// Old order
{
  query_embedding: embedding,
  similarity_threshold: threshold,
  match_count: maxResults,
  target_user_id: userId
}
```

to:

```javascript
// New order
{
  query_embedding: embedding,
  target_user_id: userId,
  similarity_threshold: threshold,
  match_count: maxResults
}
```

Update all RPC calls to the search functions to use this new parameter order.

## Changes Made

1. Reordered function parameters to put required parameters first, followed by those with default values

2. Added explicit type casting to prevent type mismatches:
   ```sql
   -- In contacts and leads functions
   CAST(c.score AS float)
   
   -- In deals function
   CAST(d.value AS float)
   CAST(d.probability AS float)
   ```

3. Updated the function signatures in all fix files and in the migration file for consistency
4. Updated JavaScript/TypeScript code to match the new parameter order

## Verification

After applying the fixes, you can verify them by:

1. Performing a semantic search in the application
2. Running a test query directly in SQL:
   
   ```sql
   SELECT * FROM search_similar_deals(
     '[1.0, 0.0, ...]'::vector(1536), 
     '00000000-0000-0000-0000-000000000000'::uuid,
     0.01,
     5
   );
   ```

## Future Migrations

The main migration file `20231231000000_setup_vector_search.sql` has been updated to use the fixed function definitions, so future deployments will include these fixes automatically.

# Semantic Search Function Enhancements

This directory contains SQL functions for the Deal Whisperer CRM's semantic search functionality.

## Recent Updates

### Embedding Content Enhancement

We've enhanced the semantic search functions to include the full embedding content in search results, which provides more context for the LLM to generate better responses:

1. **What Changed**:
   - Modified `search_similar_deals`, `search_similar_contacts`, and `search_similar_leads` functions
   - Added `embedding_content` column to the result sets
   - Updated TypeScript code to include this content in the LLM context

2. **Benefits**:
   - LLM receives full contextual information about each entity
   - Includes activities, notes, and related entity data
   - Provides more complete information for answering user queries
   - No additional database calls needed - content is returned with search results

## How to Apply

To apply the updated functions:

1. Run the SQL script directly:
   ```bash
   psql $SUPABASE_DB_URL -f fix_search_with_content.sql
   ```

2. Or use the provided script:
   ```bash
   cd scripts
   ./apply_embedding_content_fix.sh
   ```

## Function Details

Each search function now returns the following:

### `search_similar_deals`
Returns deal matches with their full content, including:
- Basic deal information (title, company, stage, value)
- Related activities
- Notes
- Contact information

### `search_similar_contacts`
Returns contact matches with their full content, including:
- Contact details (name, email, phone)
- Company and role information
- Related deals
- Activities history
- Persona information

### `search_similar_leads`
Returns lead matches with their full content, including:
- Lead information (name, company, status)
- Source information
- Activities
- Score and other metadata 