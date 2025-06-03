#!/bin/bash

# Script to apply the updated search functions that include embedding_content
# This allows semantic search to return the full content used for embeddings

echo "Applying search function updates to include embedding_content..."

# Path to the SQL file relative to this script
SQL_FILE="../functions/fix_search_with_content.sql"

# Apply the SQL file
supabase db reset --db-url $SUPABASE_DB_URL -f $SQL_FILE

echo "✅ Successfully updated search functions to include embedding_content"
echo "The CRM system will now include the full text content in semantic search results for the LLM" 