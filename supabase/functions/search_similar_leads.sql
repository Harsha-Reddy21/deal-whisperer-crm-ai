-- Creates a function to search for similar leads using vector similarity
CREATE OR REPLACE FUNCTION search_similar_leads(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  target_user_id uuid
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
    l.score,
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