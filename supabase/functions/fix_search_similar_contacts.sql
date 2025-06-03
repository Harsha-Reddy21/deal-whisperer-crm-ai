-- Fix for search_similar_contacts function to correct type mismatch
-- Error: "Returned type integer does not match expected type double precision in column 8."

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_contacts;

-- Recreate the function with proper type casting and parameter ordering
-- Note: Either all parameters after the first one with a default value must also have defaults,
-- or parameters with defaults must come at the end
CREATE OR REPLACE FUNCTION search_similar_contacts(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  title text,
  company text,
  email text,
  phone text,
  status text,
  score float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.title,
    c.company,
    c.email,
    c.phone,
    c.status,
    CAST(c.score AS float), -- Explicitly cast to float to prevent type mismatch
    1 - (c.embedding <=> query_embedding) as similarity
  FROM
    contacts c
  WHERE
    c.user_id = target_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add a comment to document the fix
COMMENT ON FUNCTION search_similar_contacts IS 'Performs vector similarity search on contacts. Fixed type mismatch with score field by casting to float and reordered parameters to comply with PostgreSQL requirements.';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_contacts function to correct type mismatch for score field and parameter ordering.';
END $$; 