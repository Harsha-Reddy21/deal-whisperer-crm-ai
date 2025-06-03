-- Fix for search_similar_leads function to correct potential type mismatch
-- Using the same pattern as the contacts fix to ensure consistency

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_leads;

-- Recreate the function with proper type casting and parameter ordering
CREATE OR REPLACE FUNCTION search_similar_leads(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  company text,
  email text,
  phone text,
  source text,
  status text,
  score float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.company,
    l.email,
    l.phone,
    l.source,
    l.status,
    CAST(l.score AS float), -- Explicitly cast to float to prevent type mismatch
    1 - (l.embedding <=> query_embedding) as similarity
  FROM
    leads l
  WHERE
    l.user_id = target_user_id
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add a comment to document the fix
COMMENT ON FUNCTION search_similar_leads IS 'Performs vector similarity search on leads. Fixed type mismatch with score field by casting to float and reordered parameters to comply with PostgreSQL requirements.';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_leads function to correct type mismatch for score field and parameter ordering.';
END $$; 