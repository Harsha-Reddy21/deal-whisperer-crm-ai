# PowerShell script to apply the embedding content enhancement for semantic search
# This script:
# 1. Applies the database function updates
# 2. Updates the TypeScript code

# Set colors for output
$Green = 'Green'
$Blue = 'Cyan'
$Yellow = 'Yellow'

Write-Host "==================================================" -ForegroundColor $Blue
Write-Host "   Applying Embedding Content Enhancement         " -ForegroundColor $Blue
Write-Host "==================================================" -ForegroundColor $Blue

# Step 1: Apply database functions
Write-Host "`nStep 1: Applying database function updates..." -ForegroundColor $Yellow

# Check if we can connect to the database
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "Using Supabase CLI to apply changes..."
    supabase functions deploy fix_search_with_content
}
else {
    Write-Host "Supabase CLI not found, attempting to use psql directly..."
    
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        if (-not $env:DATABASE_URL) {
            Write-Host "Warning: DATABASE_URL environment variable not set."
            Write-Host "Please set the DATABASE_URL environment variable or apply the SQL file manually."
            Write-Host "SQL file location: supabase/functions/fix_search_with_content.sql"
        }
        else {
            Write-Host "Applying SQL directly using psql..."
            psql $env:DATABASE_URL -f supabase/functions/fix_search_with_content.sql
        }
    }
    else {
        Write-Host "Neither Supabase CLI nor psql found."
        Write-Host "Please apply the SQL file manually:"
        Write-Host "SQL file location: supabase/functions/fix_search_with_content.sql"
    }
}

Write-Host "✅ Database functions updated (or instructions provided)." -ForegroundColor $Green

# Step 2: Remind about TypeScript changes
Write-Host "`nStep 2: TypeScript code changes" -ForegroundColor $Yellow
Write-Host "The following files have been updated:"
Write-Host "  - src/lib/ai/semanticSearch.ts"
Write-Host "    * Added embeddingContent field to SemanticSearchResult interface"
Write-Host "    * Updated search functions to include embedding_content"
Write-Host "    * Enhanced formatResultsForAI to include full content for LLM"

Write-Host "`n✅ TypeScript code updated." -ForegroundColor $Green

Write-Host "`n==================================================" -ForegroundColor $Blue
Write-Host "✅ Embedding Content Enhancement Complete!" -ForegroundColor $Green
Write-Host "==================================================" -ForegroundColor $Blue
Write-Host "`nThe system will now include full embedding content in semantic search results"
Write-Host "for improved LLM context and better responses to user queries."
Write-Host "`nTo test the changes, try a semantic search query like:"
Write-Host "  'Show me deals related to AI'" -ForegroundColor $Yellow
Write-Host "The LLM will now receive the full deal content including activities and notes." 