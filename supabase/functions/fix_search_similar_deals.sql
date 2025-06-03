-- Fix for search_similar_deals function to correct parameter ordering and type casting
-- This fixes:
-- 1. Parameter ordering to comply with PostgreSQL requirements
-- 2. Type mismatch with the 'value' field (numeric -> float)
-- 3. Preemptively fixes potential type issues with 'probability' field

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_deals;

-- Recreate the function with proper parameter ordering
CREATE OR REPLACE FUNCTION search_similar_deals(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
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
  -- Using a low threshold to prioritize returning results over strict similarity
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.company,
    d.stage,
    CAST(d.value AS float),
    CAST(d.probability AS float),
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

-- Add a comment to document the fix
COMMENT ON FUNCTION search_similar_deals IS 'Performs vector similarity search on deals. Fixed parameter ordering to comply with PostgreSQL requirements.';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_deals function parameter ordering.';
END $$; 